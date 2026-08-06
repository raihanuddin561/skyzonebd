'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { api } from '@/utils/apiClient';

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: string;
  customer: { id: string; name: string; email: string } | null;
  order: { orderNumber: string };
}

const STATUS_BADGES: Record<string, string> = {
  UNPAID: 'bg-yellow-100 text-yellow-800',
  PARTIALLY_PAID: 'bg-blue-100 text-blue-800',
  PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function AdminInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const qs = statusFilter ? `?status=${statusFilter}&limit=50` : '?limit=50';
      const response = await api.get(`/api/admin/invoices${qs}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setInvoices(data.data);
      } else {
        toast.error(data.error || 'Failed to load invoices');
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">NET30/60/90 order invoices</p>
        </div>
        <Link
          href="/admin/accounts-receivable"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base whitespace-nowrap"
        >
          View Accounts Receivable
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap">
          {['', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE', 'PAID', 'CANCELLED'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {s === '' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No invoices yet — created automatically for NET30/60/90 orders.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      ৳{inv.amount.toFixed(2)}
                      {inv.paidAmount > 0 && <span className="text-green-600 text-xs"> ({inv.paidAmount.toFixed(2)} paid)</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[inv.status] || 'bg-gray-100 text-gray-800'}`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/invoices/${inv.orderId}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View
                      </Link>
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
