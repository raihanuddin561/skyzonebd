'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Matches the real shape returned by calculateComprehensiveProfit /
// calculateYTDProfit / getProfitTrend (src/utils/comprehensiveProfitCalculation.ts)
// — the previous interface here (totalCosts/profitMargin/revenueBreakdown/
// costsByCategory) didn't exist on the API response at all, so every field
// read from it was undefined; `profitMargin.toFixed(2)` on the monthly
// summary card crashed the whole page the moment a report loaded.
interface ProfitLossReport {
  period: { month: number; year: number };
  totalRevenue: number;
  returnRevenue: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  totalOperatingExpenses: number;
  operatingProfit: number;
  operatingMargin: number;
  netProfit: number;
  netMargin: number;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

interface TrendData {
  period: { month: number; year: number };
  totalRevenue: number;
  cogs: number;
  totalOperatingExpenses: number;
  netProfit: number;
  netMargin: number;
}

export default function ProfitLossPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [reportType, setReportType] = useState<'monthly' | 'trend' | 'ytd'>('monthly');

  const [monthlyReport, setMonthlyReport] = useState<ProfitLossReport | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [ytdReport, setYtdReport] = useState<any>(null);

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear, reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      setAccessDenied(false);

      const params = new URLSearchParams({
        year: selectedYear.toString(),
        type: reportType
      });

      if (reportType === 'monthly') {
        params.append('month', selectedMonth.toString());
      } else if (reportType === 'trend') {
        params.append('startMonth', '1');
        params.append('endMonth', '12');
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/profit-loss?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.status === 403) {
        setAccessDenied(true);
        setError('You do not have permission to view profit & loss reports. Please contact an administrator.');
        return;
      }

      if (!response.ok) {
        setError(data.error || 'Failed to fetch report');
        return;
      }

      if (data.success) {
        if (reportType === 'monthly') {
          setMonthlyReport(data.data);
        } else if (reportType === 'trend') {
          setTrendData(data.data);
        } else if (reportType === 'ytd') {
          setYtdReport(data.data);
        }
      } else {
        setError(data.error || 'Failed to fetch report');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Access Denied</h2>
            <p className="text-red-800 mb-4">{error}</p>
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Report</h1>
          <p className="text-gray-600 mt-2">Comprehensive financial analysis and trends</p>
        </div>

        {/* Error Message */}
        {error && !accessDenied && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}

        {/* Report Type Selector */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => setReportType('monthly')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    reportType === 'monthly'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setReportType('trend')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    reportType === 'trend'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Trend
                </button>
                <button
                  onClick={() => setReportType('ytd')}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    reportType === 'ytd'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Year-to-Date
                </button>
              </div>
            </div>

            {reportType === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {months.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button
              onClick={fetchReport}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Monthly Report */}
        {reportType === 'monthly' && monthlyReport && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(monthlyReport.totalRevenue)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">Total Costs</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {formatCurrency(monthlyReport.cogs + monthlyReport.totalOperatingExpenses)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  COGS {formatCurrency(monthlyReport.cogs)} + Operating {formatCurrency(monthlyReport.totalOperatingExpenses)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(monthlyReport.netProfit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Margin: {monthlyReport.netMargin.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Gross Sales</span>
                  <span className="font-semibold">{formatCurrency(monthlyReport.totalRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Returns</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(monthlyReport.returnRevenue)}</span>
                </div>
                <div className="flex justify-between items-center py-2 pt-3 font-bold">
                  <span className="text-gray-900">Net Revenue</span>
                  <span className="text-green-600">{formatCurrency(monthlyReport.netRevenue)}</span>
                </div>
              </div>
            </div>

            {/* Costs by Category */}
            {monthlyReport.topExpenseCategories && monthlyReport.topExpenseCategories.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Expense Categories</h2>
                <div className="mt-4 space-y-2">
                  {monthlyReport.topExpenseCategories.map((category) => (
                    <div key={category.category} className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-900 font-medium capitalize">{category.category}</span>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(category.amount)}</span>
                        <span className="text-gray-500 text-sm ml-2">({category.percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trend View */}
        {reportType === 'trend' && trendData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Annual Profit Trend</h2>

            {/* Summary Table */}
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costs</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Margin</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {trendData.map((item, index) => {
                    const costs = item.cogs + item.totalOperatingExpenses;
                    return (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {months[item.period.month - 1]} {item.period.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(item.totalRevenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(costs)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-semibold">{formatCurrency(item.netProfit)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                          {item.netMargin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* YTD Report */}
        {reportType === 'ytd' && ytdReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">YTD Revenue</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {formatCurrency(ytdReport.totalRevenue || 0)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">YTD Costs</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {formatCurrency((ytdReport.cogs || 0) + (ytdReport.totalOperatingExpenses || 0))}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">YTD Net Profit</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(ytdReport.netProfit || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Margin: {(ytdReport.netMargin || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Generating report...</p>
          </div>
        )}
      </div>
    </div>
  );
}
