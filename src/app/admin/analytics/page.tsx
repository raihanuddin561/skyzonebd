'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface AnalyticsData {
  revenue: {
    today: number;
    week: number;
    month: number;
    year: number;
    growth: number;
  };
  orders: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  customers: {
    total: number;
    new: number;
    active: number;
    b2b: number;
  };
  products: {
    totalViews: number;
    topSelling: Array<{ name: string; sold: number; revenue: number }>;
    lowStock: number;
  };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // The API takes a plain day count via `period`, not a labeled range.
      const periodDaysMap = {
        today: 1,
        week: 7,
        month: 30,
        year: 365,
      };
      const periodDays = periodDaysMap[timeRange];

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/analytics?period=${periodDays}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load analytics');
      }

      // Transform API data (src/app/api/admin/analytics/route.ts's actual
      // response shape: overview.{gmv,profit,orders,revenueGrowth},
      // ordersByStatus[], topSellingProducts[]) to the frontend interface.
      // There is no customer-count breakdown in this endpoint's response —
      // shown as 0 rather than inventing a number for it.
      setAnalytics({
        revenue: {
          today: result.overview?.gmv || 0,
          week: result.overview?.gmv || 0,
          month: result.overview?.gmv || 0,
          year: result.overview?.gmv || 0,
          growth: result.overview?.revenueGrowth || 0,
        },
        orders: {
          total: result.overview?.orders || 0,
          pending: result.ordersByStatus?.find((o: any) => o.status === 'PENDING')?.count || 0,
          completed: result.ordersByStatus?.find((o: any) => o.status === 'DELIVERED')?.count || 0,
          cancelled: result.ordersByStatus?.find((o: any) => o.status === 'CANCELLED')?.count || 0,
        },
        customers: {
          total: 0,
          new: 0,
          active: 0,
          b2b: 0,
        },
        products: {
          totalViews: 0,
          topSelling: (result.topSellingProducts || []).map((p: any) => ({
            name: p.name,
            sold: p.unitsSold,
            revenue: p.revenue,
          })),
          lowStock: 0,
        },
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-semibold">Error loading analytics</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track performance and insights</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
          {(['today', 'week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl sm:text-3xl">💰</span>
            <span className="text-xs sm:text-sm bg-white/20 px-2 py-1 rounded-full">
              {(analytics?.revenue.growth ?? 0) >= 0 ? '+' : ''}{(analytics?.revenue.growth ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold mb-1">
            ৳{(analytics?.revenue.month || 0).toLocaleString()}
          </div>
          <div className="text-xs sm:text-sm text-blue-100">Total Revenue</div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl sm:text-3xl">🛒</span>
            <span className="text-xs sm:text-sm bg-white/20 px-2 py-1 rounded-full">
              {analytics?.orders.completed || 0}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold mb-1">
            {analytics?.orders.total || 0}
          </div>
          <div className="text-xs sm:text-sm text-green-100">Total Orders</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl sm:text-3xl">👥</span>
            <span className="text-xs sm:text-sm bg-white/20 px-2 py-1 rounded-full">
              +{analytics?.customers.new || 0}
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold mb-1">
            {analytics?.customers.total || 0}
          </div>
          <div className="text-xs sm:text-sm text-purple-100">Total Customers</div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 sm:p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl sm:text-3xl">👁️</span>
            <span className="text-xs sm:text-sm bg-white/20 px-2 py-1 rounded-full">
              Live
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-bold mb-1">
            {analytics?.products.totalViews || 0}
          </div>
          <div className="text-xs sm:text-sm text-orange-100">Product Views</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Sales Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Sales Overview</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm">Chart visualization available with chart library</p>
            </div>
          </div>
        </div>

        {/* Orders Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Order Status</h3>
          <div className="space-y-3">
            {[
              { status: 'Completed', count: analytics?.orders.completed || 0, color: 'bg-green-500', percentage: 60 },
              { status: 'Pending', count: analytics?.orders.pending || 0, color: 'bg-yellow-500', percentage: 25 },
              { status: 'Cancelled', count: analytics?.orders.cancelled || 0, color: 'bg-red-500', percentage: 15 },
            ].map((item, index) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{item.status}</span>
                  <span className="text-gray-600">{item.count} orders</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Top Selling Products</h3>
          <Link href="/admin/products" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units Sold</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!analytics?.products.topSelling.length ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                    No sales in this period yet
                  </td>
                </tr>
              ) : (
                analytics.products.topSelling.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{product.sold} units</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">৳{product.revenue.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">New Customers</div>
              <div className="text-xl font-bold text-gray-900">{analytics?.customers.new || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">✓</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">Active Customers</div>
              <div className="text-xl font-bold text-gray-900">{analytics?.customers.active || 0}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-xl">🏢</span>
            </div>
            <div>
              <div className="text-xs text-gray-600">B2B Customers</div>
              <div className="text-xl font-bold text-gray-900">{analytics?.customers.b2b || 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
