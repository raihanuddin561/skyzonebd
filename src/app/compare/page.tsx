'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { dataService } from '@/services/dataService';
import { Product } from '@/types/cart';
import { toast } from 'react-toastify';

export default function ComparePage() {
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<string>('');
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularError, setPopularError] = useState(false);

  useEffect(() => {
    // Load popular products
    const fetchPopularProducts = async () => {
      setPopularLoading(true);
      setPopularError(false);
      try {
        const data = await dataService.products.getFeatured();
        setPopularProducts((data as Product[]).slice(0, 8));
      } catch (error) {
        console.error('Error loading popular products:', error);
        setPopularError(true);
      } finally {
        setPopularLoading(false);
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
          toast.success('Product added to comparison');
        } else if (!product) {
          toast.error('Product not found');
        } else {
          toast.info('Product already added');
        }
      } catch (error) {
        console.error('Error adding product:', error);
        toast.error('Failed to add product');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveProduct = (id: string | number) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id));
  };

  const comparisonAttributes = [
    { key: 'price', label: 'Price', format: (value: any) => `৳${(typeof value === 'number' ? value : 0).toLocaleString()}` },
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

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white py-8 sm:py-10 lg:py-12 overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 15% 25%, white 1px, transparent 1px), radial-gradient(circle at 85% 75%, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-300 mb-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Comparison Tool
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3">
            Compare Products
          </h1>
          <p className="text-base sm:text-lg text-blue-100">
            Compare up to 3 products side by side to find the best fit
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Add Product Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-900">Add Products to Compare</h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="number"
              placeholder="Enter Product ID"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
            />
            <button
              onClick={handleAddProduct}
              disabled={!productId || selectedProducts.length >= 3}
              className="px-4 sm:px-6 py-2.5 sm:py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-md disabled:cursor-not-allowed whitespace-nowrap touch-manipulation transition-all text-sm sm:text-base"
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
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
                      className="w-8 h-8 bg-white border border-gray-200 text-red-500 rounded-full text-sm shadow-sm hover:bg-red-50 hover:border-red-200 flex items-center justify-center flex-shrink-0 ml-2 touch-manipulation transition-colors"
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
                            className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-gray-200 text-red-500 rounded-full text-xs shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
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
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-3">No Products Selected</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Add products using their IDs above to start comparing, or pick from the popular products below.
            </p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Browse Products
            </Link>
          </div>
        )}

        {/* Quick Add Popular Products */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Popular Products</h3>
          {popularLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : popularError ? (
            <p className="text-center py-8 text-gray-500">Couldn&apos;t load popular products right now. Please try again later.</p>
          ) : popularProducts.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No popular products to show yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {popularProducts.map(product => {
                const isSelected = selectedProducts.find(p => p.id === product.id);
                const canAdd = selectedProducts.length < 3 && !isSelected;

                return (
                  <div key={product.id} className="card-hover border border-gray-100 rounded-xl p-3 bg-white shadow-sm hover:border-blue-200">
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
                      className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : canAdd
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-sm hover:shadow-md'
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

      <Footer />
    </main>
  );
}
