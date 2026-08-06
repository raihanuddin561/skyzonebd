'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface Supplier {
  id: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface PurchaseOrderItem {
  id: string;
  quantityOrdered: number;
  quantityReceived: number;
  costPerUnit: number;
  product: { id: string; name: string; sku: string };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  status: string;
  expectedDate: string | null;
  createdAt: string;
  supplier: Supplier;
  items: PurchaseOrderItem[];
}

const STATUS_BADGES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SENT: 'bg-blue-100 text-blue-800',
  PARTIALLY_RECEIVED: 'bg-yellow-100 text-yellow-800',
  RECEIVED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

type LineDraft = { productId: string; quantityOrdered: string; costPerUnit: string };

export default function PurchaseOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([{ productId: '', quantityOrdered: '', costPerUnit: '' }]);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const qs = statusFilter ? `?status=${statusFilter}&limit=50` : '?limit=50';
      const response = await fetch(`/api/admin/purchase-orders${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setOrders(data.data);
      } else {
        toast.error(data.error || 'Failed to load purchase orders');
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = async () => {
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setLines([{ productId: '', quantityOrdered: '', costPerUnit: '' }]);
    setShowModal(true);
    try {
      const token = localStorage.getItem('token');
      const [suppliersRes, productsRes] = await Promise.all([
        fetch('/api/admin/suppliers?activeOnly=true&limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/products?limit=200&includeInactive=true', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const suppliersData = await suppliersRes.json();
      const productsData = await productsRes.json();
      if (suppliersRes.ok && suppliersData.success) setSuppliers(suppliersData.data);
      if (productsRes.ok && productsData.success) setProducts(productsData.data.products);
    } catch (error) {
      console.error('Error loading suppliers/products:', error);
      toast.error('Failed to load suppliers/products');
    }
  };

  const updateLine = (index: number, field: keyof LineDraft, value: string) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
  };

  const addLine = () => setLines((prev) => [...prev, { productId: '', quantityOrdered: '', costPerUnit: '' }]);
  const removeLine = (index: number) => setLines((prev) => prev.filter((_, i) => i !== index));

  const handleCreate = async () => {
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    const items = lines
      .filter((l) => l.productId && l.quantityOrdered)
      .map((l) => ({
        productId: l.productId,
        quantityOrdered: parseInt(l.quantityOrdered, 10),
        costPerUnit: parseFloat(l.costPerUnit || '0'),
      }));
    if (items.length === 0) {
      toast.error('Add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          supplierId,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          items,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        toast.success('Purchase order created');
        setShowModal(false);
        fetchOrders();
      } else {
        toast.error(data.error || 'Failed to create purchase order');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Failed to create purchase order');
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

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Order stock from suppliers and receive it into inventory</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base whitespace-nowrap"
        >
          + New Purchase Order
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap">
          {['', 'DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map((s) => (
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No purchase orders yet — click &quot;+ New Purchase Order&quot; to create one.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{po.poNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{po.supplier.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{po.items.length} line(s)</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGES[po.status] || 'bg-gray-100 text-gray-800'}`}>
                        {po.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">New Purchase Order</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Select a supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={2}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Line Items *</label>
                    <button onClick={addLine} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      + Add line
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((line, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <select
                          value={line.productId}
                          onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                          className="flex-1 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          value={line.quantityOrdered}
                          onChange={(e) => updateLine(idx, 'quantityOrdered', e.target.value)}
                          className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="Cost/unit"
                          value={line.costPerUnit}
                          onChange={(e) => updateLine(idx, 'costPerUnit', e.target.value)}
                          className="w-24 px-2 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                        {lines.length > 1 && (
                          <button
                            onClick={() => removeLine(idx)}
                            className="px-2 py-2 text-red-600 hover:text-red-700 text-sm"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
