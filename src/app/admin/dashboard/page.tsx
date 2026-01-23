/**
 * Admin Dashboard Page
 * Comprehensive analytics and insights
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import StatCard from '@/components/dashboard/StatCard';
import ProgressBar from '@/components/dashboard/ProgressBar';
import ProductListItem from '@/components/dashboard/ProductListItem';
import PeriodSelector from '@/components/dashboard/PeriodSelector';

interface Analytics {
  overview: {
    gmv: number;
    revenue: number;
    profit: number;
    fees: number;
    orders: number;
    returns: number;
    averageOrderValue: number;
    revenueGrowth: number;
  };
  ordersByStatus: Array<{ status: string; count: number }>;
  topSellingProducts: Array<any>;
  topProfitableProducts: Array<any>;
  partnerPerformance: Array<any>;
  recentOrders: Array<any>;
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30');
  
  useEffect(() => {
    fetchAnalytics();
  }, [period]);
  
  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !analytics) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      </div>
    );
  }
  
  if (!analytics) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Platform overview and analytics</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Gross Merchandise Value"
            value={analytics.overview.gmv}
            prefix="৳"
            color="blue"
            trend={{
              value: analytics.overview.revenueGrowth,
              label: 'vs prev period'
            }}
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Total Orders"
            value={analytics.overview.orders}
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
          
          <StatCard
            title="Platform Profit"
            value={analytics.overview.profit}
            prefix="৳"
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          
          <StatCard
            title="Platform Fees"
            value={analytics.overview.fees}
            prefix="৳"
            color="yellow"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
        
        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Average Order Value"
            value={analytics.overview.averageOrderValue}
            prefix="৳"
            color="blue"
          />
          
          <StatCard
            title="Returns/Cancellations"
            value={analytics.overview.returns}
            color="red"
          />
          
          <StatCard
            title="Revenue"
            value={analytics.overview.revenue}
            prefix="৳"
            color="green"
          />
        </div>
        
        {/* Orders by Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-4">
            {analytics.ordersByStatus.map((item) => (
              <ProgressBar
                key={item.status}
                label={item.status}
                value={item.count}
                total={analytics.overview.orders}
                color={
                  item.status === 'DELIVERED' ? 'green' :
                  item.status === 'PENDING' ? 'yellow' :
                  item.status === 'CANCELLED' ? 'red' : 'blue'
                }
              />
            ))}
          </div>
        </div>
        
        {/* Top Selling & Profitable Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h2>
            <div className="space-y-3">
              {analytics.topSellingProducts.slice(0, 5).map((product, index) => (
                <ProductListItem
                  key={product.productId}
                  product={product}
                  showRevenue
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Profitable Products</h2>
            <div className="space-y-3">
              {analytics.topProfitableProducts.slice(0, 5).map((product, index) => (
                <ProductListItem
                  key={product.productId}
                  product={{
                    ...product,
                    revenue: product.profit
                  }}
                  showRevenue
                  rank={index + 1}
                />
              ))}
            </div>
          </div>
        </div>
        
        {/* Partner Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Partner Performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payout
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.partnerPerformance.slice(0, 10).map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{partner.name}</div>
                        <div className="text-sm text-gray-500">{partner.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {partner.productCount}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {partner.orders}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      ৳{partner.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      ৳{partner.payout.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-green-600">
                      ৳{partner.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-blue-600">
                      {order.orderNumber}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {order.customer}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      ৳{order.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {format(new Date(order.date), 'MMM dd, yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
