'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface ReturnDetail {
  id: string;
  returnNumber: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'REFUNDED' | 'CANCELLED';
  reason: string;
  rejectionReason: string | null;
  refundAmount: number | null;
  paymentReference: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  refundedBy: string | null;
  refundedAt: string | null;
  createdAt: string;
  order: { id: string; orderNumber: string };
  user: { name: string; email: string };
  items: Array<{
    id: string;
    quantity: number;
    refundAmount: number;
    orderItem: { product: { name: string; imageUrl: string } };
  }>;
}

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function AdminReturnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [returnId, setReturnId] = useState('');
  const [item, setItem] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    params.then(p => setReturnId(p.id));
  }, [params]);

  useEffect(() => {
    if (returnId) fetchReturn();
  }, [returnId]);

  const fetchReturn = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/returns/${returnId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setItem(data.data);
      } else {
        toast.error(data.error || 'Return not found');
      }
    } catch (error) {
      console.error('Error fetching return:', error);
      toast.error('Failed to load return');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this return? This will restock the items.')) return;
    await decide('APPROVED');
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    await decide('REJECTED', rejectionReason);
  };

  const decide = async (status: 'APPROVED' | 'REJECTED', reason?: string) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/returns/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, rejectionReason: reason }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setShowRejectForm(false);
        fetchReturn();
      } else {
        toast.error(data.error || 'Failed to update return');
      }
    } catch (error) {
      console.error('Error deciding return:', error);
      toast.error('Failed to update return');
    } finally {
      setUpdating(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!confirm('Process the refund for this return? This posts the ledger reversal and cannot be undone.')) return;
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/returns/${returnId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchReturn();
      } else {
        toast.error(data.error || 'Failed to process refund');
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-600">Return not found.</p>
        <Link href="/admin/returns" className="text-blue-600 hover:text-blue-700">← Back to Returns</Link>
      </div>
    );
  }

  const totalRefund = item.items.reduce((sum, i) => sum + i.refundAmount, 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/returns" className="text-blue-600 hover:text-blue-700 inline-flex items-center text-sm">
        ← Back to Returns
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{item.returnNumber}</h1>
          <p className="text-sm text-gray-600 mt-1">
            Order <Link href={`/orders/${item.order.id}`} className="text-blue-600 hover:underline">{item.order.orderNumber}</Link>
            {' '}• {item.user.name} ({item.user.email})
          </p>
        </div>
        <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${STATUS_STYLES[item.status]}`}>
          {item.status}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Items</h2>
        <div className="space-y-2 mb-4">
          {item.items.map((i) => (
            <div key={i.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span className="text-gray-900">{i.orderItem.product.name} × {i.quantity}</span>
              <span className="font-medium text-gray-900">৳{i.refundAmount.toLocaleString()}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total Refund Amount</span>
          <span className="font-bold text-blue-600">৳{(item.refundAmount ?? totalRefund).toLocaleString()}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600"><strong>Customer's reason:</strong> {item.reason}</p>
          {item.rejectionReason && (
            <p className="text-sm text-red-600 mt-2"><strong>Rejection reason:</strong> {item.rejectionReason}</p>
          )}
          {item.refundedAt && (
            <p className="text-sm text-green-600 mt-2">
              Refunded on {new Date(item.refundedAt).toLocaleString()}
              {item.paymentReference && ` (ref: ${item.paymentReference})`}
            </p>
          )}
        </div>
      </div>

      {item.status === 'REQUESTED' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Decision</h2>
          {!showRejectForm ? (
            <div className="flex gap-2">
              <button
                onClick={handleApprove}
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {updating ? 'Processing...' : '✓ Approve (restocks items)'}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={updating}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ✗ Reject
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejecting this return..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={updating}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {updating ? 'Processing...' : 'Confirm Rejection'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={updating}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {item.status === 'APPROVED' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Process Refund</h2>
          <p className="text-sm text-gray-600 mb-3">
            This is a separate step from approval — it moves money and posts the ledger reversal.
          </p>
          <button
            onClick={handleProcessRefund}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {updating ? 'Processing...' : `💳 Process Refund (৳${(item.refundAmount ?? totalRefund).toLocaleString()})`}
          </button>
        </div>
      )}
    </div>
  );
}
