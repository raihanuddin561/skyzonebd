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

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/inventory');
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setInventory(data.data);
        }
      } else {
        // Fallback to products API
        const productsResponse = await fetch('/api/products');
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          const mappedInventory = productsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            sku: p.sku,
            currentStock: p.stockQuantity || 0,
            minStock: p.minOrderQuantity || 10,
            maxStock: 1000,
            category: p.category?.name || 'Uncategorized',
            price: p.sellingPrice || 0,
            status: p.stockQuantity > 20 ? 'in_stock' : p.stockQuantity > 0 ? 'low_stock' : 'out_of_stock',
            lastUpdated: p.updatedAt || new Date().toISOString()
          }));
          setInventory(mappedInventory);
        }
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleStockUpdate = async (productId: string, newStock: number) => {
    try {
      const response = await fetch(`/api/admin/inventory/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });

      if (response.ok) {
        toast.success('Stock updated successfully');
        fetchInventory();
      } else {
        toast.error('Failed to update stock');
      }
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Failed to update stock');
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
                    onClick={() => {
                      const newStock = prompt('Enter new stock quantity:', item.currentStock.toString());
                      if (newStock !== null) {
                        handleStockUpdate(item.id, parseInt(newStock));
                      }
                    }}
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
                          onClick={() => {
                            const newStock = prompt('Enter new stock quantity:', item.currentStock.toString());
                            if (newStock !== null) {
                              handleStockUpdate(item.id, parseInt(newStock));
                            }
                          }}
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
    </div>
  );
}
