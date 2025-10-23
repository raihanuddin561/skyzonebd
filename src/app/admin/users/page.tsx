'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'seller' | 'buyer';
  userType: 'retail' | 'wholesale';
  status: 'active' | 'suspended' | 'pending';
  businessVerified: boolean;
  businessName?: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
  lastLogin: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filterRole, setFilterRole] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    // Mock data - replace with actual API call
    setUsers([
      {
        id: '1',
        name: 'Ahmed Khan',
        email: 'ahmed@example.com',
        phone: '+880-1711-123456',
        role: 'buyer',
        userType: 'wholesale',
        status: 'active',
        businessVerified: true,
        businessName: 'Khan Trading Co.',
        totalOrders: 45,
        totalSpent: 2350000,
        createdAt: '2024-01-15T10:00:00',
        lastLogin: '2024-10-22T09:30:00'
      },
      {
        id: '2',
        name: 'Sara Ahmed',
        email: 'sara@example.com',
        phone: '+880-1722-234567',
        role: 'buyer',
        userType: 'retail',
        status: 'active',
        businessVerified: false,
        totalOrders: 12,
        totalSpent: 85000,
        createdAt: '2024-03-22T14:20:00',
        lastLogin: '2024-10-22T11:15:00'
      },
      {
        id: '3',
        name: 'Mohammad Hassan',
        email: 'hassan@store.com',
        phone: '+880-1733-345678',
        role: 'seller',
        userType: 'wholesale',
        status: 'active',
        businessVerified: true,
        businessName: 'Hassan Electronics',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: '2024-02-10T11:00:00',
        lastLogin: '2024-10-21T16:45:00'
      },
      {
        id: '4',
        name: 'Fatima Noor',
        email: 'fatima@example.com',
        phone: '+880-1744-456789',
        role: 'buyer',
        userType: 'wholesale',
        status: 'pending',
        businessVerified: false,
        businessName: 'Noor Distributors',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: '2024-10-20T08:15:00',
        lastLogin: '2024-10-20T08:15:00'
      },
    ]);
  }, []);

  const getRoleBadge = (role: string) => {
    const badges: { [key: string]: { class: string; text: string; icon: string } } = {
      admin: { class: 'bg-red-100 text-red-800', text: 'Admin', icon: '👑' },
      seller: { class: 'bg-green-100 text-green-800', text: 'Seller', icon: '🏪' },
      buyer: { class: 'bg-blue-100 text-blue-800', text: 'Buyer', icon: '🛒' },
    };
    return badges[role] || badges.buyer;
  };

  const getUserTypeBadge = (type: string) => {
    const badges: { [key: string]: { class: string; text: string } } = {
      retail: { class: 'bg-indigo-100 text-indigo-800', text: 'Retail' },
      wholesale: { class: 'bg-purple-100 text-purple-800', text: 'Wholesale' },
    };
    return badges[type] || badges.retail;
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { class: string; text: string } } = {
      active: { class: 'bg-green-100 text-green-800', text: 'Active' },
      suspended: { class: 'bg-red-100 text-red-800', text: 'Suspended' },
      pending: { class: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
    };
    return badges[status] || badges.pending;
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uid => uid !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  const handleStatusChange = (userId: string, newStatus: string) => {
    console.log(`Changing user ${userId} status to ${newStatus}`);
    // TODO: Implement status change API call
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">Manage customers, sellers, and admins</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <span>📊</span>
            <span>Export Users</span>
          </button>
          <Link
            href="/admin/users/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span>
            <span>Add User</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">1,247</p>
            </div>
            <span className="text-3xl">👥</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Retail Buyers</p>
              <p className="text-2xl font-bold text-blue-600">856</p>
            </div>
            <span className="text-3xl">🛍️</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Wholesale</p>
              <p className="text-2xl font-bold text-purple-600">312</p>
            </div>
            <span className="text-3xl">🏢</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sellers</p>
              <p className="text-2xl font-bold text-green-600">68</p>
            </div>
            <span className="text-3xl">🏪</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">11</p>
            </div>
            <span className="text-3xl">⏳</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="seller">Seller</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="retail">Retail</option>
              <option value="wholesale">Wholesale</option>
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm">
                Activate
              </button>
              <button className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm">
                Suspend
              </button>
              <button className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm">
                Export Selected
              </button>
              <button className="px-3 py-1 bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 text-sm">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                        <div className="text-xs text-gray-500">{user.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role).class}`}>
                      <span>{getRoleBadge(user.role).icon}</span>
                      <span>{getRoleBadge(user.role).text}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getUserTypeBadge(user.userType).class}`}>
                      {getUserTypeBadge(user.userType).text}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.businessName ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.businessName}</div>
                        <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                          {user.businessVerified ? (
                            <>
                              <span className="text-green-600">✓</span>
                              <span>Verified</span>
                            </>
                          ) : (
                            <>
                              <span className="text-yellow-600">⚠</span>
                              <span>Pending</span>
                            </>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{user.totalOrders}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {user.totalSpent > 0 ? `৳${user.totalSpent.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${getStatusBadge(user.status).class}`}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(user.lastLogin).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/admin/orders?user=${user.id}`}
                        className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                      >
                        Orders
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing 1 to {users.length} of {users.length} users
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">1</button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">2</button>
            <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
