'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/utils/apiClient';
import { exportToCsv } from '@/utils/csvExport';

interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

interface Summary {
  totalCosts: number;
  totalCOGS: number;
  totalOperationalCosts: number;
  cogsToRevenueRatio: number;
  operationalToRevenueRatio: number;
}

interface Insights {
  highestCostCategory: string | null;
  lowestCostCategory: string | null;
  averageDailyCost: number;
  costTrend: string;
}

export default function CostBreakdownPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [cogsByCategory, setCogsByCategory] = useState<CategorySummary[]>([]);
  const [operationalByCategory, setOperationalByCategory] = useState<CategorySummary[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/financial/cost-breakdown?period=${period}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setSummary(data.data.summary);
        setCogsByCategory(data.data.cogs.byCategory);
        setOperationalByCategory(data.data.operational.byCategory);
        setInsights(data.data.insights);
      } else {
        toast.error(data.error || 'Failed to load cost breakdown');
      }
    } catch (error) {
      console.error('Error fetching cost breakdown:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const rows = [
      ...cogsByCategory.map((c) => ({ type: 'COGS', category: c.category, amount: c.amount, percentage: c.percentage.toFixed(1) })),
      ...operationalByCategory.map((c) => ({ type: 'Operational', category: c.category, amount: c.amount, percentage: c.percentage.toFixed(1) })),
    ];
    exportToCsv('cost-breakdown', rows);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Cost Breakdown</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">COGS and operational cost analysis</p>
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
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Costs</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">৳{summary.totalCosts.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">COGS</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">৳{summary.totalCOGS.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Operational</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">৳{summary.totalOperationalCosts.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Cost Trend</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 capitalize">{insights?.costTrend || '—'}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200"><h2 className="font-semibold text-gray-900">COGS by Category</h2></div>
          <div className="divide-y divide-gray-100">
            {cogsByCategory.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No COGS data for this period.</div>
            ) : (
              cogsByCategory.map((c) => (
                <div key={c.category} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">{c.category}</span>
                  <span className="text-sm text-gray-600">৳{c.amount.toLocaleString()} ({c.percentage.toFixed(1)}%)</span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200"><h2 className="font-semibold text-gray-900">Operational Costs by Category</h2></div>
          <div className="divide-y divide-gray-100">
            {operationalByCategory.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">No operational cost data for this period.</div>
            ) : (
              operationalByCategory.map((c) => (
                <div key={c.category} className="px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-gray-900">{c.category}</span>
                  <span className="text-sm text-gray-600">৳{c.amount.toLocaleString()} ({c.percentage.toFixed(1)}%)</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
