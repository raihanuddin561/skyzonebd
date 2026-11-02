'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import AdminIcon from '@/app/admin/components/AdminIcons';

interface CouponItem {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  discountValue: number;
  maxDiscountPoisha?: number | null;
  minOrderAmountPoisha?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  totalUsageLimit?: number | null;
  currentUsageCount?: number;
  perCustomerUsageLimit?: number | null;
  isFirstOrderOnly?: boolean;
  canReduceDelivery?: boolean;
  isActive: boolean;
  description?: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    code: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY',
    discountValue: 10,
    maxDiscountBDT: 1000,
    minOrderAmountBDT: 2000,
    totalUsageLimit: 500,
    perCustomerUsageLimit: 1,
    isFirstOrderOnly: false,
    canReduceDelivery: false,
    isActive: true,
    description: '',
    startDate: '',
    endDate: '',
  });

  const fetchCoupons = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/coupons', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setCoupons(data.data);
      }
    } catch (err) {
      console.error('Failed to load coupons:', err);
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleToggleStatus = async (coupon: CouponItem) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...coupon,
          isActive: !coupon.isActive,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Coupon ${coupon.code} ${coupon.isActive ? 'deactivated' : 'activated'}`);
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update coupon status');
    }
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete coupon '${code}'?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/coupons?code=${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Coupon ${code} removed`);
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to delete coupon');
      }
    } catch {
      toast.error('Failed to delete coupon');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      toast.error('Coupon code is required');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        discountValue: Number(formData.discountValue),
        maxDiscountPoisha: formData.type === 'PERCENTAGE' && formData.maxDiscountBDT ? Math.round(Number(formData.maxDiscountBDT) * 100) : null,
        minOrderAmountPoisha: formData.minOrderAmountBDT ? Math.round(Number(formData.minOrderAmountBDT) * 100) : null,
        totalUsageLimit: formData.totalUsageLimit ? Number(formData.totalUsageLimit) : null,
        perCustomerUsageLimit: formData.perCustomerUsageLimit ? Number(formData.perCustomerUsageLimit) : 1,
        isFirstOrderOnly: formData.isFirstOrderOnly,
        canReduceDelivery: formData.type === 'FREE_DELIVERY' || formData.canReduceDelivery,
        isActive: formData.isActive,
        description: formData.description.trim(),
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      };

      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Coupon ${formData.code.toUpperCase()} created successfully!`);
        setShowModal(false);
        setFormData({
          code: '',
          type: 'PERCENTAGE',
          discountValue: 10,
          maxDiscountBDT: 1000,
          minOrderAmountBDT: 2000,
          totalUsageLimit: 500,
          perCustomerUsageLimit: 1,
          isFirstOrderOnly: false,
          canReduceDelivery: false,
          isActive: true,
          description: '',
          startDate: '',
          endDate: '',
        });
        fetchCoupons();
      } else {
        toast.error(data.error || 'Failed to create coupon');
      }
    } catch {
      toast.error('Error creating coupon');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter(c => c.isActive).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.currentUsageCount || 0), 0);

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading coupon rules...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Discount Coupons & Vouchers</h1>
          <p className="text-sm text-gray-600 mt-1">Manage wholesale promotional codes, discounts, and free shipping campaigns</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm cursor-pointer self-start sm:self-auto"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Coupon
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Coupons</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{totalCoupons}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Campaigns</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{activeCoupons}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Redemptions</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{totalRedemptions}</div>
        </div>
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-700 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">Code & Type</th>
                <th className="px-5 py-3.5">Discount</th>
                <th className="px-5 py-3.5">Min Order / Cap</th>
                <th className="px-5 py-3.5">Usage / Limit</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    No discount coupons found. Click &quot;Create New Coupon&quot; to add one.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => {
                  const maxCapBDT = coupon.maxDiscountPoisha ? coupon.maxDiscountPoisha / 100 : null;
                  const minOrderBDT = coupon.minOrderAmountPoisha ? coupon.minOrderAmountPoisha / 100 : null;

                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm">
                            {coupon.code}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                            {coupon.type}
                          </span>
                        </div>
                        {coupon.description && (
                          <p className="text-xs text-gray-500 mt-1 max-w-xs truncate">{coupon.description}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {coupon.type === 'PERCENTAGE' && `${coupon.discountValue}%`}
                        {coupon.type === 'FIXED_AMOUNT' && `৳${coupon.discountValue.toLocaleString()}`}
                        {coupon.type === 'FREE_DELIVERY' && 'Free Courier'}
                      </td>
                      <td className="px-5 py-4 text-xs space-y-0.5">
                        <div>Min: {minOrderBDT ? `৳${minOrderBDT.toLocaleString()}` : 'None'}</div>
                        {maxCapBDT && <div className="text-gray-500">Cap: ৳{maxCapBDT.toLocaleString()}</div>}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <span className="font-semibold text-gray-900">{coupon.currentUsageCount ?? 0}</span>
                        <span className="text-gray-500"> / {coupon.totalUsageLimit ?? '∞'}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleStatus(coupon)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            coupon.isActive
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {coupon.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(coupon.code)}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-4">
              <h3 className="text-lg font-bold text-gray-900">Create New Coupon</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SUMMER2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e: any) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (৳)</option>
                    <option value="FREE_DELIVERY">Free Delivery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    {formData.type === 'PERCENTAGE' ? 'Discount %' : formData.type === 'FIXED_AMOUNT' ? 'Discount (৳)' : 'Waiver'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.type === 'PERCENTAGE' ? 100 : undefined}
                    disabled={formData.type === 'FREE_DELIVERY'}
                    value={formData.type === 'FREE_DELIVERY' ? 0 : formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              {formData.type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Max Discount Cap (৳) (Optional)</label>
                  <input
                    type="number"
                    value={formData.maxDiscountBDT}
                    onChange={(e) => setFormData({ ...formData, maxDiscountBDT: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Min Order Amount (৳)</label>
                  <input
                    type="number"
                    value={formData.minOrderAmountBDT}
                    onChange={(e) => setFormData({ ...formData, minOrderAmountBDT: parseFloat(e.target.value) || 0 })}
                    placeholder="e.g. 2000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    value={formData.totalUsageLimit}
                    onChange={(e) => setFormData({ ...formData, totalUsageLimit: parseInt(e.target.value) || 0 })}
                    placeholder="e.g. 500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Description / Campaign Purpose</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 10% Eid promotional discount on wholesale orders"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="firstOrderCheck"
                  checked={formData.isFirstOrderOnly}
                  onChange={(e) => setFormData({ ...formData, isFirstOrderOnly: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="firstOrderCheck" className="text-xs font-medium text-gray-700 cursor-pointer">
                  Valid for customer&apos;s first wholesale order only
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Create Coupon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
