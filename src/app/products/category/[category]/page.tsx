'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import ProductCard from '../../../components/ProductCard';
import { useProductsByCategory } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Product } from '@/types/cart';
import { getCategoryIcon } from '@/utils/categoryIcons';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.category as string;
  
  const { categories, loading: categoriesLoading } = useCategories();
  const { products: categoryProducts, loading: productsLoading } = useProductsByCategory(categoryId);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<any>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const productsPerPage = 12;

  useEffect(() => {
    if (!categoriesLoading && categories) {
      const foundCategory = categories.find(c => c.id === categoryId);
      if (foundCategory) {
        setCategory(foundCategory);
      } else if (!productsLoading) {
        router.push('/products');
      }
    }
  }, [categories, categoriesLoading, categoryId, productsLoading, router]);

  useEffect(() => {
    if (!productsLoading && categoryProducts) {
      let sortedProducts = [...categoryProducts];
      
      // Sort products
      sortedProducts.sort((a, b) => {
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
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
          default:
            return 0;
        }
      });
      
      setProducts(sortedProducts);
      setCurrentPage(1);
    }
  }, [categoryProducts, productsLoading, sortBy]);

  if (categoriesLoading || productsLoading || !category) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  // Pagination
  const totalPages = Math.ceil(products.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const displayedProducts = products.slice(startIndex, startIndex + productsPerPage);

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-white py-4 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
            <span className="text-gray-500">/</span>
            <Link href="/products" className="text-blue-600 hover:text-blue-700">Products</Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{category.name}</span>
          </nav>
        </div>
      </div>

      {/* Category Header */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="text-6xl mb-4">{category.icon || getCategoryIcon(category.name)}</div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{category.name}</h1>
          <p className="text-xl opacity-90">
            Explore {products.length} products in {category.name}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h2 className="text-2xl font-semibold mb-2">{category.name} Products</h2>
            <p className="text-gray-600">
              Showing {startIndex + 1}-{Math.min(startIndex + productsPerPage, products.length)} of {products.length} products
            </p>
          </div>
          
          {/* Sort Dropdown */}
          <div className="mt-4 sm:mt-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {displayedProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold mb-2">No products found</h3>
            <p className="text-gray-600 mb-4">
              No products are available in this category at the moment.
            </p>
            <Link
              href="/products"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
            >
              Browse All Products
            </Link>
          </div>
        ) : (
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
        )}

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

        {/* Category Navigation */}
        <div className="mt-16 bg-white rounded-lg p-6 shadow">
          <h3 className="text-lg font-semibold mb-4">Browse Other Categories</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.filter(c => c.id !== category.id).map(cat => (
              <Link
                key={cat.id}
                href={`/products/category/${cat.id}`}
                className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">{cat.icon}</span>
                <div>
                  <div className="font-medium">{cat.name}</div>
                  <div className="text-sm text-gray-500">
                    View products
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
