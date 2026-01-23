/**
 * Partner Dashboard Page
 * Business insights and performance metrics
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
    orders: number;
    profit: number;
    payoutDue: number;
    platformFee: number;
    unitsSold: number;
    productCount: number;
    averageOrderValue: number;
    revenueGrowth: number;
  };
  topProducts: Array<any>;
  lowStockProducts: Array<any>;
  recentOrders: Array<any>;
  ordersByStatus: Array<{ status: string; count: number }>;
  recentPayouts: Array<any>;
}

export default function PartnerDashboardPage() {
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
      const response = await fetch(`/api/partner/analytics?period=${period}`);
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
            <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
            <p className="text-gray-600 mt-1">Your business performance at a glance</p>
          </div>
          <PeriodSelector value={period} onChange={setPeriod} />
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue (GMV)"
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
            title="Your Profit"
            value={analytics.overview.profit}
            prefix="৳"
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          
          <StatCard
            title="Payout Due"
            value={analytics.overview.payoutDue}
            prefix="৳"
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Total Orders"
            value={analytics.overview.orders}
            color="yellow"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
        </div>
        
        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Units Sold"
            value={analytics.overview.unitsSold}
            color="blue"
          />
          
          <StatCard
            title="Average Order Value"
            value={analytics.overview.averageOrderValue}
            prefix="৳"
            color="green"
          />
          
          <StatCard
            title="Active Products"
            value={analytics.overview.productCount}
            color="purple"
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
        
        {/* Best Products & Low Stock Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Products */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Best Selling Products</h2>
            <div className="space-y-3">
              {analytics.topProducts.length > 0 ? (
                analytics.topProducts.slice(0, 5).map((product, index) => (
                  <ProductListItem
                    key={product.productId}
                    product={product}
                    showRevenue
                    showRating
                    rank={index + 1}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No sales data yet</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Low Stock Alert */}
          <div className="bg-white rounded-lg border border-yellow-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 className="text-lg font-semibold text-gray-900">Low Stock Alert</h2>
            </div>
            <div className="space-y-3">
              {analytics.lowStockProducts.length > 0 ? (
                analytics.lowStockProducts.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    showStock
                    showRevenue={false}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>All products well stocked!</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Recent Payouts */}
        {analytics.recentPayouts.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Payouts</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.recentPayouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {format(new Date(payout.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        ৳{payout.distributionAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          payout.status === 'PAID' ? 'bg-green-100 text-green-800' :
                          payout.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payout.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {payout.paidAt ? format(new Date(payout.paidAt), 'MMM dd, yyyy') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Recent Orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h2>
          <div className="space-y-4">
            {analytics.recentOrders.length > 0 ? (
              analytics.recentOrders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-blue-600">#{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(order.date), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 text-sm">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.product} className="w-12 h-12 object-contain rounded bg-gray-50 p-1" />
                        )}
                        <div className="flex-1">
                          <p className="text-gray-900">{item.product}</p>
                          <p className="text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">৳{item.revenue.toLocaleString()}</p>
                          <p className="text-sm text-green-600">Your: ৳{item.payout.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">Total</span>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">৳{order.totalRevenue.toLocaleString()}</p>
                      <p className="text-sm text-green-600">Your payout: ৳{order.totalPayout.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No orders yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
