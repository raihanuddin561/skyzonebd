// types/profit.ts - Profit & Cost Management Types

/**
 * Partner Information
 */
export interface Partner {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  profitSharePercentage: number;
  isActive: boolean;
  partnerType?: string | null;
  joinDate: Date;
  exitDate?: Date | null;
  initialInvestment?: number | null;
  totalProfitReceived: number;
  address?: string | null;
  taxId?: string | null;
  bankAccount?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Partner Create/Update Data
 */
export interface PartnerFormData {
  name: string;
  email?: string;
  phone?: string;
  profitSharePercentage: number;
  partnerType?: string;
  initialInvestment?: number;
  address?: string;
  taxId?: string;
  bankAccount?: string;
  notes?: string;
}

/**
 * Profit Distribution Record
 */
export interface ProfitDistribution {
  id: string;
  partnerId: string;
  periodType: string;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  partnerShare: number;
  distributionAmount: number;
  status: string;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  paidAt?: Date | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  partner?: Partner;
}

/**
 * Operational Cost
 */
export interface OperationalCost {
  id: string;
  category: string;
  subCategory?: string | null;
  description: string;
  amount: number;
  date: Date;
  month: number;
  year: number;
  paymentStatus: string;
  paymentDate?: Date | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  vendor?: string | null;
  vendorContact?: string | null;
  isApproved: boolean;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  isRecurring: boolean;
  recurringPeriod?: string | null;
  notes?: string | null;
  attachmentUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cost Form Data
 */
export interface CostFormData {
  category: string;
  subCategory?: string;
  description: string;
  amount: number;
  date: Date;
  paymentStatus: string;
  paymentDate?: Date;
  paymentMethod?: string;
  paymentReference?: string;
  vendor?: string;
  vendorContact?: string;
  isRecurring?: boolean;
  recurringPeriod?: string;
  notes?: string;
}

/**
 * Profit & Loss Report
 */
export interface ProfitLossReport {
  id: string;
  month: number;
  year: number;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  returnRevenue: number;
  netRevenue: number;
  openingStock: number;
  purchases: number;
  closingStock: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  salaryExpense: number;
  rentExpense: number;
  utilitiesExpense: number;
  marketingExpense: number;
  shippingExpense: number;
  otherExpenses: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  operatingMargin: number;
  netProfit: number;
  netMargin: number;
  orderCount: number;
  customerCount: number;
  averageOrderValue: number;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dashboard Summary Statistics
 */
export interface DashboardStats {
  // Revenue
  totalRevenue: number;
  revenueGrowth: number;
  
  // Costs
  totalCosts: number;
  costGrowth: number;
  
  // Profit
  netProfit: number;
  profitGrowth: number;
  profitMargin: number;
  
  // Orders
  totalOrders: number;
  ordersGrowth: number;
  averageOrderValue: number;
  
  // Partners
  activePartners: number;
  totalPartnerShare: number;
  remainingProfit: number;
}

/**
 * Cost Category Summary
 */
export interface CostCategorySummary {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

/**
 * Revenue Breakdown
 */
export interface RevenueBreakdown {
  directSales: number;
  orderSales: number;
  totalSales: number;
  returns: number;
  netRevenue: number;
}

/**
 * Profit Dashboard Data
 */
export interface ProfitDashboardData {
  stats: DashboardStats;
  revenueBreakdown: RevenueBreakdown;
  costsByCategory: CostCategorySummary[];
  monthlyTrends: MonthlyTrend[];
  partners: PartnerSummary[];
  recentTransactions: RecentTransaction[];
}

/**
 * Monthly Trend
 */
export interface MonthlyTrend {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

/**
 * Partner Summary
 */
export interface PartnerSummary {
  id: string;
  name: string;
  sharePercentage: number;
  totalReceived: number;
  isActive: boolean;
}

/**
 * Recent Transaction
 */
export interface RecentTransaction {
  id: string;
  type: 'SALE' | 'COST' | 'DISTRIBUTION';
  description: string;
  amount: number;
  date: Date;
  status: string;
}

/**
 * Profit Calculation Input
 */
export interface ProfitCalculationInput {
  startDate: Date;
  endDate: Date;
  includePartnerDistribution?: boolean;
}

/**
 * Profit Calculation Result
 */
export interface ProfitCalculationResult {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    totalSales: number;
    returns: number;
    netRevenue: number;
  };
  costs: {
    cogs: number;
    operational: number;
    salaries: number;
    totalCosts: number;
  };
  profit: {
    grossProfit: number;
    grossMargin: number;
    operatingProfit: number;
    operatingMargin: number;
    netProfit: number;
    netMargin: number;
  };
  partnerDistributions?: {
    partnerId: string;
    partnerName: string;
    sharePercentage: number;
    distributionAmount: number;
  }[];
  remainingProfit?: number;
}
