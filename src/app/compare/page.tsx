'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import { dataService } from '@/services/dataService';
import { Product } from '@/types/cart';

export default function ComparePage() {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load popular products
    const fetchPopularProducts = async () => {
      try {
        const data = await dataService.products.getFeatured();
        setPopularProducts((data as Product[]).slice(0, 8));
      } catch (error) {
        console.error('Error loading popular products:', error);
      }
    };
    fetchPopularProducts();
  }, []);

  const handleAddProduct = async () => {
    if (productId && selectedProducts.length < 3) {
      try {
        setLoading(true);
        const product = await dataService.products.getById(parseInt(productId));
        if (product && !selectedProducts.find(p => p.id === (product as Product).id)) {
          setSelectedProducts([...selectedProducts, product as Product]);
          setProductId('');
          alert('Product added to comparison');
        } else if (!product) {
          alert('Product not found');
        } else {
          alert('Product already added');
        }
      } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveProduct = (id: string | number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };

  const comparisonAttributes = [
    { key: 'price', label: 'Price', format: (value: any) => `৳${value.toLocaleString()}` },
    { key: 'minOrderQuantity', label: 'Min Order Qty', format: (value: any) => `${value} units` },
    { key: 'brand', label: 'Brand', format: (value: any) => value || 'N/A' },
    { key: 'rating', label: 'Rating', format: (value: any) => value ? `${value}/5` : 'N/A' },
    { key: 'stock', label: 'Stock', format: (value: any) => value ? `${value} units` : 'N/A' },
    { key: 'warranty', label: 'Warranty', format: (value: any) => value || 'N/A' },
    { key: 'leadTime', label: 'Lead Time', format: (value: any) => value || 'N/A' },
    { key: 'companyName', label: 'Seller', format: (value: any) => value },
    { key: 'companyVerified', label: 'Verified Seller', format: (value: any) => value ? 'Yes' : 'No' },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-900">Compare Products</h1>
          <p className="text-sm sm:text-base text-gray-600">Compare up to 3 products side by side</p>
        </div>

        {/* Add Product Section */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">Add Products to Compare</h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="number"
              placeholder="Enter Product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
            <button
              onClick={handleAddProduct}
              disabled={!productId || selectedProducts.length >= 3}
              className="px-4 sm:px-6 py-2.5 sm:py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap touch-manipulation font-medium text-sm sm:text-base"
            >
              Add Product
            </button>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">
            You can compare up to 3 products. ({selectedProducts.length}/3 selected)
          </p>
        </div>

        {/* Comparison Table */}
        {selectedProducts.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Mobile Card View */}
            <div className="lg:hidden">
              {selectedProducts.map((product, index) => (
                <div key={product.id} className="p-4 border-b last:border-b-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2 mb-1">{product.name}</h3>
                        <Link
                          href={`/products/${product.id}`}
                          className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveProduct(product.id)}
                      className="w-8 h-8 bg-red-500 text-white rounded-full text-sm hover:bg-red-600 flex items-center justify-center flex-shrink-0 ml-2 touch-manipulation"
                      aria-label="Remove product"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {comparisonAttributes.map((attr) => (
                      <div key={attr.key} className="flex justify-between text-xs sm:text-sm py-1.5 border-t">
                        <span className="text-gray-600 font-medium">{attr.label}:</span>
                        <span className="text-gray-900 font-semibold text-right">
                          {attr.format((product as any)[attr.key])}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-semibold">Product</th>
                    {selectedProducts.map(product => (
                      <th key={product.id} className="text-center p-4 w-[250px]">
                        <div className="relative">
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            width={100}
                            height={100}
                            className="w-20 h-20 object-cover rounded mx-auto mb-2"
                          />
                          <h3 className="font-medium text-sm">{product.name}</h3>
                          <Link
                            href={`/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            View Details
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonAttributes.map((attr, index) => (
                    <tr key={attr.key} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="p-4 font-medium">{attr.label}</td>
                      {selectedProducts.map(product => (
                        <td key={product.id} className="p-4 text-center">
                          {attr.format((product as any)[attr.key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">No Products Selected</h3>
            <p className="text-gray-600">
              Add products using their IDs to start comparing
            </p>
          </div>
        )}

        {/* Quick Add Popular Products */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Popular Products</h3>
          {loading && popularProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {popularProducts.map(product => {
                const isSelected = selectedProducts.find(p => p.id === product.id);
                const canAdd = selectedProducts.length < 3 && !isSelected;
                
                return (
                  <div key={product.id} className="border rounded-lg p-3">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={80}
                      height={80}
                      className="w-16 h-16 object-cover rounded mx-auto mb-2"
                    />
                    <h4 className="font-medium text-sm text-center mb-1">{product.name}</h4>
                    <p className="text-xs text-gray-500 text-center mb-2">ID: {product.id}</p>
                    <button
                      onClick={() => {
                        if (canAdd) {
                          setSelectedProducts([...selectedProducts, product]);
                        }
                      }}
                      disabled={!canAdd}
                      className={`w-full py-1 px-2 rounded text-xs ${
                        isSelected
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : canAdd
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSelected ? 'Added' : 'Add to Compare'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
