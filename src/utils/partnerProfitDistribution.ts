import prisma from '@/lib/prisma';
import { getFinancialSummary } from '@/lib/financialLedger';

/**
 * Calculate profit for a given period including all costs.
 *
 * Ledger-derived (Amazon-style gap-closure Phase 2 part 2: "one true
 * ledger") — previously aggregated the `Sale` model, which is only
 * populated by a manual per-order admin action (`POST /api/admin/sales/
 * generate`); if that step was skipped for an order, this calculation
 * (and the partner distributions it feeds via distributeProfitToPartners)
 * silently under-reported. FinancialLedger entries are posted
 * automatically on order delivery, so this fixes that gap as a side
 * effect of the consolidation.
 *
 * @param startDate - Start date of period
 * @param endDate - End date of period
 * @returns Profit calculation with revenue, costs, and net profit
 */
export async function calculateProfitForPeriod(
  startDate: Date,
  endDate: Date
) {
  try {
    const summary = await getFinancialSummary(startDate, endDate);

    const totalRevenue = summary.revenue;
    const grossProfit = summary.grossProfit;
    const totalOperationalCosts = summary.operationalCosts + summary.salaryExpenses;
    const netProfit = summary.netProfitBeforeDistribution;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Distinct orders/manual-sales that posted revenue in this period —
    // ledger-derived, so it's accurate even when the legacy manual
    // Sale-generation step was skipped for some orders.
    const revenueEntries = await prisma.financialLedger.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        direction: 'CREDIT',
        category: 'REVENUE',
        sourceType: { in: ['ORDER', 'MANUAL_SALE'] },
      },
      select: { sourceId: true },
      distinct: ['sourceId'],
    });

    return {
      totalRevenue,
      grossProfit,
      totalOperationalCosts,
      netProfit,
      netMargin,
      salesCount: revenueEntries.length,
      // No longer derivable from the ledger (order-level entries, not
      // per-unit) — previously sourced from Sale.quantity, which required
      // that same manual generation step. 0 is an honest "unavailable",
      // not a regression from an already-unreliable figure.
      unitsSold: 0,
      costsByCategory: summary.operationalCostsByCategory,
    };
  } catch (error) {
    console.error('Error calculating profit:', error);
    throw error;
  }
}

/**
 * Distribute profit to partners for a given period
 * @param periodType - DAILY, WEEKLY, MONTHLY, YEARLY
 * @param startDate - Start date of period
 * @param endDate - End date of period
 * @returns Array of profit distributions created
 */
export async function distributeProfitToPartners(
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
  startDate: Date,
  endDate: Date
) {
  try {
    // Calculate profit for period
    const profitData = await calculateProfitForPeriod(startDate, endDate);

    // Get active partners — excludes anyone who exited on or before this
    // distribution period's start date (Amazon-style gap-closure Phase 3
    // part 4: Partner.exitDate was previously read by zero code anywhere,
    // so an exited partner still received full-share distributions for
    // every period after they left).
    const partners = await prisma.partner.findMany({
      where: {
        isActive: true,
        OR: [{ exitDate: null }, { exitDate: { gt: startDate } }],
      },
    });

    if (partners.length === 0) {
      return {
        success: false,
        message: 'No active partners found',
        distributions: [],
      };
    }

    // Create distribution records for each partner
    const distributions = await Promise.all(
      partners.map(async (partner) => {
        const distributionAmount =
          (profitData.netProfit * partner.profitSharePercentage) / 100;

        return prisma.profitDistribution.create({
          data: {
            partnerId: partner.id,
            periodType,
            startDate,
            endDate,
            totalRevenue: profitData.totalRevenue,
            totalCosts: profitData.totalOperationalCosts,
            netProfit: profitData.netProfit,
            partnerShare: partner.profitSharePercentage,
            distributionAmount,
            status: 'PENDING',
          },
        });
      })
    );

    return {
      success: true,
      message: `Created ${distributions.length} profit distributions`,
      profitData,
      distributions,
    };
  } catch (error) {
    console.error('Error distributing profit:', error);
    throw error;
  }
}

/**
 * Get profit summary for dashboard
 * @param period - Period type: TODAY, THIS_WEEK, THIS_MONTH, THIS_YEAR
 * @returns Profit summary data
 */
export async function getProfitSummary(period: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_YEAR') {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (period) {
    case 'TODAY':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
    case 'THIS_WEEK':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'THIS_MONTH':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    case 'THIS_YEAR':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  return calculateProfitForPeriod(startDate, endDate);
}

/**
 * Generate daily profit report
 */
export async function generateDailyProfitReport(date: Date = new Date()) {
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  return calculateProfitForPeriod(startDate, endDate);
}

/**
 * Generate monthly profit report
 */
export async function generateMonthlyProfitReport(month: number, year: number) {
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  return calculateProfitForPeriod(startDate, endDate);
}

/**
 * Generate yearly profit report
 */
export async function generateYearlyProfitReport(year: number) {
  const startDate = new Date(year, 0, 1, 0, 0, 0);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  return calculateProfitForPeriod(startDate, endDate);
}

/**
 * Get profit trends for chart/analytics.
 *
 * Ledger-derived (Amazon-style gap-closure Phase 2 part 2) — previously
 * read `Sale`/`OperationalCost` directly, the same manual-generation-
 * dependent gap as `calculateProfitForPeriod` above; migrated for the same
 * reason, keeping the same output shape (`date, revenue, profit, costs,
 * netProfit`) so existing callers/charts are unaffected.
 */
export async function getProfitTrends(
  startDate: Date,
  endDate: Date,
  groupBy: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'
) {
  try {
    const entries = await prisma.financialLedger.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true, amount: true, direction: true, sourceType: true, category: true },
    });

    const dateMap = new Map<string, { date: string; revenue: number; profit: number; costs: number; netProfit: number }>();
    const bucketFor = (date: Date) => {
      const key = formatDateByGroup(date, groupBy);
      if (!dateMap.has(key)) {
        dateMap.set(key, { date: key, revenue: 0, profit: 0, costs: 0, netProfit: 0 });
      }
      return dateMap.get(key)!;
    };

    for (const e of entries) {
      const isOrderRevenue = e.direction === 'CREDIT' && e.category === 'REVENUE' && (e.sourceType === 'ORDER' || e.sourceType === 'MANUAL_SALE');
      const isOrderCogs = e.direction === 'DEBIT' && e.category === 'COGS' && (e.sourceType === 'ORDER' || e.sourceType === 'MANUAL_SALE');
      const isOperatingCost = e.direction === 'DEBIT' && (e.sourceType === 'EXPENSE' || e.sourceType === 'SALARY');

      if (isOrderRevenue) {
        const data = bucketFor(e.createdAt);
        data.revenue += e.amount;
        data.profit += e.amount;
      } else if (isOrderCogs) {
        bucketFor(e.createdAt).profit -= e.amount;
      } else if (isOperatingCost) {
        bucketFor(e.createdAt).costs += e.amount;
      }
    }

    const trends = Array.from(dateMap.values()).map((data) => ({ ...data, netProfit: data.profit - data.costs }));
    return trends.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting profit trends:', error);
    throw error;
  }
}

function formatDateByGroup(date: Date, groupBy: 'DAY' | 'WEEK' | 'MONTH'): string {
  switch (groupBy) {
    case 'DAY':
      return date.toISOString().split('T')[0];
    case 'WEEK':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    case 'MONTH':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default:
      return date.toISOString().split('T')[0];
  }
}
