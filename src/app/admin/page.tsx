'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  icon: string;
  color: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const result = await response.json();
        
        if (result.success) {
          setStats(result.data.stats);
          setRecentOrders(result.data.recentOrders);
          setPendingVerifications(result.data.pendingVerifications);
        } else {
          throw new Error(result.error || 'Failed to load data');
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Link
            href="/admin/hero-slides"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>🎯</span>
            <span className="sm:inline">Hero Slides</span>
          </Link>
          <Link
            href="/admin/products/new"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>+</span>
            <span className="sm:inline">Add Product</span>
          </Link>
        </div>
      </div>

      {/* Hero Carousel Management Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-3 sm:p-4 lg:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-3 lg:p-4 rounded-lg flex-shrink-0">
              <span className="text-xl sm:text-3xl lg:text-4xl">🎯</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-lg lg:text-2xl font-bold mb-0.5 sm:mb-1">Manage Homepage Carousel</h2>
              <p className="text-xs sm:text-sm text-purple-100 leading-tight">Feature products on your homepage with custom promotional text and images</p>
            </div>
          </div>
          <Link
            href="/admin/hero-slides"
            className="bg-white text-purple-600 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm lg:text-base whitespace-nowrap"
          >
            <span>Manage Slides</span>
            <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Dashboard</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 sm:p-5 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <span className="text-2xl sm:text-3xl">{stat.icon}</span>
                <span className={`text-xs sm:text-sm font-medium ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <h3 className="text-gray-600 text-xs sm:text-sm font-medium">{stat.title}</h3>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Recent Orders</h2>
                <Link href="/admin/orders" className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium">
                  View All →
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              {recentOrders.length === 0 ? (
                <div className="p-6 sm:p-8 text-center text-gray-500">
                  <p className="text-sm sm:text-base">No orders yet</p>
                </div>
              ) : (
                <>
                  <div className="block lg:hidden">
                    {/* Mobile & Tablet Card View */}
                    <div className="divide-y divide-gray-200">
                      {recentOrders.map((order) => (
                        <div key={order.id} className="p-3 sm:p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between mb-2">
                            <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-xs sm:text-sm">
                              #{order.id}
                            </Link>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-900 font-medium truncate">{order.customer}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm sm:text-base font-semibold text-gray-900">৳{order.amount.toLocaleString()}</span>
                            <span className="text-xs text-gray-500">{order.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <table className="hidden lg:table w-full min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                              {order.id}
                            </Link>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-gray-900 text-sm">{order.customer}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-gray-900 text-sm">৳{order.amount.toLocaleString()}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{order.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>

          {/* Pending Verifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Pending B2B</h2>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingVerifications.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingVerifications.length === 0 ? (
              <div className="p-4 sm:p-6 text-center text-gray-500 text-xs sm:text-sm">
                <p>No pending verifications</p>
              </div>
            ) : (
              pendingVerifications.map((verification) => (
              <div key={verification.id} className="p-3 sm:p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base truncate">{verification.company}</h3>
                    <p className="text-xs text-gray-600 mt-1">Type: {verification.type}</p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">Submitted: {verification.submitted}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button className="flex-1 px-2 py-1.5 sm:py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 whitespace-nowrap">
                    ✓ Approve
                  </button>
                  <button className="flex-1 px-2 py-1.5 sm:py-2 bg-red-600 text-white text-xs rounded hover:bg-red-700 whitespace-nowrap">
                    ✗ Reject
                  </button>
                  <Link
                    href={`/admin/verification/${verification.id}`}
                    className="flex-1 px-2 py-1.5 sm:py-2 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 text-center whitespace-nowrap"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))
            )}
          </div>
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <Link
              href="/admin/verification"
              className="block text-center text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
            >
              View All Verifications →
            </Link>
          </div>
        </div>
        </div>
      )}

      {/* Quick Actions */}
      {!loading && !error && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          <Link
            href="/admin/hero-slides"
            className="p-2 sm:p-3 lg:p-4 border-2 border-solid border-purple-300 bg-purple-50 rounded-lg hover:border-purple-500 hover:bg-purple-100 transition-all text-center group"
          >
            <div className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2">🎯</div>
            <div className="text-xs font-bold text-purple-700 leading-tight">Hero Carousel</div>
            <div className="text-xs text-purple-600 mt-1 hidden lg:block">Feature Products</div>
          </Link>
          <Link
            href="/admin/products/new"
            className="p-2 sm:p-3 lg:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2">📦</div>
            <div className="text-xs font-medium text-gray-700 leading-tight">Add Product</div>
          </Link>
          <Link
            href="/admin/products"
            className="p-2 sm:p-3 lg:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2">📋</div>
            <div className="text-xs font-medium text-gray-700 leading-tight">All Products</div>
          </Link>
          <Link
            href="/admin/orders"
            className="p-2 sm:p-3 lg:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2">🛒</div>
            <div className="text-xs font-medium text-gray-700 leading-tight">Manage Orders</div>
          </Link>
          <Link
            href="/admin/users"
            className="p-2 sm:p-3 lg:p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-xl sm:text-2xl lg:text-3xl mb-1 sm:mb-2">👥</div>
            <div className="text-xs font-medium text-gray-700 leading-tight">Manage Users</div>
          </Link>
        </div>
      </div>
      )}
    </div>
  );
}
