'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface ReturnListItem {
  id: string;
  returnNumber: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED';
  reason: string;
  refundAmount: number | null;
  createdAt: string;
  order: { id: string; orderNumber: string };
  user: { name: string; email: string };
  items: Array<{ quantity: number; refundAmount: number; orderItem: { product: { name: string } } }>;
}

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function AdminReturnsPage() {
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<ReturnListItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED'>('all');

  useEffect(() => {
    fetchReturns();
  }, [filter]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/returns?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setReturns(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Returns</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage customer return requests</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{returns.length}</div>
        </div>
        {(['REQUESTED', 'APPROVED', 'REFUNDED', 'REJECTED'] as const).map((s) => (
          <div key={s} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">{s}</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {returns.filter(r => r.status === s).length}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'REQUESTED', label: 'Requested' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REFUNDED', label: 'Refunded' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as typeof filter)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filter === option.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {returns.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No return requests found</p>
            </div>
          ) : (
            returns.map((r) => (
              <Link
                key={r.id}
                href={`/admin/returns/${r.id}`}
                className="block p-3 sm:p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{r.returnNumber}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[r.status]}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      Order {r.order.orderNumber} • {r.user.name} ({r.user.email})
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.items.map(i => `${i.orderItem.product.name} × ${i.quantity}`).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      ৳{r.items.reduce((s, i) => s + i.refundAmount, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
