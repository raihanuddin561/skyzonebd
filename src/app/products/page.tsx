'use client'

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import QuickQuantityGrid from '@/components/wholesale/QuickQuantityGrid';
import Pagination from '@/components/common/Pagination';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types/cart';
import { getCategoryIcon } from '@/utils/categoryIcons';

function ProductsContent() {
  const searchParams = useSearchParams();
  const { products: allProducts, loading: productsLoading, error: productsError, refetch: refetchProducts } = useProducts({ limit: 100 }); // Fetch up to 100 products
  const { categories, loading: categoriesLoading } = useCategories();
  const { user } = useAuth();
  const { addBulkToCart } = useCart();
  
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'wholesale'>('grid');
  const productsPerPage = 12;

  // Load view mode preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedViewMode = localStorage.getItem('productsViewMode');
      if (savedViewMode === 'wholesale' && user?.userType === 'WHOLESALE') {
        setViewMode('wholesale');
      }
    }
  }, [user]);

  // Save view mode preference to localStorage
  const handleViewModeChange = (mode: 'grid' | 'wholesale') => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('productsViewMode', mode);
    }
  };

  // Read category from URL on mount
  useEffect(() => {
    const categoryFromUrl = searchParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [searchParams]);

  // Filter and sort products
  useEffect(() => {
    if (!allProducts || productsLoading) return;
    
    let products = [...allProducts];

    // Search filter
    if (searchQuery) {
      products = products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter - compare by category name since API returns category as string name
    if (selectedCategory !== 'all') {
      // Find the category name from the selected category ID
      const selectedCat = categories.find(cat => cat.id === selectedCategory);
      const categoryNameToMatch = selectedCat?.name || selectedCategory;
      products = products.filter(product => product.category === categoryNameToMatch);
    }

    // Price range filter
    products = products.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Sort products
    products.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'newest':
          return new Date(b.createdAt || '2024-01-01').getTime() - new Date(a.createdAt || '2024-01-01').getTime();
        default:
          return 0;
      }
    });

    setFilteredProducts(products);
    setCurrentPage(1);
  }, [allProducts, productsLoading, searchQuery, selectedCategory, sortBy, priceRange, categories]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const displayedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);

  const handlePriceRangeChange = (min: number, max: number) => {
    setPriceRange([min, max]);
  };

  // Show loading state
  if (productsLoading || categoriesLoading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white py-8 sm:py-12 lg:py-16 overflow-hidden">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Wholesale Catalog
          </span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">
            Explore Our Products
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-4 sm:mb-6">
            Discover quality products from verified suppliers
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products, categories, or companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pl-10 sm:pl-12 rounded-xl text-gray-900 shadow-lg focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-text text-sm sm:text-base"
                suppressHydrationWarning
              />
              <svg className="absolute left-3 sm:left-4 top-2.5 sm:top-3.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            {/* Mobile Filter Toggle */}
            <div className="lg:hidden mb-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors touch-manipulation"
                suppressHydrationWarning
              >
                <span className="flex items-center gap-2 font-semibold text-gray-900">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters
                </span>
                <svg className={`w-5 h-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className={`bg-white rounded-xl shadow-lg border border-gray-100 p-4 sm:p-5 lg:p-6 lg:sticky lg:top-4 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Filters</h2>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setPriceRange([0, 50000]);
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium touch-manipulation"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-6 sm:space-y-8">
                {/* Category Filter */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-200">Categories</h3>
                  <div className="space-y-2 sm:space-y-3 max-h-[300px] overflow-y-auto">
                    <label className="flex items-center p-2 sm:p-3 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200 touch-manipulation">
                      <input
                        type="radio"
                        name="category"
                        value="all"
                        checked={selectedCategory === 'all'}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="mr-2 sm:mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer flex-shrink-0"
                        suppressHydrationWarning
                      />
                      <span className="text-sm sm:text-base font-semibold text-gray-700 flex-1 truncate">All Categories</span>
                      <span className="bg-blue-100 text-blue-800 text-xs sm:text-sm font-medium px-2 py-1 rounded-full flex-shrink-0">
                        {allProducts?.length || 0}
                      </span>
                    </label>
                    {categories.map(category => {
                      const count = allProducts?.filter((p: Product) => p.category === category.name).length || 0;
                      const isSelected = selectedCategory === category.id;
                      return (
                        <label
                          key={category.id}
                          className={`flex items-center p-2 sm:p-3 rounded-lg cursor-pointer transition-colors border touch-manipulation ${
                            isSelected ? 'bg-blue-50 border-blue-300' : 'border-transparent hover:bg-blue-50 hover:border-blue-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="category"
                            value={category.id}
                            checked={isSelected}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="mr-2 sm:mr-3 w-4 h-4 text-blue-600 focus:ring-blue-500 focus:ring-2 cursor-pointer flex-shrink-0"
                            suppressHydrationWarning
                          />
                          <span className="text-xl sm:text-2xl mr-2 sm:mr-3 flex-shrink-0">{category.icon || getCategoryIcon(category.name)}</span>
                          <span className={`text-sm sm:text-base font-medium flex-1 truncate ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>{category.name}</span>
                          <span className={`text-xs sm:text-sm font-medium px-2 py-1 rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {count}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-200">Price Range</h3>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex gap-2 sm:gap-3">
                      <div className="flex-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Min Price</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={priceRange[0]}
                          onChange={(e) => handlePriceRangeChange(Number(e.target.value), priceRange[1])}
                          className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 font-medium cursor-text text-sm sm:text-base"
                          suppressHydrationWarning
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Max Price</label>
                        <input
                          type="number"
                          placeholder="50000"
                          value={priceRange[1]}
                          onChange={(e) => handlePriceRangeChange(priceRange[0], Number(e.target.value))}
                          className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 font-medium cursor-text text-sm sm:text-base"
                          suppressHydrationWarning
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setPriceRange([0, 1000])}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all cursor-pointer touch-manipulation"
                        suppressHydrationWarning
                      >
                        ৳0 - ৳1,000
                      </button>
                      <button
                        onClick={() => setPriceRange([1000, 5000])}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all cursor-pointer touch-manipulation"
                        suppressHydrationWarning
                      >
                        ৳1,000 - ৳5,000
                      </button>
                      <button
                        onClick={() => setPriceRange([5000, 50000])}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all cursor-pointer touch-manipulation"
                        suppressHydrationWarning
                      >
                        ৳5,000+
                      </button>
                    </div>
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setPriceRange([0, 50000]);
                    setSortBy('name');
                  }}
                  className="w-full py-3 text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 font-semibold rounded-lg transition-all shadow-md hover:shadow-lg cursor-pointer"
                  suppressHydrationWarning
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="lg:w-3/4">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1.5">
                  {selectedCategory === 'all' ? 'All Products' :
                   categories.find(c => c.id === selectedCategory)?.name || 'Products'}
                </h2>
                <p className="text-gray-500 font-medium text-sm">
                  Showing {startIndex + 1}-{Math.min(startIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-4 sm:mt-0">
                {/* View Mode Toggle - Only for wholesale users */}
                {user?.userType === 'WHOLESALE' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">View:</label>
                    <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => handleViewModeChange('grid')}
                        className={`px-4 py-2 font-medium transition-colors ${
                          viewMode === 'grid'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        Grid
                      </button>
                      <button
                        onClick={() => handleViewModeChange('wholesale')}
                        className={`px-4 py-2 font-medium transition-colors ${
                          viewMode === 'wholesale'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Wholesale
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Sort Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 font-medium bg-white min-w-[200px] cursor-pointer"
                    suppressHydrationWarning
                  >
                    <option value="name">Name (A-Z)</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="newest">Newest First</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Products Display - Grid or Wholesale View */}
            {productsError ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 rounded-full bg-red-50 text-red-400 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">Couldn&apos;t load products</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Something went wrong while loading the catalog. Please check your connection and try again.
                </p>
                <button
                  onClick={() => refetchProducts()}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : displayedProducts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3">No products found</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  We couldn't find any products matching your criteria. Try adjusting your search or filter settings.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchQuery('');
                    setPriceRange([0, 50000]);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                  suppressHydrationWarning
                >
                  Clear All Filters
                </button>
              </div>
            ) : viewMode === 'wholesale' && user?.userType === 'WHOLESALE' ? (
              // Wholesale Quick Order Grid
              <QuickQuantityGrid 
                products={displayedProducts}
                onBulkAdd={addBulkToCart}
                userType={user.userType}
              />
            ) : (
              // Standard Grid View
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedProducts.map(product => (
                  <div key={product.id} className="group">
                    <ProductCard product={product} />
                    <Link
                      href={`/products/${product.id}`}
                      className="block mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      View Details →
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <div className="mt-12">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}
