// utils/comprehensiveProfitCalculation.ts
// Comprehensive Profit & Loss Calculation with all costs included

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Calculate comprehensive profit for a specific period
 * Includes revenue, COGS, salaries, operational costs, etc.
 */
export interface ProfitCalculationPeriod {
  month: number; // 1-12
  year: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ComprehensiveProfitData {
  period: ProfitCalculationPeriod;
  
  // Revenue
  totalRevenue: number;
  returnRevenue: number;
  netRevenue: number;
  
  // Cost of Goods Sold
  openingStock: number;
  purchases: number;
  closingStock: number;
  cogs: number;
  
  // Gross Profit
  grossProfit: number;
  grossMargin: number;
  
  // Operating Expenses Breakdown
  expenses: {
    salaries: number;
    rent: number;
    utilities: number;
    marketing: number;
    shipping: number;
    packaging: number;
    officeSupplies: number;
    maintenance: number;
    insurance: number;
    taxes: number;
    legal: number;
    software: number;
    transportation: number;
    communication: number;
    training: number;
    entertainment: number;
    bankCharges: number;
    depreciation: number;
    miscellaneous: number;
    other: number;
  };
  totalOperatingExpenses: number;
  
  // Operating Profit
  operatingProfit: number;
  operatingMargin: number;
  
  // Net Profit
  netProfit: number;
  netMargin: number;
  
  // Additional Metrics
  orderCount: number;
  customerCount: number;
  averageOrderValue: number;
  
  // Breakdown by category
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

/**
 * Calculate comprehensive profit for a specific month/year
 */
export async function calculateComprehensiveProfit(
  period: ProfitCalculationPeriod
): Promise<ComprehensiveProfitData> {
  const { month, year } = period;
  
  // Calculate date range
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  // 1. Calculate Revenue from Orders
  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: {
        notIn: ['CANCELLED']
      }
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  
  // Calculate returns
  const returnedOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate
      },
      status: 'RETURNED'
    }
  });
  
  const returnRevenue = returnedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const netRevenue = totalRevenue - returnRevenue;
  
  // 2. Calculate COGS (Cost of Goods Sold)
  // Opening stock value (stock at beginning of month)
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const openingStockDate = new Date(prevYear, prevMonth, 0);
  
  const openingStockValue = await calculateInventoryValue(openingStockDate);
  const closingStockValue = await calculateInventoryValue(endDate);
  
  // Inventory purchases during the period
  const inventoryPurchases = await prisma.operationalCost.aggregate({
    where: {
      category: 'INVENTORY',
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    _sum: {
      amount: true
    }
  });
  
  const purchases = inventoryPurchases._sum.amount || 0;
  const cogs = openingStockValue + purchases - closingStockValue;
  
  // 3. Gross Profit
  const grossProfit = netRevenue - cogs;
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
  
  // 4. Operating Expenses
  const expenses = await calculateOperatingExpenses(month, year, startDate, endDate);
  const totalOperatingExpenses = Object.values(expenses).reduce((sum, val) => sum + val, 0);
  
  // 5. Operating Profit
  const operatingProfit = grossProfit - totalOperatingExpenses;
  const operatingMargin = netRevenue > 0 ? (operatingProfit / netRevenue) * 100 : 0;
  
  // 6. Net Profit
  const netProfit = operatingProfit;
  const netMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
  
  // 7. Additional Metrics
  const orderCount = orders.length;
  const uniqueCustomers = new Set(orders.map(o => o.userId).filter(Boolean));
  const customerCount = uniqueCustomers.size;
  const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;
  
  // 8. Top Expense Categories
  const expenseEntries = Object.entries(expenses)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalOperatingExpenses > 0 ? (amount / totalOperatingExpenses) * 100 : 0
    }))
    .filter(e => e.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  
  return {
    period: { month, year, startDate, endDate },
    totalRevenue,
    returnRevenue,
    netRevenue,
    openingStock: openingStockValue,
    purchases,
    closingStock: closingStockValue,
    cogs,
    grossProfit,
    grossMargin,
    expenses,
    totalOperatingExpenses,
    operatingProfit,
    operatingMargin,
    netProfit,
    netMargin,
    orderCount,
    customerCount,
    averageOrderValue,
    topExpenseCategories: expenseEntries
  };
}

/**
 * Calculate inventory value at a specific date
 */
async function calculateInventoryValue(date: Date): Promise<number> {
  const products = await prisma.product.findMany({
    where: {
      createdAt: {
        lte: date
      }
    },
    select: {
      stockQuantity: true,
      basePrice: true
    }
  });
  
  return products.reduce((sum, product) => {
    return sum + (product.stockQuantity * product.basePrice);
  }, 0);
}

