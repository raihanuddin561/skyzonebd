'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  image: string;
  featured: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; productId: string | null; productName: string }>({ 
    isOpen: false, 
    productId: null, 
    productName: '' 
  });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [deactivateDialog, setDeactivateDialog] = useState<{ isOpen: boolean; productId: string | null; productName: string; isActive: boolean }>({ 
    isOpen: false, 
    productId: null, 
    productName: '', 
    isActive: true 
  });
  const productsPerPage = 12;

  useEffect(() => {
    fetchProducts();
  }, [currentPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/products?page=${currentPage}&limit=${productsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        const transformedProducts = result.data.products.map((product: any) => ({
          id: product.id.toString(),
          name: product.name,
          sku: product.sku || 'N/A',
          category: product.category?.name || 'Uncategorized',
          price: product.wholesalePrice || product.price || 0,
          stock: product.stockQuantity || 0,
          availability: product.stockQuantity > 20 ? 'in_stock' : product.stockQuantity > 0 ? 'limited' : 'out_of_stock',
          image: product.imageUrl || '/images/placeholder.jpg',
          featured: product.isFeatured || false,
          isActive: product.isActive !== false,
          createdAt: product.createdAt || new Date().toISOString(),
        }));
        
        setProducts(transformedProducts);
        // Get total from pagination object
        const total = result.data.pagination?.total || result.data.total || 0;
        setTotalProducts(total);
        setTotalPages(result.data.pagination?.totalPages || Math.ceil(total / productsPerPage));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityBadge = (availability: string) => {
    const badges: { [key: string]: { class: string; text: string } } = {
      in_stock: { class: 'bg-green-100 text-green-800', text: 'In Stock' },
      limited: { class: 'bg-yellow-100 text-yellow-800', text: 'Limited' },
      out_of_stock: { class: 'bg-red-100 text-red-800', text: 'Out of Stock' },
    };
    return badges[availability] || badges.in_stock;
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map(p => p.id));
    }
  };

  const handleSelectProduct = (id: string) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(pid => pid !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleteDialog(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const idsParam = selectedProducts.join(',');
      
      const response = await fetch(`/api/products?ids=${idsParam}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Successfully deleted ${result.data.deletedCount || result.count} products`);
        setBulkDeleteDialog(false);
        setSelectedProducts([]);
        fetchProducts(); // Refresh the list
      } else {
        toast.error('Failed to delete products: ' + (result.message || result.error));
        setBulkDeleteDialog(false);
      }
    } catch (error) {
      console.error('Error deleting products:', error);
      toast.error('Failed to delete products');
      setBulkDeleteDialog(false);
    }
  };

  const handleDelete = async (productId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Product deleted successfully');
        setDeleteDialog({ isOpen: false, productId: null, productName: '' });
        fetchProducts(); // Refresh the list
      } else {
        // Show all error information
        const errorMsg = result.message || result.error || 'Failed to delete product';
        toast.error(errorMsg, { autoClose: 5000 });
        if (result.suggestion) {
          setTimeout(() => {
            toast.info(result.suggestion, { autoClose: 7000 });
          }, 500);
        }
        setDeleteDialog({ isOpen: false, productId: null, productName: '' });
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    }
  };

  const handleDeactivate = async (productId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Product ${!isActive ? 'activated' : 'deactivated'} successfully`);
        setDeactivateDialog({ isOpen: false, productId: null, productName: '', isActive: true });
        fetchProducts(); // Refresh the list
      } else {
        const errorMsg = result.message || result.error || 'Failed to update product status';
        toast.error(errorMsg);
        setDeactivateDialog({ isOpen: false, productId: null, productName: '', isActive: true });
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Failed to update product status');
      setDeactivateDialog({ isOpen: false, productId: null, productName: '', isActive: true });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Products Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your product catalog, pricing, and inventory</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap touch-manipulation flex-shrink-0"
        >
          <span>+</span>
          <span>Add Product</span>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="sm:col-span-2">
            <input
              type="text"
              placeholder="Search products by name, SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
          <div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="all">All Categories</option>
              <option value="electronics">Electronics</option>
              <option value="baby-items">Baby Items</option>
              <option value="clothing">Clothing</option>
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="all">All Status</option>
              <option value="in_stock">In Stock</option>
              <option value="limited">Limited Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedProducts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <span className="text-sm font-medium text-blue-900">
              {selectedProducts.length} product(s) selected
            </span>
            <div className="flex gap-2">
              <button className="flex-1 sm:flex-none px-3 py-2 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm font-medium touch-manipulation">
                Export
              </button>
              <button className="flex-1 sm:flex-none px-3 py-2 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 text-sm font-medium touch-manipulation">
                Edit
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 sm:flex-none px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium touch-manipulation"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table/Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-gray-600 text-sm">Loading products...</p>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="text-gray-300 text-5xl sm:text-6xl mb-4">📦</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4">Start by adding your first product to the catalog.</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base font-medium"
            >
              <span>+</span>
              <span>Add Product</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedProducts.length === products.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 touch-manipulation"
                  />
                  <span>Select All</span>
                </label>
                <span className="text-sm text-gray-600">{products.length} products</span>
              </div>
              
              {products.map((product) => (
                <div key={product.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => handleSelectProduct(product.id)}
                      className="mt-1 rounded border-gray-300 flex-shrink-0 touch-manipulation"
                    />
                    
                    {/* Product Image */}
                    <Image
                      src={product.image}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                    />
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm sm:text-base line-clamp-2 mb-1">
                            {product.name}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            {product.featured && (
                              <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                                ⭐ Featured
                              </span>
                            )}
                            {!product.isActive && (
                              <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                👁️‍🗨️ Hidden
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${getAvailabilityBadge(product.availability).class}`}>
                          {getAvailabilityBadge(product.availability).text}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm mb-3">
                        <div>
                          <span className="text-gray-500">SKU:</span>
                          <span className="ml-1 text-gray-900 font-medium">{product.sku}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Stock:</span>
                          <span className="ml-1 text-gray-900 font-medium">{product.stock}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-1 text-gray-900">{product.category}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-base sm:text-lg font-bold text-gray-900">
                          ৳{product.price.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs sm:text-sm rounded-lg hover:bg-blue-700 font-medium touch-manipulation transition-colors shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Link>
                          <button 
                            onClick={() => setDeactivateDialog({ isOpen: true, productId: product.id, productName: product.name, isActive: product.isActive })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs sm:text-sm rounded-lg font-medium touch-manipulation transition-all shadow-sm ${
                              product.isActive 
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                            }`}
                          >
                            {product.isActive ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Hide
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Show
                              </>
                            )}
                          </button>
                          <button 
                            onClick={() => setDeleteDialog({ isOpen: true, productId: product.id, productName: product.name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs sm:text-sm rounded-lg font-medium touch-manipulation transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedProducts.length === products.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => handleSelectProduct(product.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={50}
                            height={50}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {product.featured && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
                                  ⭐ Featured
                                </span>
                              )}
                              {!product.isActive && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                  👁️‍🗨️ Hidden
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.sku}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.category}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        ৳{product.price.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{product.stock}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAvailabilityBadge(product.availability).class}`}>
                          {getAvailabilityBadge(product.availability).text}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Link>
                          <button 
                            onClick={() => setDeactivateDialog({ isOpen: true, productId: product.id, productName: product.name, isActive: product.isActive })}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-xs rounded-lg font-medium transition-all shadow-sm ${
                              product.isActive 
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700' 
                                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                            }`}
                          >
                            {product.isActive ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                Hide
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Show
                              </>
                            )}
                          </button>
                          <button 
                            onClick={() => setDeleteDialog({ isOpen: true, productId: product.id, productName: product.name })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs rounded-lg font-medium transition-all shadow-sm"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination */}
        {!loading && products.length > 0 && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-gray-600">
                Showing {((currentPage - 1) * productsPerPage) + 1} to {Math.min(currentPage * productsPerPage, totalProducts)} of {totalProducts} products
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 border rounded text-xs sm:text-sm font-medium touch-manipulation ${
                    currentPage === 1 
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded text-xs sm:text-sm font-medium ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white' 
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 border rounded text-xs sm:text-sm font-medium touch-manipulation ${
                    currentPage === totalPages 
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'border-gray-300 hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, productId: null, productName: '' })}
        onConfirm={() => deleteDialog.productId && handleDelete(deleteDialog.productId)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteDialog.productName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteDialog}
        onClose={() => setBulkDeleteDialog(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Multiple Products"
        message={`Are you sure you want to delete ${selectedProducts.length} product(s)? This action cannot be undone and will permanently remove these products from your store.`}
        confirmText={`Delete ${selectedProducts.length} Products`}
        cancelText="Cancel"
        type="danger"
      />

      {/* Deactivate/Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deactivateDialog.isOpen}
        onClose={() => setDeactivateDialog({ isOpen: false, productId: null, productName: '', isActive: true })}
        onConfirm={() => deactivateDialog.productId && handleDeactivate(deactivateDialog.productId, deactivateDialog.isActive)}
        title={deactivateDialog.isActive ? 'Deactivate Product' : 'Activate Product'}
        message={deactivateDialog.isActive 
          ? `Are you sure you want to deactivate "${deactivateDialog.productName}"? The product will be hidden from customers but will remain in the system for order history.`
          : `Are you sure you want to activate "${deactivateDialog.productName}"? The product will become visible to customers again.`
        }
        confirmText={deactivateDialog.isActive ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        type={deactivateDialog.isActive ? 'warning' : 'info'}
      />
    </div>
  );
}
