'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface Sale {
  id: string;
  saleType: 'DIRECT' | 'ORDER_BASED';
  saleDate: string;
  invoiceNumber?: string;
  customerName: string;
  customerPhone?: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  profitAmount?: number;
  profitMargin?: number;
  paymentMethod?: string;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL' | 'REFUNDED';
  isDelivered: boolean;
  product?: {
    id: string;
    name: string;
    sku?: string;
    imageUrl?: string;
  };
  order?: {
    id: string;
    orderNumber: string;
  };
  enteredByUser?: {
    name: string;
  };
}

interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalQuantity: number;
  byType: Array<{
    saleType: string;
    _count: { id: number };
    _sum: { totalAmount: number; quantity: number };
  }>;
}

interface DeliveredOrder {
  id: string;
  orderNumber: string;
  total: number;
  updatedAt: string;
  user?: {
    name: string;
  };
}

export default function SalesManagement() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [deliveredOrders, setDeliveredOrders] = useState<DeliveredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  
  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'direct' | 'order-based'>('all');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  // New sale modal
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);
  const [newSaleData, setNewSaleData] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    paymentMethod: 'Cash',
    notes: '',
  });

  useEffect(() => {
    fetchSales();
    fetchDeliveredOrders();
  }, [activeTab, dateRange]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (activeTab !== 'all') {
        params.append('saleType', activeTab === 'direct' ? 'DIRECT' : 'ORDER_BASED');
      }
      
      if (dateRange.startDate && dateRange.endDate) {
        params.append('startDate', dateRange.startDate);
        params.append('endDate', dateRange.endDate);
      }

      const response = await fetch(`/api/admin/sales?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSales(data.data.sales);
          setStats(data.data.stats);
        }
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveredOrders = async () => {
    try {
      const response = await fetch('/api/admin/sales/generate');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setDeliveredOrders(data.data.deliveredOrdersWithoutSales.orders || []);
        }
      }
    } catch (error) {
      console.error('Error fetching delivered orders:', error);
    }
  };

  const handleGenerateSalesFromOrder = async (orderId: string) => {
    if (!confirm('Generate sales records from this delivered order?')) return;

    try {
      setGenerating(true);
      const response = await fetch('/api/admin/sales/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        fetchSales();
        fetchDeliveredOrders();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error generating sales:', error);
      toast.error('Failed to generate sales');
    } finally {
      setGenerating(false);
    }
  };

  const getSaleTypeBadge = (type: string) => {
    return type === 'DIRECT'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
      REFUNDED: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
          <p className="text-gray-600 mt-1">Track direct sales and order-based sales</p>
        </div>
        <button
          onClick={() => setShowNewSaleModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add Direct Sale
        </button>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Sales</div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{stats.totalSales}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              ৳{stats.totalRevenue.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Total Profit</div>
            <div className="text-2xl font-bold text-green-600 mt-2">
              ৳{stats.totalProfit.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-sm font-medium text-gray-600">Units Sold</div>
            <div className="text-2xl font-bold text-purple-600 mt-2">{stats.totalQuantity}</div>
          </div>
        </div>
      )}

      {/* Delivered Orders Without Sales */}
      {deliveredOrders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">
            ⚠️ {deliveredOrders.length} Delivered Orders Without Sales
          </h3>
          <p className="text-sm text-yellow-700 mb-4">
            These orders are marked as delivered but don't have sales records yet.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {deliveredOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between bg-white p-3 rounded border border-yellow-300"
              >
                <div>
                  <div className="font-medium">{order.orderNumber}</div>
                  <div className="text-sm text-gray-600">
                    {order.user?.name} • ৳{order.total.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(order.updatedAt).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <button
                  onClick={() => handleGenerateSalesFromOrder(order.id)}
                  disabled={generating}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Generate Sales
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Sales
            </button>
            <button
              onClick={() => setActiveTab('direct')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'direct'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Direct Sales
            </button>
            <button
              onClick={() => setActiveTab('order-based')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'order-based'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Order-Based
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <button
              onClick={() => setDateRange({ startDate: '', endDate: '' })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No sales found
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(sale.saleDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSaleTypeBadge(sale.saleType)}`}>
                        {sale.saleType === 'DIRECT' ? 'Direct' : 'Order'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{sale.customerName}</div>
                      {sale.customerPhone && (
                        <div className="text-xs text-gray-500">{sale.customerPhone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{sale.productName}</div>
                      {sale.productSku && (
                        <div className="text-xs text-gray-500">SKU: {sale.productSku}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{sale.quantity}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ৳{sale.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-green-600">
                        ৳{(sale.profitAmount || 0).toLocaleString()}
                      </div>
                      {sale.profitMargin && (
                        <div className="text-xs text-gray-500">
                          {sale.profitMargin.toFixed(1)}% margin
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(sale.paymentStatus)}`}>
                        {sale.paymentStatus}
                      </span>
                      {sale.paymentMethod && (
                        <div className="text-xs text-gray-500 mt-1">{sale.paymentMethod}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {sale.order && (
                        <Link
                          href={`/admin/orders/${sale.order.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          View Order
                        </Link>
                      )}
                    </td>
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
