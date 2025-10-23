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
  const [stats, setStats] = useState<StatCard[]>([
    { title: 'Total Revenue', value: '৳2,450,000', change: '+12.5%', icon: '💰', color: 'blue' },
    { title: 'Total Orders', value: '1,234', change: '+8.2%', icon: '🛒', color: 'green' },
    { title: 'Total Users', value: '5,678', change: '+15.3%', icon: '👥', color: 'purple' },
    { title: 'Products', value: '456', change: '+3', icon: '📦', color: 'orange' },
  ]);

  const [recentOrders, setRecentOrders] = useState([
    { id: 'ORD-001', customer: 'Ahmed Khan', amount: 25000, status: 'pending', date: '2024-10-22' },
    { id: 'ORD-002', customer: 'Sara Ahmed', amount: 15000, status: 'processing', date: '2024-10-22' },
    { id: 'ORD-003', customer: 'Karim Hassan', amount: 35000, status: 'shipped', date: '2024-10-21' },
    { id: 'ORD-004', customer: 'Fatima Ali', amount: 42000, status: 'delivered', date: '2024-10-21' },
  ]);

  const [pendingVerifications, setPendingVerifications] = useState([
    { id: 1, company: 'ABC Trading Ltd.', submitted: '2024-10-20', type: 'Wholesale' },
    { id: 2, company: 'XYZ Distributors', submitted: '2024-10-21', type: 'Wholesale' },
    { id: 3, company: 'Modern Retail Co.', submitted: '2024-10-22', type: 'Wholesale' },
  ]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Export Data
          </button>
          <Link
            href="/admin/products/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl">{stat.icon}</span>
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-600 text-sm font-medium">{stat.title}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
              <Link href="/admin/orders" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                        {order.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">{order.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">৳{order.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Pending B2B Verifications</h2>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {pendingVerifications.length}
              </span>
            </div>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingVerifications.map((verification) => (
              <div key={verification.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{verification.company}</h3>
                    <p className="text-sm text-gray-600 mt-1">Type: {verification.type}</p>
                    <p className="text-xs text-gray-500 mt-1">Submitted: {verification.submitted}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700">
                    Approve
                  </button>
                  <button className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700">
                    Reject
                  </button>
                  <Link
                    href={`/admin/verification/${verification.id}`}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-gray-200">
            <Link
              href="/admin/verification"
              className="block text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Verifications →
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href="/admin/products/new"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2">📦</div>
            <div className="text-sm font-medium text-gray-700">Add Product</div>
          </Link>
          <Link
            href="/admin/orders"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2">🛒</div>
            <div className="text-sm font-medium text-gray-700">Manage Orders</div>
          </Link>
          <Link
            href="/admin/users"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2">👥</div>
            <div className="text-sm font-medium text-gray-700">Manage Users</div>
          </Link>
          <Link
            href="/admin/reports"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm font-medium text-gray-700">View Reports</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
