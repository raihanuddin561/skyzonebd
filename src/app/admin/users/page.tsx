'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'seller' | 'buyer';
  userType: 'RETAIL' | 'WHOLESALE';
  status: 'active' | 'suspended' | 'pending';
  businessVerified: boolean;
  businessName?: string;
  totalOrders: number;
  totalSpent: number;
  discountPercent?: number;
  discountReason?: string;
  discountValidUntil?: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Discount modal state
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountValidUntil, setDiscountValidUntil] = useState('');
  const [discountSaving, setDiscountSaving] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          role: filterRole,
          userType: filterType,
          status: filterStatus,
          ...(searchTerm && { search: searchTerm }),
        });

        const response = await fetch(`/api/admin/users?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const result = await response.json();
        
        if (result.success) {
          setUsers(result.data.users);
        } else {
          throw new Error(result.error || 'Failed to load users');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [filterRole, filterType, filterStatus, searchTerm]);



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

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      // Determine the action based on the new status
      let action = '';
      if (newStatus === 'active') {
        action = 'activate';
      } else if (newStatus === 'suspended') {
        action = 'suspend';
      } else if (newStatus === 'pending') {
        // For pending, we need to handle it differently
        // We'll deactivate and unverify the user
        action = 'update';
      }

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
          ...(action === 'update' && {
            data: {
              isActive: false,
              isVerified: false,
            },
          }),
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refetch users to get accurate status based on server calculation
        const refetchResponse = await fetch(`/api/admin/users?${new URLSearchParams({
          role: filterRole,
          userType: filterType,
          status: filterStatus,
          ...(searchTerm && { search: searchTerm }),
        })}`);
        
        if (refetchResponse.ok) {
          const refetchResult = await refetchResponse.json();
          if (refetchResult.success) {
            setUsers(refetchResult.data.users);
          }
        }
        
        alert(`User status updated successfully!`);
      } else {
        throw new Error(result.error || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert(`Failed to update user status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!confirm(`Are you sure you want to activate ${selectedUsers.length} user(s)?`)) {
      return;
    }

    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/admin/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            action: 'activate',
          }),
        })
      );

      await Promise.all(promises);

      // Refetch users to get accurate status
      const refetchResponse = await fetch(`/api/admin/users?${new URLSearchParams({
        role: filterRole,
        userType: filterType,
        status: filterStatus,
        ...(searchTerm && { search: searchTerm }),
      })}`);
      
      if (refetchResponse.ok) {
        const refetchResult = await refetchResponse.json();
        if (refetchResult.success) {
          setUsers(refetchResult.data.users);
        }
      }
      
      setSelectedUsers([]);
      alert(`${selectedUsers.length} user(s) activated successfully!`);
    } catch (error) {
      console.error('Error activating users:', error);
      alert(`Failed to activate users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleBulkSuspend = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!confirm(`Are you sure you want to suspend ${selectedUsers.length} user(s)?`)) {
      return;
    }

    try {
      const promises = selectedUsers.map(userId =>
        fetch('/api/admin/users', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            action: 'suspend',
          }),
        })
      );

      await Promise.all(promises);

      // Refetch users to get accurate status
      const refetchResponse = await fetch(`/api/admin/users?${new URLSearchParams({
        role: filterRole,
        userType: filterType,
        status: filterStatus,
        ...(searchTerm && { search: searchTerm }),
      })}`);
      
      if (refetchResponse.ok) {
        const refetchResult = await refetchResponse.json();
        if (refetchResult.success) {
          setUsers(refetchResult.data.users);
        }
      }
      
      setSelectedUsers([]);
      alert(`${selectedUsers.length} user(s) suspended successfully!`);
    } catch (error) {
      console.error('Error suspending users:', error);
      alert(`Failed to suspend users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOpenDiscountModal = (user: User) => {
    setSelectedUser(user);
    setDiscountPercent(user.discountPercent?.toString() || '');
    setDiscountReason(user.discountReason || '');
    setDiscountValidUntil(user.discountValidUntil ? new Date(user.discountValidUntil).toISOString().split('T')[0] : '');
    setShowDiscountModal(true);
  };

  const handleSaveDiscount = async () => {
    if (!selectedUser) return;

    const percent = parseFloat(discountPercent);
    if (isNaN(percent) || percent < 0 || percent > 100) {
      alert('Please enter a valid discount percentage (0-100)');
      return;
    }

    try {
      setDiscountSaving(true);
      const response = await fetch(`/api/admin/customers/${selectedUser.id}/discount`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountPercent: percent,
          discountReason: discountReason || null,
          discountValidUntil: discountValidUntil || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update user in the list
        setUsers(users.map(u => 
          u.id === selectedUser.id 
            ? { 
                ...u, 
                discountPercent: percent,
                discountReason: discountReason || undefined,
                discountValidUntil: discountValidUntil || undefined,
              } 
            : u
        ));
        setShowDiscountModal(false);
        alert('Discount updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to update discount');
      }
    } catch (error) {
      console.error('Error updating discount:', error);
      alert(`Failed to update discount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDiscountSaving(false);
    }
  };

  const handleRemoveDiscount = async () => {
    if (!selectedUser) return;

    if (!confirm('Are you sure you want to remove the discount for this customer?')) {
      return;
    }

    try {
      setDiscountSaving(true);
      const response = await fetch(`/api/admin/customers/${selectedUser.id}/discount`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountPercent: 0,
          discountReason: null,
          discountValidUntil: null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update user in the list
        setUsers(users.map(u => 
          u.id === selectedUser.id 
            ? { 
                ...u, 
                discountPercent: undefined,
                discountReason: undefined,
                discountValidUntil: undefined,
              } 
            : u
        ));
        setShowDiscountModal(false);
        alert('Discount removed successfully!');
      } else {
        throw new Error(result.error || 'Failed to remove discount');
      }
    } catch (error) {
      console.error('Error removing discount:', error);
      alert(`Failed to remove discount: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDiscountSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage customers, sellers, and admins</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2 text-sm sm:text-base">
            <span>📊</span>
            <span className="hidden sm:inline">Export Users</span>
            <span className="sm:hidden">Export</span>
          </button>
          <Link
            href="/admin/users/new"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>+</span>
            <span>Add User</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Users</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">1,247</p>
            </div>
            <span className="text-2xl sm:text-3xl">👥</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Retail Buyers</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">856</p>
            </div>
            <span className="text-2xl sm:text-3xl">🛍️</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Wholesale</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-600">312</p>
            </div>
            <span className="text-2xl sm:text-3xl">🏢</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Sellers</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">68</p>
            </div>
            <span className="text-2xl sm:text-3xl">🏪</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 col-span-2 sm:col-span-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Pending</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">11</p>
            </div>
            <span className="text-2xl sm:text-3xl">⏳</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-red-800">Error Loading Users</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      {!loading && !error && (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
          <div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-xs sm:text-sm font-medium text-blue-900">
              {selectedUsers.length} user(s) selected
            </span>
            <div className="grid grid-cols-2 sm:flex gap-2">
              <button 
                onClick={handleBulkActivate}
                className="px-3 py-1.5 sm:py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-xs sm:text-sm"
              >
                Activate
              </button>
              <button 
                onClick={handleBulkSuspend}
                className="px-3 py-1.5 sm:py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-xs sm:text-sm"
              >
                Suspend
              </button>
              <button className="px-3 py-1.5 sm:py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-xs sm:text-sm hidden sm:block">
                Export Selected
              </button>
              <button className="px-3 py-1.5 sm:py-1 bg-white border border-red-300 text-red-700 rounded hover:bg-red-50 text-xs sm:text-sm col-span-2 sm:col-span-1">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile Card View */}
        <div className="block lg:hidden divide-y divide-gray-200">
          {users.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No users found</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-3 mb-3">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                    className="rounded border-gray-300 mt-1"
                  />
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{user.name}</div>
                    <div className="text-sm text-gray-600 truncate">{user.email}</div>
                    <div className="text-xs text-gray-500">{user.phone}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role).class}`}>
                    <span>{getRoleBadge(user.role).icon}</span>
                    <span>{getRoleBadge(user.role).text}</span>
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getUserTypeBadge(user.userType).class}`}>
                    {getUserTypeBadge(user.userType).text}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(user.status).class}`}>
                    {getStatusBadge(user.status).text}
                  </span>
                </div>
                {user.businessName && (
                  <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                    <div className="font-medium text-gray-900">{user.businessName}</div>
                    <div className="text-gray-600 flex items-center gap-1 mt-1">
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
                )}
                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-gray-600">Orders: </span>
                    <span className="font-medium">{user.totalOrders}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Spent: </span>
                    <span className="font-medium">
                      {user.totalSpent > 0 ? `৳${user.totalSpent.toLocaleString()}` : '-'}
                    </span>
                  </div>
                  {user.discountPercent && user.discountPercent > 0 && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Discount: </span>
                      <span className="font-semibold text-green-600">{user.discountPercent}% OFF</span>
                      {user.discountReason && (
                        <span className="text-gray-500"> - {user.discountReason}</span>
                      )}
                    </div>
                  )}
                  <div className="col-span-2">
                    <span className="text-gray-600">Last Login: </span>
                    <span className="font-medium">{new Date(user.lastLogin).toLocaleDateString('en-GB')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="flex-1 text-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/admin/orders?user=${user.id}`}
                    className="flex-1 text-center px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    Orders
                  </Link>
                  <button
                    onClick={() => handleOpenDiscountModal(user)}
                    className="flex-1 text-center px-3 py-1.5 bg-green-100 text-green-700 text-xs rounded hover:bg-green-200"
                  >
                    Discount
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 xl:px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 xl:px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 xl:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{user.name}</div>
                        <div className="text-sm text-gray-600 truncate">{user.email}</div>
                        <div className="text-xs text-gray-500">{user.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role).class}`}>
                      <span>{getRoleBadge(user.role).icon}</span>
                      <span>{getRoleBadge(user.role).text}</span>
                    </span>
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getUserTypeBadge(user.userType).class}`}>
                      {getUserTypeBadge(user.userType).text}
                    </span>
                  </td>
                  <td className="px-4 xl:px-6 py-4">
                    {user.businessName ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate">{user.businessName}</div>
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
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
                    {user.discountPercent && user.discountPercent > 0 ? (
                      <div>
                        <div className="text-sm font-semibold text-green-600">
                          {user.discountPercent}% OFF
                        </div>
                        {user.discountReason && (
                          <div className="text-xs text-gray-600 truncate max-w-[150px]" title={user.discountReason}>
                            {user.discountReason}
                          </div>
                        )}
                        {user.discountValidUntil && new Date(user.discountValidUntil) > new Date() && (
                          <div className="text-xs text-orange-600">
                            Until {new Date(user.discountValidUntil).toLocaleDateString('en-GB')}
                          </div>
                        )}
                        {user.discountValidUntil && new Date(user.discountValidUntil) <= new Date() && (
                          <div className="text-xs text-red-600">
                            Expired
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleOpenDiscountModal(user)}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Set Discount
                      </button>
                    )}
                  </td>
                  <td className="px-4 xl:px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{user.totalOrders}</td>
                  <td className="px-4 xl:px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                    {user.totalSpent > 0 ? `৳${user.totalSpent.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
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
                  <td className="px-4 xl:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(user.lastLogin).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 xl:px-6 py-4 whitespace-nowrap">
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
                      <button
                        onClick={() => handleOpenDiscountModal(user)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        {user.discountPercent && user.discountPercent > 0 ? 'Edit Discount' : 'Discount'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-gray-600">
            Showing 1 to {users.length} of {users.length} users
          </div>
          <div className="flex gap-1 sm:gap-2">
            <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm">
              Previous
            </button>
            <button className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm">1</button>
            <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm">2</button>
            <button className="px-2 sm:px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Discount Management Modal */}
      {showDiscountModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                Manage Discount for {selectedUser.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Set a percentage discount that applies to all products for this customer
              </p>
            </div>

            <div className="p-6 space-y-4">
              {/* Discount Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Discount Percentage (0-100)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10"
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                </div>
              </div>

              {/* Discount Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., VIP Customer, Loyalty Reward"
                />
              </div>

              {/* Valid Until */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valid Until (Optional)
                </label>
                <input
                  type="date"
                  value={discountValidUntil}
                  onChange={(e) => setDiscountValidUntil(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for permanent discount
                </p>
              </div>

              {/* Current Discount Info */}
              {selectedUser.discountPercent && selectedUser.discountPercent > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Current Discount:</strong> {selectedUser.discountPercent}% OFF
                  </p>
                  {selectedUser.discountReason && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Reason: {selectedUser.discountReason}
                    </p>
                  )}
                  {selectedUser.discountValidUntil && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Valid until: {new Date(selectedUser.discountValidUntil).toLocaleDateString('en-GB')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowDiscountModal(false)}
                disabled={discountSaving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              {selectedUser.discountPercent && selectedUser.discountPercent > 0 && (
                <button
                  onClick={handleRemoveDiscount}
                  disabled={discountSaving}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {discountSaving ? 'Removing...' : 'Remove'}
                </button>
              )}
              <button
                onClick={handleSaveDiscount}
                disabled={discountSaving || !discountPercent || parseFloat(discountPercent) < 0 || parseFloat(discountPercent) > 100}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {discountSaving ? 'Saving...' : 'Save Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
