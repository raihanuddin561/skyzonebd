'use client'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProductCard from '../components/ProductCard';
import { useProductSearch } from '@/hooks/useProducts';
import { usePopularSearches } from '@/hooks/useSearch';
import { Product } from '@/types/cart';
import Pagination from '@/components/common/Pagination';

// Popular Searches Component
function PopularSearches() {
  const { searches, loading } = usePopularSearches();

  if (loading) {
    return (
      <div className="mt-16 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Popular Searches</h3>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-8 w-24 bg-gray-200 rounded-full animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!searches || searches.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Popular Searches</h3>
      <div className="flex flex-wrap gap-2">
        {searches.map(term => (
          <Link
            key={term}
            href={`/search?q=${encodeURIComponent(term)}`}
            className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 text-sm font-medium transition-colors"
          >
            {term}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { products: searchResults, loading, error: searchError } = useProductSearch(query);
  const [sortedResults, setSortedResults] = useState<Product[]>([]);
  const [sortBy, setSortBy] = useState<string>('relevance');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const productsPerPage = 12;

  useEffect(() => {
    if (!loading && searchResults) {
      let results = [...searchResults];
      
      // Sort results
      if (sortBy !== 'relevance') {
        results.sort((a, b) => {
          switch (sortBy) {
            case 'name':
              return a.name.localeCompare(b.name);
            case 'price-low':
              return a.price - b.price;
            case 'price-high':
              return b.price - a.price;
            case 'rating':
              return (b.rating || 0) - (a.rating || 0);
            default:
              return 0;
          }
        });
      }
      
      setSortedResults(results);
    }
    setCurrentPage(1);
  }, [searchResults, loading, sortBy]);

  // Pagination
  const totalPages = Math.ceil(sortedResults.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const displayedProducts = sortedResults.slice(startIndex, startIndex + productsPerPage);

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Search Header */}
      <div className="bg-white py-6 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1.5 text-gray-900">
                Search Results {query && `for "${query}"`}
              </h1>
              <p className="text-gray-500">
                {loading ? 'Searching...' : `${sortedResults.length} products found`}
              </p>
            </div>

            {/* Sort Dropdown */}
            {!loading && sortedResults.length > 0 && (
              <div className="mt-4 sm:mt-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="relevance">Sort by Relevance</option>
                  <option value="name">Sort by Name</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* No Query State */}
        {!query && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Start your search</h2>
            <p className="text-gray-500 mb-6">
              Enter a product name, category, or company to find what you're looking for
            </p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* Loading State */}
        {loading && query && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching...</p>
          </div>
        )}

        {/* Search Error */}
        {!loading && query && searchError && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-red-50 text-red-400 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Search is temporarily unavailable</h2>
            <p className="text-gray-500 mb-6">Please check your connection and try searching again.</p>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* No Results */}
        {!loading && query && !searchError && sortedResults.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900">No results found</h2>
            <p className="text-gray-500 mb-4">
              We couldn't find any products matching &quot;{query}&quot;
            </p>
            <div className="space-y-1 mb-6">
              <p className="text-sm text-gray-500 font-medium">Try:</p>
              <ul className="text-sm text-gray-500 space-y-0.5">
                <li>Checking your spelling</li>
                <li>Using different keywords</li>
                <li>Searching for more general terms</li>
              </ul>
            </div>
            <Link
              href="/products"
              className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* Search Results */}
        {!loading && query && !searchError && sortedResults.length > 0 && (
          <>
            <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-gray-600 text-sm font-medium">
                Showing {startIndex + 1}-{Math.min(startIndex + productsPerPage, sortedResults.length)} of {sortedResults.length} results
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayedProducts.map(product => (
                <div key={product.id} className="group">
                  <ProductCard product={product} />
                  <Link
                    href={`/products/${product.id}`}
                    className="block mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View Details →
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-12">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          </>
        )}

        {/* Popular Searches */}
        <PopularSearches />
      </div>

      <Footer />
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading search results...</p>
          </div>
        </main>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
