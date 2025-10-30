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
      <section className="bg-gray-50 py-8 md:py-16 text-center px-4">
        <h2 className="text-2xl md:text-4xl font-bold text-gray-800 mb-2">
          Grow Your Business with <span className="text-blue-800">SkyzoneBD</span>
        </h2>
        <p className="text-sm md:text-base text-gray-600 mb-6">
          Connect with verified wholesalers and retailers
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 mb-8 md:mb-12 max-w-md mx-auto sm:max-w-none">
          <Link href="/auth/register" className="bg-red-500 text-white px-6 py-3 rounded-xl font-semibold shadow hover:bg-red-600 transition-colors text-sm md:text-base">
            Register Company
          </Link>
          <Link href="/products" className="border border-gray-400 px-6 py-3 rounded-xl font-semibold text-gray-800 hover:bg-gray-100 transition-colors text-sm md:text-base">
            Explore Products
          </Link>
        </div>

        <h3 className="text-base md:text-lg font-semibold mb-4 md:mb-6">Browse Categories</h3>
        <div className="flex justify-center items-center w-full">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 justify-items-center">
            {categoriesLoading ? (
              <div className="col-span-full text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : categories.length > 0 ? (
              categories.map(category => (
                <Link
                  key={category.id}
                  href={`/products?category=${category.id}`}
                  className={`flex flex-col items-center justify-center text-center hover:shadow-lg p-4 md:p-6 rounded-xl transition-all transform hover:scale-105 hover:-translate-y-1 w-[140px] md:w-[160px] ${getCategoryColor(category.name)}`}
                >
                  <div className="text-4xl md:text-5xl mb-2 md:mb-3">
                    {category.icon || getCategoryIcon(category.name)}
                  </div>
                  <p className="text-xs md:text-sm font-semibold">{category.name}</p>
                  {category.productCount !== undefined && category.productCount > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{category.productCount} items</p>
                  )}
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                <p>No categories available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-8 md:py-12 px-4 md:px-6 max-w-7xl mx-auto">
        <h3 className="text-xl md:text-2xl font-semibold mb-4 md:mb-6">Featured Products</h3>
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
        <h3 className="text-xl md:text-2xl font-semibold mb-6 md:mb-8">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
          {[
            'Register your company on SkyzoneBD',
            'Add your products and pricing',
            'Start receiving and managing orders'
          ].map((step, idx) => (
            <div key={idx} className="p-4 md:p-6 bg-white rounded-xl shadow">
              <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-2">{idx + 1}</div>
              <p className="text-sm md:text-base">{step}</p>
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
