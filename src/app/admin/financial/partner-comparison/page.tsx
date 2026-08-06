'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/utils/apiClient';
import { exportToCsv } from '@/utils/csvExport';

interface PartnerRow {
  partnerId: string;
  partnerName: string;
  email: string;
  profitSharePercentage: number;
  isActive: boolean;
  revenue: { current: number; previous: number; growth: number };
  profit: { current: number; previous: number; growth: number };
  partnerShare: { entitled: number; distributed: number; paid: number; pending: number; outstanding: number };
  orders: { count: number; averageValue: number };
  units: number;
  profitMargin: number;
}

interface Summary {
  totalRevenue: number;
  totalProfit: number;
  totalDistributions: number;
  platformRetained: number;
}

export default function PartnerComparisonPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [sortBy, setSortBy] = useState('profit');
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetchData();
  }, [period, sortBy]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/financial/partner-comparison?period=${period}&sortBy=${sortBy}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setPartners(data.data.partners);
        setSummary(data.data.summary);
      } else {
        toast.error(data.error || 'Failed to load partner comparison');
      }
    } catch (error) {
      console.error('Error fetching partner comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    exportToCsv('partner-comparison', partners.map((p) => ({
      partner: p.partnerName, revenue: p.revenue.current, profit: p.profit.current,
      share: p.partnerShare.entitled, paid: p.partnerShare.paid, outstanding: p.partnerShare.outstanding,
      orders: p.orders.count, profitMargin: p.profitMargin.toFixed(1),
    })));
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Partner Comparison</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Revenue, profit, and distribution performance by partner</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
          Export CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 flex flex-wrap gap-3">
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
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
          <option value="profit">Sort by Profit</option>
          <option value="revenue">Sort by Revenue</option>
          <option value="distributions">Sort by Distributions</option>
          <option value="orders">Sort by Orders</option>
        </select>
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
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Distributions</div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">৳{summary.totalDistributions.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Platform Retained</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">৳{summary.platformRetained.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Share Entitled</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {partners.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">No partner data for this period.</td>
                </tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.partnerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{p.partnerName} <span className="text-gray-500">({p.profitSharePercentage}%)</span></td>
                    <td className="px-4 py-3 text-sm text-gray-900">৳{p.revenue.current.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">৳{p.profit.current.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">৳{p.partnerShare.entitled.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-green-600">৳{p.partnerShare.paid.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-yellow-600">৳{p.partnerShare.outstanding.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.orders.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
