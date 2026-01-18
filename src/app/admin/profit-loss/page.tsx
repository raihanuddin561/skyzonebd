'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ProfitLossReport {
  month: number;
  year: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  revenueBreakdown?: {
    directSales: number;
    orderSales: number;
    totalSales: number;
    returns: number;
    netRevenue: number;
  };
  costsByCategory?: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
}

interface TrendData {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
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

      const response = await fetch(`/api/admin/profit-loss?${params.toString()}`);
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
                  {formatCurrency(monthlyReport.totalCosts)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(monthlyReport.netProfit)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Margin: {monthlyReport.profitMargin.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Revenue Breakdown */}
            {monthlyReport.revenueBreakdown && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Revenue Breakdown</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Direct Sales</span>
                    <span className="font-semibold">{formatCurrency(monthlyReport.revenueBreakdown.directSales)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Order-Based Sales</span>
                    <span className="font-semibold">{formatCurrency(monthlyReport.revenueBreakdown.orderSales)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Returns</span>
                    <span className="font-semibold text-red-600">-{formatCurrency(monthlyReport.revenueBreakdown.returns)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 pt-3 font-bold">
                    <span className="text-gray-900">Net Revenue</span>
                    <span className="text-green-600">{formatCurrency(monthlyReport.revenueBreakdown.netRevenue)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Costs by Category */}
            {monthlyReport.costsByCategory && monthlyReport.costsByCategory.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Costs by Category</h2>
                <div className="mt-4 space-y-2">
                  {monthlyReport.costsByCategory.map((category) => (
                    <div key={category.category} className="flex justify-between items-center py-2 border-b">
                      <div>
                        <span className="text-gray-900 font-medium">{category.category}</span>
                        <span className="text-gray-500 text-sm ml-2">({category.count} items)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold">{formatCurrency(category.total)}</span>
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
                  {trendData.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(item.revenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(item.costs)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-semibold">{formatCurrency(item.profit)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                        {item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))}
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
                  {formatCurrency(ytdReport.totalCosts || 0)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-600">YTD Net Profit</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {formatCurrency(ytdReport.netProfit || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Margin: {ytdReport.profitMargin?.toFixed(2) || 0}%
                </p>
              </div>
            </div>

            {ytdReport.monthlyBreakdown && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Breakdown</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Costs</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ytdReport.monthlyBreakdown.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.month}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(item.revenue)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(item.costs)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-semibold">{formatCurrency(item.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
