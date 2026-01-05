import prisma from '@/lib/prisma';

/**
 * Calculate profit for a given period including all costs
 * @param startDate - Start date of period
 * @param endDate - End date of period
 * @returns Profit calculation with revenue, costs, and net profit
 */
export async function calculateProfitForPeriod(
  startDate: Date,
  endDate: Date
) {
  try {
    // Get total revenue from sales
    const salesData = await prisma.sale.aggregate({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        isDelivered: true,
      },
      _sum: {
        totalAmount: true,
        profitAmount: true,
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    const totalRevenue = salesData._sum.totalAmount || 0;
    const grossProfit = salesData._sum.profitAmount || 0;

    // Get all operational costs for the period
    const costsData = await prisma.operationalCost.aggregate({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalOperationalCosts = costsData._sum.amount || 0;

    // Calculate net profit
    const netProfit = grossProfit - totalOperationalCosts;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get costs by category
    const costsByCategory = await prisma.operationalCost.groupBy({
      by: ['category'],
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return {
      totalRevenue,
      grossProfit,
      totalOperationalCosts,
      netProfit,
      netMargin,
      salesCount: salesData._count.id,
      unitsSold: salesData._sum.quantity || 0,
      costsByCategory: costsByCategory.reduce((acc, item) => {
        acc[item.category] = item._sum.amount || 0;
        return acc;
      }, {} as Record<string, number>),
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

    // Get active partners
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
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
 * Get profit trends for chart/analytics
 */
export async function getProfitTrends(
  startDate: Date,
  endDate: Date,
  groupBy: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'
) {
  try {
    // Get all sales in period
    const sales = await prisma.sale.findMany({
      where: {
        saleDate: {
          gte: startDate,
          lte: endDate,
        },
        isDelivered: true,
      },
      select: {
        saleDate: true,
        totalAmount: true,
        profitAmount: true,
      },
    });

    // Get all costs in period
    const costs = await prisma.operationalCost.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    // Group data by period
    const trends: any[] = [];
    const dateMap = new Map();

    // Process sales
    sales.forEach((sale) => {
      const dateKey = formatDateByGroup(new Date(sale.saleDate), groupBy);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          revenue: 0,
          profit: 0,
          costs: 0,
          netProfit: 0,
        });
      }
      const data = dateMap.get(dateKey);
      data.revenue += sale.totalAmount;
      data.profit += sale.profitAmount || 0;
    });

    // Process costs
    costs.forEach((cost) => {
      const dateKey = formatDateByGroup(new Date(cost.date), groupBy);
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          revenue: 0,
          profit: 0,
          costs: 0,
          netProfit: 0,
        });
      }
      const data = dateMap.get(dateKey);
      data.costs += cost.amount;
    });

    // Calculate net profit
    dateMap.forEach((data) => {
      data.netProfit = data.profit - data.costs;
      trends.push(data);
    });

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
