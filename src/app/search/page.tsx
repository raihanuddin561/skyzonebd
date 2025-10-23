'use client'

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import ProductCard from '../components/ProductCard';
import { useProductSearch } from '@/hooks/useProducts';
import { Product } from '@/types/cart';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { products: searchResults, loading } = useProductSearch(query);
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
      <div className="bg-white py-6 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Search Results {query && `for "${query}"`}
              </h1>
              <p className="text-gray-600">
                {loading ? 'Searching...' : `${sortedResults.length} products found`}
              </p>
            </div>
            
            {/* Sort Dropdown */}
            {!loading && sortedResults.length > 0 && (
              <div className="mt-4 sm:mt-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
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
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Start your search</h2>
            <p className="text-gray-600 mb-4">
              Enter a product name, category, or company to find what you're looking for
            </p>
            <Link
              href="/products"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
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

        {/* No Results State */}
        {!loading && query && sortedResults.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">😔</div>
            <h2 className="text-xl font-semibold mb-2">No results found</h2>
            <p className="text-gray-600 mb-4">
              We couldn't find any products matching "{query}"
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Try:</p>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>• Checking your spelling</li>
                <li>• Using different keywords</li>
                <li>• Searching for more general terms</li>
              </ul>
            </div>
            <Link
              href="/products"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block mt-4"
            >
              Browse All Products
            </Link>
          </div>
        )}

        {/* Search Results */}
        {!loading && query && sortedResults.length > 0 && (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
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
            {totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded ${
                      currentPage === 1 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-4 py-2 rounded ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded ${
                      currentPage === totalPages 
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    }`}
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}

        {/* Popular Searches */}
        <div className="mt-16 bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Popular Searches</h3>
          <div className="flex flex-wrap gap-2">
            {['Electronics', 'Baby Items', 'Clothing', 'Headphones', 'Toys', 'Industrial', 'Office', 'Home'].map(term => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 text-sm"
              >
                {term}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
