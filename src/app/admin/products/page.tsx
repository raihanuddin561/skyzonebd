'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

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
  createdAt: string;
}

export default function ProductsManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/products', {
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
          price: product.retailPrice || product.price || 0,
          stock: product.stockQuantity || 0,
          availability: product.stockQuantity > 20 ? 'in_stock' : product.stockQuantity > 0 ? 'limited' : 'out_of_stock',
          image: product.imageUrl || '/images/placeholder.jpg',
          featured: product.isFeatured || false,
          createdAt: product.createdAt || new Date().toISOString(),
        }));
        
        setProducts(transformedProducts);
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
    if (!confirm(`Delete ${selectedProducts.length} products? This action cannot be undone.`)) {
      return;
    }

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
        alert(`Successfully deleted ${result.data.deletedCount} products`);
        setSelectedProducts([]);
        fetchProducts(); // Refresh the list
      } else {
        alert('Failed to delete products: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting products:', error);
      alert('Failed to delete products');
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Delete this product? This action cannot be undone.')) {
      return;
    }

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
        alert('Product deleted successfully');
        fetchProducts(); // Refresh the list
      } else {
        alert('Failed to delete product: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
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
                          {product.featured && (
                            <span className="inline-block text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded mb-1">
                              Featured
                            </span>
                          )}
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
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs sm:text-sm rounded hover:bg-blue-700 font-medium touch-manipulation"
                          >
                            Edit
                          </Link>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="px-3 py-1.5 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700 font-medium touch-manipulation"
                          >
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
                            {product.featured && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Featured
                              </span>
                            )}
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
                            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          >
                            Edit
                          </Link>
                          <button 
                            onClick={() => handleDelete(product.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
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
                Showing 1 to {products.length} of {products.length} products
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm font-medium touch-manipulation">
                  Previous
                </button>
                <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs sm:text-sm font-medium">1</button>
                <button className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm font-medium touch-manipulation">2</button>
                <button className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 text-xs sm:text-sm font-medium touch-manipulation">
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
