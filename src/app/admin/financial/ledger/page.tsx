'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '@/utils/apiClient';
import { exportToCsv } from '@/utils/csvExport';

interface LedgerEntry {
  id: string;
  sourceType: string;
  sourceId: string;
  sourceName: string | null;
  amount: number;
  direction: 'DEBIT' | 'CREDIT';
  category: string | null;
  subcategory: string | null;
  createdAt: string;
  isReconciled: boolean;
  order: { orderNumber: string; status: string } | null;
}

const SOURCE_TYPES = ['ORDER', 'EXPENSE', 'SALARY', 'ADJUSTMENT', 'REFUND', 'PURCHASE', 'RETURN', 'FEE', 'COMMISSION', 'MANUAL_SALE', 'OTHER'];

export default function FinancialLedgerPage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<{ pageCredits: number; pageDebits: number; pageBalance: number } | null>(null);
  const [sourceType, setSourceType] = useState('');
  const [reconciled, setReconciled] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchEntries();
  }, [sourceType, reconciled]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '100' });
      if (sourceType) params.set('sourceType', sourceType);
      if (reconciled) params.set('reconciled', reconciled);
      const response = await api.get(`/api/admin/financial/ledger?${params.toString()}`);
      const data = await response.json();
      if (response.ok && data.success) {
        setEntries(data.data.entries);
        setSummary(data.data.summary);
      } else {
        toast.error(data.error || 'Failed to load ledger');
      }
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleReconcile = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one entry to reconcile');
      return;
    }
    try {
      const response = await api.post('/api/admin/financial/ledger/reconcile', { action: 'reconcile', entryIds: selectedIds });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Reconciled ${data.data.reconciledCount} entries`);
        setSelectedIds([]);
        fetchEntries();
      } else {
        toast.error(data.error || 'Failed to reconcile');
      }
    } catch (error) {
      console.error('Error reconciling entries:', error);
      toast.error('Failed to reconcile');
    }
  };

  const handleExport = () => {
    exportToCsv('financial-ledger', entries.map((e) => ({
      date: e.createdAt, sourceType: e.sourceType, sourceName: e.sourceName || '', category: e.category || '',
      direction: e.direction, amount: e.amount, order: e.order?.orderNumber || '', reconciled: e.isReconciled,
    })));
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Ledger</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Double-entry audit log of every financial transaction</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm">
            Export CSV
          </button>
          <button
            onClick={handleReconcile}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50"
          >
            Reconcile Selected ({selectedIds.length})
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Page Credits</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">৳{summary.pageCredits.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Page Debits</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">৳{summary.pageDebits.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Page Balance</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">৳{summary.pageBalance.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap items-center">
          <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All Source Types</option>
            {SOURCE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={reconciled} onChange={(e) => setReconciled(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
            <option value="">All</option>
            <option value="false">Unreconciled</option>
            <option value="true">Reconciled</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reconciled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">No ledger entries found.</td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.includes(e.id)} onChange={() => toggleSelect(e.id)} disabled={e.isReconciled} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(e.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{e.sourceType}{e.sourceName ? ` — ${e.sourceName}` : ''}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{e.order?.orderNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${e.direction === 'CREDIT' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {e.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">৳{e.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{e.isReconciled ? '✓' : '—'}</td>
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
