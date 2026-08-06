'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { api } from '@/utils/apiClient';

interface AREntry {
  id: string;
  invoiceNumber: string;
  orderId: string;
  orderNumber: string;
  customerName?: string;
  customerEmail?: string;
  dueDate: string;
  outstandingBalance: number;
  status: string;
  daysOutstanding: number;
  isOverdue: boolean;
  urgency: 'none' | 'low' | 'medium' | 'high';
}

interface CustomerSummary {
  customerId: string | null;
  customerName?: string;
  totalOutstanding: number;
  count: number;
  oldestDaysOutstanding: number;
}

const URGENCY_BADGES: Record<string, string> = {
  high: 'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-blue-100 text-blue-800',
  none: 'bg-gray-100 text-gray-800',
};

export default function AccountsReceivablePage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<AREntry[]>([]);
  const [byCustomer, setByCustomer] = useState<CustomerSummary[]>([]);
  const [summary, setSummary] = useState<{ totalOutstanding: number; overdueCount: number; unpaidCount: number; highUrgencyCount: number } | null>(null);
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    fetchAR();
  }, [overdueOnly]);

  const fetchAR = async () => {
    try {
      setLoading(true);
      const qs = overdueOnly ? '?overdue=true&limit=100' : '?limit=100';
      const response = await api.get(`/api/admin/financial/accounts-receivable${qs}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setInvoices(data.data.invoices);
        setByCustomer(data.data.byCustomer);
        setSummary(data.data.summary);
      } else {
        toast.error(data.error || 'Failed to load accounts receivable');
      }
    } catch (error) {
      console.error('Error fetching accounts receivable:', error);
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Accounts Receivable</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Outstanding NET30/60/90 invoices and aging</p>
        </div>
        <Link href="/admin/invoices" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base whitespace-nowrap">
          All Invoices
        </Link>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Outstanding</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">৳{summary.totalOutstanding.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Unpaid</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{summary.unpaidCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Overdue</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{summary.overdueCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">High Urgency</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{summary.highUrgencyCount}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <button
          onClick={() => setOverdueOnly(!overdueOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            overdueOnly ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {overdueOnly ? 'Showing Overdue Only' : 'Show Overdue Only'}
        </button>
      </div>

      {byCustomer.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">By Customer</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoices</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Oldest (days)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {byCustomer.map((c) => (
                  <tr key={c.customerId || 'unknown'} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-900">{c.customerName || 'Unknown'}</td>
                    <td className="px-4 py-2 text-sm text-gray-900 font-semibold">৳{c.totalOutstanding.toLocaleString()}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.count}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.oldestDaysOutstanding}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outstanding</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No outstanding invoices.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.customerName || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">৳{inv.outstandingBalance.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{inv.daysOutstanding > 0 ? inv.daysOutstanding : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${URGENCY_BADGES[inv.urgency]}`}>{inv.urgency}</span>
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
