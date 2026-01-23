/**
 * Financial Calculator Utilities
 * Provides helper functions for financial calculations, profit analysis, and reporting
 */

import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export interface ProfitCalculation {
  grossProfit: number;
  netProfit: number;
  profitMargin: number;
  platformProfit: number;
  partnerProfit: number;
}

export interface RevenueBreakdown {
  totalRevenue: number;
  productRevenue: number;
  shippingRevenue: number;
  taxRevenue: number;
}

export interface CostBreakdown {
  productCosts: number;
  shippingCosts: number;
  paymentGatewayFees: number;
  platformOperatingCosts: number;
  totalCosts: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Calculate comprehensive profit metrics
 */
export function calculateProfit(
  revenue: number,
  costs: number,
  expenses: number,
  platformCommissionRate: number
): ProfitCalculation {
  const grossProfit = revenue - costs;
  const netProfit = grossProfit - expenses;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  
  const platformProfit = netProfit * (platformCommissionRate / 100);
  const partnerProfit = netProfit - platformProfit;
  
  return {
    grossProfit: Math.max(0, grossProfit),
    netProfit,
    profitMargin,
    platformProfit,
    partnerProfit
  };
}

/**
 * Calculate profit margin percentage
 */
export function calculateProfitMargin(profit: number, revenue: number): number {
  if (revenue === 0) return 0;
  return (profit / revenue) * 100;
}

/**
 * Calculate average order value
 */
export function calculateAOV(totalRevenue: number, orderCount: number): number {
  if (orderCount === 0) return 0;
  return totalRevenue / orderCount;
}

/**
 * Format currency for display (BDT)
 */
export function formatCurrency(amount: number, locale: string = 'en-BD'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format number with thousand separators
 */
export function formatNumber(num: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Calculate date range based on preset or custom dates
 */
export function calculateDateRange(
  type: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): DateRange {
  const now = new Date();
  
  switch (type) {
    case 'today':
      return {
        startDate: startOfDay(now),
        endDate: endOfDay(now)
      };
    
    case 'week':
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }), // Monday
        endDate: endOfWeek(now, { weekStartsOn: 1 })
      };
    
    case 'month':
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      };
    
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      const quarterStart = new Date(now.getFullYear(), quarter * 3, 1);
      const quarterEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      return {
        startDate: startOfDay(quarterStart),
        endDate: endOfDay(quarterEnd)
      };
    
    case 'year':
      return {
        startDate: startOfYear(now),
        endDate: endOfYear(now)
      };
    
    case 'custom':
      return {
        startDate: customStart ? startOfDay(customStart) : startOfMonth(now),
        endDate: customEnd ? endOfDay(customEnd) : endOfMonth(now)
      };
    
    default:
      return {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now)
      };
  }
}

/**
 * Validate date range (max 1 year)
 */
export function validateDateRange(startDate: Date, endDate: Date): {
  valid: boolean;
  error?: string;
} {
  if (startDate > endDate) {
    return {
      valid: false,
      error: 'Start date must be before end date'
    };
  }
  
  const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysDiff > 365) {
    return {
      valid: false,
      error: 'Date range cannot exceed 1 year'
    };
  }
  
  return { valid: true };
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Calculate growth rate
 */
export function calculateGrowthRate(current: number, previous: number): {
  value: number;
  direction: 'up' | 'down' | 'neutral';
} {
  const change = calculatePercentageChange(current, previous);
  
  return {
    value: Math.abs(change),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
  };
}

/**
 * Round to 2 decimal places
 */
export function roundToTwo(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Safe division (returns 0 if denominator is 0)
 */
export function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate partner share amount
 */
export function calculatePartnerShare(
  totalProfit: number,
  partnerSharePercentage: number
): number {
  return totalProfit * (partnerSharePercentage / 100);
}

/**
 * Calculate platform commission from net profit
 */
export function calculatePlatformCommission(
  netProfit: number,
  commissionRate: number
): number {
  return netProfit * (commissionRate / 100);
}

/**
 * Aggregate order totals
 */
export interface OrderTotals {
  count: number;
  revenue: number;
  costs: number;
  profit: number;
  averageOrderValue: number;
  averageProfit: number;
}

export function aggregateOrderTotals(orders: Array<{
  total: number;
  totalCost?: number | null;
  netProfit?: number | null;
}>): OrderTotals {
  const count = orders.length;
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const costs = orders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
  const profit = orders.reduce((sum, o) => sum + (o.netProfit || 0), 0);
  
  return {
    count,
    revenue,
    costs,
    profit,
    averageOrderValue: safeDivide(revenue, count),
    averageProfit: safeDivide(profit, count)
  };
}

/**
 * Calculate running total
 */
export function calculateRunningTotal(values: number[]): number[] {
  const running: number[] = [];
  let sum = 0;
  
  for (const value of values) {
    sum += value;
    running.push(sum);
  }
  
  return running;
}

/**
 * Group data by time period
 */
export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

export function getTimePeriodKey(date: Date, period: TimePeriod): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  switch (period) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week':
      const weekStart = startOfWeek(date, { weekStartsOn: 1 });
      const weekMonth = String(weekStart.getMonth() + 1).padStart(2, '0');
      const weekDay = String(weekStart.getDate()).padStart(2, '0');
      return `${weekStart.getFullYear()}-${weekMonth}-${weekDay}`;
    case 'month':
      return `${year}-${month}`;
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${year}-Q${quarter}`;
    case 'year':
      return String(year);
    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * Calculate YoY (Year over Year) growth
 */
export function calculateYoYGrowth(
  currentYearValue: number,
  previousYearValue: number
): {
  growth: number;
  percentage: number;
} {
  const growth = currentYearValue - previousYearValue;
  const percentage = calculatePercentageChange(currentYearValue, previousYearValue);
  
  return { growth, percentage };
}

/**
 * Financial health score (0-100)
 */
export function calculateFinancialHealthScore(metrics: {
  profitMargin: number;
  revenueGrowth: number;
  costEfficiency: number;
}): number {
  // Weight: 40% profit margin, 30% revenue growth, 30% cost efficiency
  const profitScore = Math.min(metrics.profitMargin * 2, 40); // Max 40 points
  const growthScore = Math.min(Math.max(metrics.revenueGrowth, 0), 30); // Max 30 points
  const efficiencyScore = Math.min(metrics.costEfficiency, 30); // Max 30 points
  
  return Math.round(profitScore + growthScore + efficiencyScore);
}
