'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  category: string;
  price: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  lastUpdated: string;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Stock changes are an audited event (who, why, at what cost when adding),
  // not a bare quantity to overwrite via a browser prompt() — matches the
  // richer modal already used on the product edit page, same backend route.
  const [stockModal, setStockModal] = useState<{
    isOpen: boolean;
    item: InventoryItem | null;
    type: 'add' | 'remove' | 'set';
    quantity: string;
    costPerUnit: string;
    reason: string;
  }>({ isOpen: false, item: null, type: 'add', quantity: '', costPerUnit: '', reason: '' });
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  const openStockModal = (item: InventoryItem) => {
    setStockModal({ isOpen: true, item, type: 'add', quantity: '', costPerUnit: '', reason: '' });
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Single source of truth for turning a stock quantity into a status badge
  // so the primary (/api/admin/inventory) and fallback (/api/products) data
  // paths can never disagree with each other.
  const deriveStockStatus = (
    stockQuantity: number,
    apiStatus?: string
  ): InventoryItem['status'] => {
    if (apiStatus) {
      // Trust the server's own status field — /api/admin/inventory already
      // computes this using the canonical thresholds (<=10 low, <=5
      // critical, 0 out of stock).
      if (apiStatus === 'Out of Stock') return 'out_of_stock';
      if (apiStatus === 'Low Stock' || apiStatus === 'Critical') return 'low_stock';
      return 'in_stock';
    }
    // Last-resort approximation for the fallback path, which has no
    // server-computed status field to trust. Mirrors the same thresholds
    // used server-side in /api/admin/inventory rather than inventing
    // different cutoffs that would make the two paths disagree.
    if (stockQuantity <= 0) return 'out_of_stock';
    if (stockQuantity <= 10) return 'low_stock';
    return 'in_stock';
  };

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/inventory', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.status === 401) {
        // Expired/missing session — match the pattern used elsewhere in the
        // admin panel (see admin/orders/page.tsx): clear the stale token and
        // send the user to login instead of silently falling through to an
        // unauthenticated fallback fetch.
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.products) {
          // Map API response to component's expected format
          const mappedInventory = data.data.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock: p.stock || 0,
            minStock: 10, // Default min stock
            maxStock: 1000, // Default max stock
            category: p.category || 'Uncategorized',
            price: p.price || 0,
            status: deriveStockStatus(p.stock || 0, p.status),
            lastUpdated: p.lastUpdated || new Date().toISOString()
          }));
          setInventory(mappedInventory);
        }
      } else {
        // Fallback for other non-2xx cases (e.g. a genuine 500 from the
        // inventory endpoint). /api/products always returns
        // { success, data: { products: [...] } } — never a bare array — so
        // guard the shape instead of assuming it and calling .map blindly.
        const productsResponse = await fetch('/api/products');
        const productsData = productsResponse.ok ? await productsResponse.json() : null;
        const productsList = Array.isArray(productsData?.data?.products)
          ? productsData.data.products
          : [];
        const mappedInventory = productsList.map((p: any) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          currentStock: p.stockQuantity || 0,
          minStock: p.minOrderQuantity || 10,
          maxStock: 1000,
          category: p.category || 'Uncategorized',
          price: p.wholesalePrice || p.price || 0,
          status: deriveStockStatus(p.stockQuantity || 0),
          lastUpdated: p.updatedAt || new Date().toISOString()
        }));
        setInventory(mappedInventory);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!stockModal.item) return;
    const quantity = parseInt(stockModal.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (!stockModal.reason || stockModal.reason.trim().length < 5) {
      toast.error('Reason is required and must be at least 5 characters');
      return;
    }

    let costPerUnit: number | undefined;
    if (stockModal.type === 'add') {
      // Adding stock is a purchase — its cost must be recorded so this
      // batch feeds accurate weighted-average-cost for future sales,
      // instead of just bumping the quantity number with no cost basis.
      costPerUnit = parseFloat(stockModal.costPerUnit);
      if (!Number.isFinite(costPerUnit) || costPerUnit <= 0) {
        toast.error('Enter the cost per unit for this purchase');
        return;
      }
    }

    setIsAdjustingStock(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/stock/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: stockModal.item.id,
          adjustmentType: stockModal.type,
          quantity,
          reason: stockModal.reason.trim(),
          ...(costPerUnit !== undefined && { costPerUnit }),
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(`Stock updated: ${result.previousStock} → ${result.newStock} units`);
        setStockModal({ isOpen: false, item: null, type: 'add', quantity: '', costPerUnit: '', reason: '' });
        fetchInventory();
      } else {
        toast.error(result.error || (result.details ? result.details.join(', ') : 'Failed to adjust stock'));
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setIsAdjustingStock(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: inventory.length,
    lowStock: inventory.filter(i => i.status === 'low_stock').length,
    outOfStock: inventory.filter(i => i.status === 'out_of_stock').length,
    totalValue: inventory.reduce((sum, item) => sum + (item.currentStock * item.price), 0)
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      in_stock: 'bg-green-100 text-green-800',
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800'
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage product stock levels</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base whitespace-nowrap"
        >
          + Add Product
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Products</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Low Stock</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-red-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Out of Stock</div>
          <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.outOfStock}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Value</div>
          <div className="text-lg sm:text-xl font-bold text-blue-600">৳{stats.totalValue.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base"
          />
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All' },
              { value: 'low_stock', label: 'Low Stock' },
              { value: 'out_of_stock', label: 'Out of Stock' }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value as typeof filter)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Mobile View */}
        <div className="block lg:hidden divide-y divide-gray-200">
          {filteredInventory.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No products found</p>
            </div>
          ) : (
            filteredInventory.map((item) => (
              <div key={item.id} className="p-3 sm:p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
                    <p className="text-xs text-gray-600">SKU: {item.sku}</p>
                    <p className="text-xs text-gray-600">Category: {item.category}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <div className="text-xs text-gray-600">Current Stock</div>
                    <div className="text-sm font-semibold text-gray-900">{item.currentStock} units</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Min Stock</div>
                    <div className="text-sm font-semibold text-gray-900">{item.minStock} units</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Link
                    href={`/admin/products/${item.id}/edit`}
                    className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs text-center hover:bg-blue-700"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => openStockModal(item)}
                    className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300"
                  >
                    Update Stock
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{item.currentStock}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.minStock}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/products/${item.id}/edit`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => openStockModal(item)}
                          className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                        >
                          Update
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Stock Modal — same shape/endpoint as the product edit page's
          modal, so every stock change across the admin panel behaves
          identically: adding stock always requires a real cost per unit. */}
      {stockModal.isOpen && stockModal.item && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isAdjustingStock) setStockModal({ ...stockModal, isOpen: false }); }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Adjust Stock</h3>
            <p className="text-sm text-gray-600 mb-4">
              {stockModal.item.name} — current stock: <span className="font-semibold">{stockModal.item.currentStock} units</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['add', 'remove', 'set'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setStockModal({ ...stockModal, type })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                        stockModal.type === type
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type === 'add' ? 'Add' : type === 'remove' ? 'Remove' : 'Set To'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {stockModal.type === 'set' ? 'New Stock Quantity' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockModal.quantity}
                  onChange={(e) => setStockModal({ ...stockModal, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 50"
                  autoFocus
                />
              </div>

              {stockModal.type === 'add' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cost per Unit (৳) *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={stockModal.costPerUnit}
                    onChange={(e) => setStockModal({ ...stockModal, costPerUnit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 120.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    What you actually paid per unit for this batch — recorded as a stock lot so future profit reports use the real cost, not a guess.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <input
                  type="text"
                  value={stockModal.reason}
                  onChange={(e) => setStockModal({ ...stockModal, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Received new shipment from supplier"
                />
                <p className="text-xs text-gray-500 mt-1">At least 5 characters. Recorded in the inventory audit log.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStockModal({ ...stockModal, isOpen: false })}
                disabled={isAdjustingStock}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustStock}
                disabled={isAdjustingStock || !stockModal.quantity || (stockModal.type === 'add' && !stockModal.costPerUnit)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isAdjustingStock ? 'Saving...' : 'Confirm Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