/**
 * Calculate all operating expenses for a period
 */
async function calculateOperatingExpenses(
  month: number,
  year: number,
  startDate: Date,
  endDate: Date
) {
  // Get all operational costs for the period
  const costs = await prisma.operationalCost.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      },
      paymentStatus: {
        in: ['PAID', 'PARTIAL']
      }
    }
  });
  
  // Get salary expenses
  const salaries = await prisma.salary.findMany({
    where: {
      month,
      year,
      paymentStatus: {
        in: ['PAID', 'PARTIAL']
      }
    }
  });
  
  const salaryExpense = salaries.reduce((sum, s) => sum + s.netSalary, 0);
  
  // Aggregate by category
  const expenses = {
    salaries: salaryExpense,
    rent: 0,
    utilities: 0,
    marketing: 0,
    shipping: 0,
    packaging: 0,
    officeSupplies: 0,
    maintenance: 0,
    insurance: 0,
    taxes: 0,
    legal: 0,
    software: 0,
    transportation: 0,
    communication: 0,
    training: 0,
    entertainment: 0,
    bankCharges: 0,
    depreciation: 0,
    miscellaneous: 0,
    other: 0
  };
  
  costs.forEach(cost => {
    switch (cost.category) {
      case 'RENT':
        expenses.rent += cost.amount;
        break;
      case 'UTILITIES':
        expenses.utilities += cost.amount;
        break;
      case 'MARKETING':
        expenses.marketing += cost.amount;
        break;
      case 'SHIPPING':
        expenses.shipping += cost.amount;
        break;
      case 'PACKAGING':
        expenses.packaging += cost.amount;
        break;
      case 'OFFICE_SUPPLIES':
        expenses.officeSupplies += cost.amount;
        break;
      case 'MAINTENANCE':
        expenses.maintenance += cost.amount;
        break;
      case 'INSURANCE':
        expenses.insurance += cost.amount;
        break;
      case 'TAXES':
        expenses.taxes += cost.amount;
        break;
      case 'LEGAL':
        expenses.legal += cost.amount;
        break;
      case 'SOFTWARE':
        expenses.software += cost.amount;
        break;
      case 'TRANSPORTATION':
        expenses.transportation += cost.amount;
        break;
      case 'COMMUNICATION':
        expenses.communication += cost.amount;
        break;
      case 'TRAINING':
        expenses.training += cost.amount;
        break;
      case 'ENTERTAINMENT':
        expenses.entertainment += cost.amount;
        break;
      case 'BANK_CHARGES':
        expenses.bankCharges += cost.amount;
        break;
      case 'DEPRECIATION':
        expenses.depreciation += cost.amount;
        break;
      case 'MISCELLANEOUS':
        expenses.miscellaneous += cost.amount;
        break;
      default:
        expenses.other += cost.amount;
    }
  });
  
  return expenses;
}

/**
 * Save profit & loss report to database
 */
export async function saveProfitLossReport(
  profitData: ComprehensiveProfitData
): Promise<any> {
  return await prisma.profitLossReport.upsert({
    where: {
      month_year: {
        month: profitData.period.month,
        year: profitData.period.year
      }
    },
    create: {
      month: profitData.period.month,
      year: profitData.period.year,
      startDate: profitData.period.startDate!,
      endDate: profitData.period.endDate!,
      totalRevenue: profitData.totalRevenue,
      returnRevenue: profitData.returnRevenue,
      netRevenue: profitData.netRevenue,
      openingStock: profitData.openingStock,
      purchases: profitData.purchases,
      closingStock: profitData.closingStock,
      cogs: profitData.cogs,
      grossProfit: profitData.grossProfit,
      grossMargin: profitData.grossMargin,
      salaryExpense: profitData.expenses.salaries,
      rentExpense: profitData.expenses.rent,
      utilitiesExpense: profitData.expenses.utilities,
      marketingExpense: profitData.expenses.marketing,
      shippingExpense: profitData.expenses.shipping,
      otherExpenses: profitData.expenses.other,
      totalOperatingExpenses: profitData.totalOperatingExpenses,
      operatingProfit: profitData.operatingProfit,
      operatingMargin: profitData.operatingMargin,
      netProfit: profitData.netProfit,
      netMargin: profitData.netMargin,
      orderCount: profitData.orderCount,
      customerCount: profitData.customerCount,
      averageOrderValue: profitData.averageOrderValue
    },
    update: {
      totalRevenue: profitData.totalRevenue,
      returnRevenue: profitData.returnRevenue,
      netRevenue: profitData.netRevenue,
      openingStock: profitData.openingStock,
      purchases: profitData.purchases,
      closingStock: profitData.closingStock,
      cogs: profitData.cogs,
      grossProfit: profitData.grossProfit,
      grossMargin: profitData.grossMargin,
      salaryExpense: profitData.expenses.salaries,
      rentExpense: profitData.expenses.rent,
      utilitiesExpense: profitData.expenses.utilities,
      marketingExpense: profitData.expenses.marketing,
      shippingExpense: profitData.expenses.shipping,
      otherExpenses: profitData.expenses.other,
      totalOperatingExpenses: profitData.totalOperatingExpenses,
      operatingProfit: profitData.operatingProfit,
      operatingMargin: profitData.operatingMargin,
      netProfit: profitData.netProfit,
      netMargin: profitData.netMargin,
      orderCount: profitData.orderCount,
      customerCount: profitData.customerCount,
      averageOrderValue: profitData.averageOrderValue,
      generatedAt: new Date()
    }
  });
}

