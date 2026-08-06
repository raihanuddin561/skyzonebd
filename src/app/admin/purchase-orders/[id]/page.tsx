'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface PurchaseOrderItem {
  id: string;
  quantityOrdered: number;
  quantityReceived: number;
  costPerUnit: number;
  product: { id: string; name: string; sku: string; stockQuantity?: number };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  expectedDate: string | null;
  notes: string | null;
  createdAt: string;
  supplier: { id: string; name: string; contactName: string | null; email: string | null; phone: string | null };
  items: PurchaseOrderItem[];
}

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['CANCELLED'],
};

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPo();
  }, [id]);

  const fetchPo = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setPo(data.data);
      } else {
        toast.error(data.error || 'Failed to load purchase order');
      }
    } catch (error) {
      console.error('Error fetching purchase order:', error);
      toast.error('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async (status: string) => {
    if (!confirm(`Change status to ${status.replace('_', ' ')}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/purchase-orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Purchase order updated');
        fetchPo();
      } else {
        toast.error(data.error || 'Failed to update purchase order');
      }
    } catch (error) {
      console.error('Error updating purchase order:', error);
      toast.error('Failed to update purchase order');
    }
  };

  const handleReceive = async () => {
    if (!po) return;
    const items = po.items
      .filter((item) => receiveQty[item.id] && parseInt(receiveQty[item.id], 10) > 0)
      .map((item) => ({ purchaseOrderItemId: item.id, quantityReceived: parseInt(receiveQty[item.id], 10) }));

    if (items.length === 0) {
      toast.error('Enter a quantity to receive for at least one line item');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/purchase-orders/${id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ items }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Received ${data.data.stockLotsCreated} stock lot(s) — inventory updated`);
        setReceiveQty({});
        fetchPo();
      } else {
        toast.error(data.error || 'Failed to receive purchase order');
      }
    } catch (error) {
      console.error('Error receiving purchase order:', error);
      toast.error('Failed to receive purchase order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12 text-gray-500">
        Purchase order not found.{' '}
        <Link href="/admin/purchase-orders" className="text-blue-600 hover:text-blue-700">
          Back to list
        </Link>
      </div>
    );
  }

  const canReceive = po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED';
  const allowedNext = ALLOWED_TRANSITIONS[po.status] || [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/purchase-orders')} className="text-gray-500 hover:text-gray-700">
          ← Back
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{po.poNumber}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{po.supplier.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_BADGES[po.status] || 'bg-gray-100 text-gray-800'}`}>
            {po.status.replace('_', ' ')}
          </span>
          {allowedNext.map((next) => (
            <button
              key={next}
              onClick={() => handleTransition(next)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                next === 'CANCELLED' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {next === 'SENT' ? 'Mark as Sent' : 'Cancel PO'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Supplier Contact</div>
          <div className="text-sm font-medium text-gray-900">{po.supplier.contactName || '—'}</div>
          <div className="text-xs text-gray-500">{po.supplier.email || po.supplier.phone || ''}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Expected Date</div>
          <div className="text-sm font-medium text-gray-900">
            {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Notes</div>
          <div className="text-sm font-medium text-gray-900">{po.notes || '—'}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ordered</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Unit</th>
                {canReceive && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receive Now</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {po.items.map((item) => {
                const remaining = item.quantityOrdered - item.quantityReceived;
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                      {item.product.name}
                      <span className="text-gray-500"> ({item.product.sku})</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.quantityOrdered}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.quantityReceived}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">৳{item.costPerUnit.toFixed(2)}</td>
                    {canReceive && (
                      <td className="px-4 py-3">
                        {remaining > 0 ? (
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            placeholder={`up to ${remaining}`}
                            value={receiveQty[item.id] || ''}
                            onChange={(e) => setReceiveQty({ ...receiveQty, [item.id]: e.target.value })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                        ) : (
                          <span className="text-xs text-green-700 font-medium">Fully received</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canReceive && (
          <div className="px-4 py-3 border-t border-gray-200">
            <button
              onClick={handleReceive}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Receiving...' : 'Receive Stock'}
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Receiving creates a stock lot per line item, increments product stock quantity, and logs the movement — no
              schema/database changes are made outside this transaction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
