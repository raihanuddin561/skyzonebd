'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/utils/apiClient';
import { exportToCsv } from '@/utils/csvExport';

interface Summary {
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  totalUnits: number;
  averageOrderValue: number;
  profitMargin: number;
}

interface Trends {
  isGrowing: boolean;
  averageGrowthRate: number;
  peakRevenue: number;
  lowestRevenue: number;
  mostProductiveDay: { formattedDate: string; revenue: number };
}

interface PaymentMethodBreakdown {
  method: string;
  count: number;
  revenue: number;
  percentage: number;
}

interface TimeSeriesPoint {
  formattedDate: string;
  revenue: number;
  profit: number;
  growth: number;
}

export default function RevenueAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trends, setTrends] = useState<Trends | null>(null);
  const [byPaymentMethod, setByPaymentMethod] = useState<PaymentMethodBreakdown[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/financial/revenue-analytics?period=${period}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setSummary(data.data.summary);
        setTrends(data.data.trends);
        setByPaymentMethod(data.data.breakdown.byPaymentMethod);
        setTimeSeries(data.data.timeSeries);
      } else {
        toast.error(data.error || 'Failed to load revenue analytics');
      }
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportToCsv('revenue-analytics', timeSeries.map((t) => ({ date: t.formattedDate, revenue: t.revenue, profit: t.profit, growth: t.growth.toFixed(1) })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Revenue trends, growth, and payment-method breakdown</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap">
          {['today', 'week', 'month', 'quarter', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium capitalize transition-colors ${
                period === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">৳{summary.totalRevenue.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Profit</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">৳{summary.totalProfit.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Avg Order Value</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">৳{summary.averageOrderValue.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Profit Margin</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{summary.profitMargin.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {trends && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Trend</h2>
          <p className="text-sm text-gray-600">
            Revenue is <span className={trends.isGrowing ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>{trends.isGrowing ? 'growing' : 'declining'}</span>
            {' '}({trends.averageGrowthRate.toFixed(1)}% over the period). Most productive: {trends.mostProductiveDay?.formattedDate} (৳{trends.mostProductiveDay?.revenue.toLocaleString()}).
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200"><h2 className="font-semibold text-gray-900">By Payment Method</h2></div>
          <div className="divide-y divide-gray-100">
            {byPaymentMethod.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No data for this period.</div>
            ) : (
              byPaymentMethod.map((m) => (
                <div key={m.method} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">{m.method} <span className="text-gray-500">({m.count})</span></span>
                  <span className="text-sm text-gray-600">৳{m.revenue.toLocaleString()} ({m.percentage.toFixed(1)}%)</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200"><h2 className="font-semibold text-gray-900">Revenue Trend</h2></div>
          <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
            {timeSeries.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No data for this period.</div>
            ) : (
              timeSeries.map((t, idx) => (
                <div key={idx} className="px-4 py-2 flex justify-between items-center text-sm">
                  <span className="text-gray-600">{t.formattedDate}</span>
                  <span className="text-gray-900">৳{t.revenue.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
