// apppage.tsx
'use client'

import Link from "next/link";
import Image from "next/image";
import ProductCard from "./components/ProductCard";
import Header from "./components/Header";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryIcon, getCategoryColor } from "@/utils/categoryIcons";

export default function HomePage() {
  const { products: featuredProducts, loading: productsLoading } = useFeaturedProducts();
  const { categories, loading: categoriesLoading } = useCategories();

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <Header />
      

      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-10 md:py-20 text-center px-4 border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
            Grow Your Business with <span className="text-blue-600 bg-clip-text">SkyzoneBD</span>
          </h2>
          <p className="text-base md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with verified wholesalers and retailers across Bangladesh
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 md:gap-5 mb-12 md:mb-16 max-w-md mx-auto sm:max-w-none">
            <Link href="/auth/register" className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-105 text-sm md:text-base">
              Register Company
            </Link>
            <Link href="/products" className="border-2 border-blue-600 px-8 py-4 rounded-xl font-semibold text-blue-600 bg-white hover:bg-blue-50 transition-all transform hover:scale-105 shadow-md hover:shadow-lg text-sm md:text-base">
              Explore Products
            </Link>
          </div>
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 md:mb-8">Browse Categories</h3>
        
        {categoriesLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-3">Loading categories...</p>
          </div>
        ) : categories.length > 0 ? (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {categories.map(category => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.id}`}
                  className={`group flex flex-col items-center justify-center text-center hover:shadow-xl p-5 md:p-6 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 w-[140px] sm:w-[150px] md:w-[160px] border-2 border-transparent hover:border-blue-300 ${getCategoryColor(category.name)}`}
                >
                  <div className="text-4xl md:text-5xl mb-3 transition-transform group-hover:scale-110 duration-300">
                    {category.icon || getCategoryIcon(category.name)}
                  </div>
                  <p className="text-sm md:text-base font-semibold text-gray-900 mb-1 line-clamp-2">{category.name}</p>
                  {category.productCount !== undefined && category.productCount > 0 && (
                    <p className="text-xs text-gray-600 font-medium bg-white/50 px-2 py-1 rounded-full mt-1">
                      {category.productCount} items
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-300 max-w-md mx-auto">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="font-medium">No categories available</p>
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="py-8 md:py-12 px-4 md:px-6 max-w-7xl mx-auto">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 md:mb-6">Featured Products</h3>
        {productsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            <div className="text-center mt-6 md:mt-8">
              <Link
                href="/products"
                className="inline-block bg-blue-600 text-white px-6 md:px-8 py-2.5 md:py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm md:text-base"
              >
                View All Products
              </Link>
            </div>
          </>
        )}
      </section>

      {/* How It Works */}
      <section className="py-8 md:py-16 bg-gray-100 text-center px-4">
        <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-6 md:mb-8">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
          {[
            'Register your company on SkyzoneBD',
            'Add your products and pricing',
            'Start receiving and managing orders'
          ].map((step, idx) => (
            <div key={idx} className="p-4 md:p-6 bg-white rounded-xl shadow">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{idx + 1}</div>
              <p className="text-sm md:text-base text-gray-800">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 bg-blue-600 text-white text-center">
        <h3 className="text-3xl font-bold mb-4">Ready to scale?</h3>
        <p className="mb-6">Join SkyzoneBD today and reach thousands of verified B2B buyers.</p>
        <Link href="/auth/register" className="px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl shadow hover:bg-gray-100">Become a Vendor</Link>
      </section>

      <footer className="py-8 text-center text-sm text-gray-500 border-t mt-12">
        © 2025 SkyzoneBD. All rights reserved.
      </footer>
    </main>
  );
}