/**
 * Get profit comparison for multiple months
 */
export async function getProfitTrend(
  startMonth: number,
  startYear: number,
  endMonth: number,
  endYear: number
): Promise<ComprehensiveProfitData[]> {
  const reports: ComprehensiveProfitData[] = [];
  
  let currentMonth = startMonth;
  let currentYear = startYear;
  
  while (
    currentYear < endYear ||
    (currentYear === endYear && currentMonth <= endMonth)
  ) {
    const report = await calculateComprehensiveProfit({
      month: currentMonth,
      year: currentYear
    });
    reports.push(report);
    
    // Move to next month
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }
  
  return reports;
}

/**
 * Calculate year-to-date profit
 */
export async function calculateYTDProfit(year: number): Promise<ComprehensiveProfitData> {
  const currentMonth = new Date().getMonth() + 1;
  const reports = await getProfitTrend(1, year, currentMonth, year);
  
  // Aggregate all months
  const ytdData: ComprehensiveProfitData = {
    period: { 
      month: 0, 
      year,
      startDate: new Date(year, 0, 1),
      endDate: new Date()
    },
    totalRevenue: 0,
    returnRevenue: 0,
    netRevenue: 0,
    openingStock: reports[0]?.openingStock || 0,
    purchases: 0,
    closingStock: reports[reports.length - 1]?.closingStock || 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    expenses: {
      salaries: 0,
      rent: 0,
      utilities: 0,
      marketing: 0,
      shipping: 0,
      packaging: 0,
      officeSupplies: 0,
      maintenance: 0,
      insurance: 0,
      taxes: 0,
      legal: 0,
      software: 0,
      transportation: 0,
      communication: 0,
      training: 0,
      entertainment: 0,
      bankCharges: 0,
      depreciation: 0,
      miscellaneous: 0,
      other: 0
    },
    totalOperatingExpenses: 0,
    operatingProfit: 0,
    operatingMargin: 0,
    netProfit: 0,
    netMargin: 0,
    orderCount: 0,
    customerCount: 0,
    averageOrderValue: 0,
    topExpenseCategories: []
  };
  
  reports.forEach(report => {
    ytdData.totalRevenue += report.totalRevenue;
    ytdData.returnRevenue += report.returnRevenue;
    ytdData.netRevenue += report.netRevenue;
    ytdData.purchases += report.purchases;
    ytdData.cogs += report.cogs;
    ytdData.grossProfit += report.grossProfit;
    ytdData.totalOperatingExpenses += report.totalOperatingExpenses;
    ytdData.operatingProfit += report.operatingProfit;
    ytdData.netProfit += report.netProfit;
    ytdData.orderCount += report.orderCount;
    ytdData.customerCount += report.customerCount;
    
    // Sum expenses
    Object.keys(ytdData.expenses).forEach(key => {
      ytdData.expenses[key as keyof typeof ytdData.expenses] += 
        report.expenses[key as keyof typeof report.expenses];
    });
  });
  
  // Calculate margins
  ytdData.grossMargin = ytdData.netRevenue > 0 
    ? (ytdData.grossProfit / ytdData.netRevenue) * 100 
    : 0;
  ytdData.operatingMargin = ytdData.netRevenue > 0 
    ? (ytdData.operatingProfit / ytdData.netRevenue) * 100 
    : 0;
  ytdData.netMargin = ytdData.netRevenue > 0 
    ? (ytdData.netProfit / ytdData.netRevenue) * 100 
    : 0;
  ytdData.averageOrderValue = ytdData.orderCount > 0 
    ? ytdData.totalRevenue / ytdData.orderCount 
    : 0;
  
  return ytdData;
}
