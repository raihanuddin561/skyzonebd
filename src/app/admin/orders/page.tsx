'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import { exportToCsv } from '@/utils/csvExport';
import Pagination from '@/components/common/Pagination';
import { getOrderStatusColor, getOrderStatusLabel } from '@/utils/orderStatus';

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    type: 'guest' | 'retail' | 'wholesale';
  };
  items: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'pending_verification' | 'paid' | 'partial' | 'failed' | 'refunded';
  paymentMethod: string;
  createdAt: string;
}

export default function OrdersManagement() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setFetchError(false);
      const token = localStorage.getItem('token');

      if (!token) {
        console.error('No token found');
        setFetchError(true);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle token expiration or unauthorized
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }

        throw new Error(result.error || 'Failed to fetch orders');
      }

      if (result.success && result.data) {
        // Transform API data to match our interface
        const transformedOrders = result.data.map((order: any) => ({
          id: order.id.toString(),
          orderNumber: order.orderId,
          customer: order.guestInfo ? {
            name: order.guestInfo.name,
            email: order.guestInfo.email || '',
            phone: order.guestInfo.mobile,
            type: 'guest' as const
          } : {
            name: 'Customer',
            email: '',
            phone: '',
            type: 'retail' as const
          },
          items: order.items.length,
          total: order.total,
          status: order.status as any,
          paymentStatus: order.paymentStatus as any,
          paymentMethod: order.paymentMethod,
          createdAt: order.createdAt
        }));

        setOrders(transformedOrders);
      } else {
        setFetchError(true);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      fetchOrders();
    }
  }, [user]);

  const getStatusBadge = (status: string) => ({
    class: getOrderStatusColor(status),
    text: getOrderStatusLabel(status),
  });

  const getPaymentStatusBadge = (status: string) => {
    const badges: { [key: string]: { class: string; text: string } } = {
      pending: { class: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      pending_verification: { class: 'bg-orange-100 text-orange-800', text: 'Pending Verification' },
      paid: { class: 'bg-green-100 text-green-800', text: 'Paid' },
      failed: { class: 'bg-red-100 text-red-800', text: 'Failed' },
      partial: { class: 'bg-blue-100 text-blue-800', text: 'Partial' },
      refunded: { class: 'bg-gray-100 text-gray-800', text: 'Refunded' },
    };
    return badges[status.toLowerCase()] || badges.pending;
  };

  const getCustomerTypeBadge = (type: string) => {
    const badges: { [key: string]: { class: string; text: string; icon: string } } = {
      guest: { class: 'bg-gray-100 text-gray-800', text: 'Guest', icon: '👤' },
      retail: { class: 'bg-blue-100 text-blue-800', text: 'Retail', icon: '🛍️' },
      wholesale: { class: 'bg-purple-100 text-purple-800', text: 'Wholesale', icon: '🏢' },
    };
    return badges[type] || badges.guest;
  };

  // The search/status/payment filters above were bound to state but never
  // actually applied to the rendered list — every filter selection was a
  // no-op and the table always showed every order regardless.
  const filteredOrders = orders.filter((order) => {
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    if (filterPayment !== 'all' && order.paymentStatus !== filterPayment) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      const matches =
        order.orderNumber.toLowerCase().includes(term) ||
        order.customer.name.toLowerCase().includes(term) ||
        order.customer.email.toLowerCase().includes(term);
      if (!matches) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterPayment, searchTerm]);

  const handleSelectAll = () => {
    if (selectedOrders.length === filteredOrders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map(o => o.id));
    }
  };

  const handleSelectOrder = (id: string) => {
    if (selectedOrders.includes(id)) {
      setSelectedOrders(selectedOrders.filter(oid => oid !== id));
    } else {
      setSelectedOrders([...selectedOrders, id]);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to update order status');
        return;
      }

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus.toLowerCase() as any }
            : order
        ));
        toast.success(`Order status updated to ${newStatus}`);
      } else {
        toast.error(result.error || 'Failed to update order status');
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedOrders.length === 0) return;
    await Promise.all(selectedOrders.map((orderId) => handleStatusChange(orderId, newStatus)));
    setSelectedOrders([]);
  };

  const exportOrders = (list: Order[]) => {
    if (list.length === 0) {
      toast.info('No orders to export');
      return;
    }
    exportToCsv('orders', list.map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customer.name,
      customerEmail: order.customer.email,
      customerType: order.customer.type,
      items: order.items,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
    })));
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    const reason = prompt(`Cancel order ${orderNumber}?\n\nPlease provide a cancellation reason:`);
    
    if (reason === null) {
      return; // User clicked cancel
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to cancel order');
        return;
      }

      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          orderId: orderId,
          reason: reason || 'No reason provided'
        })
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setOrders(orders.map(order => 
          order.id === orderId 
            ? { ...order, status: 'cancelled' as any }
            : order
        ));
        toast.success('Order cancelled successfully. Stock has been restored.');
        handleRefresh(); // Refresh to get latest data
      } else {
        toast.error(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    }
  };

  const handleRefresh = () => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      const fetchOrders = async () => {
        try {
          setLoading(true);
          const token = localStorage.getItem('token');
          
          if (!token) {
            console.error('No token found');
            setLoading(false);
            return;
          }

          const response = await fetch('/api/orders', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            throw new Error('Failed to fetch orders');
          }

          const result = await response.json();
          
          if (result.success && result.data) {
            const transformedOrders = result.data.map((order: any) => ({
              id: order.id.toString(),
              orderNumber: order.orderId,
              customer: order.guestInfo ? {
                name: order.guestInfo.name,
                email: order.guestInfo.email || '',
                phone: order.guestInfo.mobile,
                type: 'guest' as const
              } : {
                name: 'Customer',
                email: '',
                phone: '',
                type: 'retail' as const
              },
              items: order.items.length,
              total: order.total,
              status: order.status as any,
              paymentStatus: 'pending' as const,
              paymentMethod: order.paymentMethod,
              createdAt: order.createdAt
            }));
            
            setOrders(transformedOrders);
          }
        } catch (error) {
          console.error('Error fetching orders:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchOrders();
    }
  };

  // Calculate stats from actual orders
  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    pendingVerification: orders.filter(o => o.paymentStatus.toLowerCase() === 'pending_verification').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600 mt-1">Manage and process customer orders</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/orders/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium"
          >
            <span>➕</span>
            <span>Create Order</span>
          </Link>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => exportOrders(filteredOrders)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            <span>📊</span>
            <span>Export Orders</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Orders</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <span className="text-3xl">⏳</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-orange-300 p-4 bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-700 font-medium">Payment Verification</p>
              <p className="text-2xl font-bold text-orange-600">{stats.pendingVerification}</p>
            </div>
            <span className="text-3xl">⚠️</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
            </div>
            <span className="text-3xl">⚙️</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Shipped</p>
              <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
            </div>
            <span className="text-3xl">🚚</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search by order number, customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payments</option>
              <option value="pending_verification">⚠️ Pending Verification</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedOrders.length} order(s) selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkStatusChange('confirmed')}
                className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm cursor-pointer"
              >
                Mark as Confirmed
              </button>
              <button
                onClick={() => handleBulkStatusChange('processing')}
                className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm cursor-pointer"
              >
                Mark as Processing
              </button>
              <button
                onClick={() => exportOrders(orders.filter((o) => selectedOrders.includes(o.id)))}
                className="px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm cursor-pointer"
              >
                Export Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : fetchError ? (
          <div className="text-center py-16">
            <div className="text-gray-300 text-6xl mb-4">⚠️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Couldn&apos;t load orders</h3>
            <p className="text-gray-600 mb-4">Something went wrong while loading orders. Please try again.</p>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-300 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">Orders will appear here once customers start placing them.</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-300 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders match your filters</h3>
            <p className="text-gray-600 mb-4">Try adjusting your search or filter selections.</p>
            <button
              onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterPayment('all'); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium cursor-pointer"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === filteredOrders.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedOrders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {order.orderNumber}
                    </Link>
                    <div className="text-xs text-gray-500 mt-1">{order.paymentMethod}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{order.customer.name}</div>
                    <div className="text-sm text-gray-600">{order.customer.phone}</div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mt-1 ${getCustomerTypeBadge(order.customer.type).class}`}>
                      <span>{getCustomerTypeBadge(order.customer.type).icon}</span>
                      <span>{getCustomerTypeBadge(order.customer.type).text}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.items}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    ৳{order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${getStatusBadge(order.status).class}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(order.paymentStatus).class}`}>
                      {getPaymentStatusBadge(order.paymentStatus).text}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(order.createdAt).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </Link>
                      {order.status !== 'cancelled' && order.status !== 'delivered' && (
                        <button 
                          onClick={() => handleCancelOrder(order.id, order.orderNumber)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                          title="Cancel Order"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !fetchError && filteredOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * ordersPerPage + 1} to{' '}
              {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
