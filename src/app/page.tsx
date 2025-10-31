// apppage.tsx
'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "./components/ProductCard";
import Header from "./components/Header";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryIcon, getCategoryColor } from "@/utils/categoryIcons";

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  buttonText: string;
  bgColor: string;
  textColor: string;
  product?: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    retailPrice: number;
  };
}

export default function HomePage() {
  const { products: featuredProducts, loading: productsLoading } = useFeaturedProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [slidesLoading, setSlidesLoading] = useState(true);

  // Fetch hero slides from API
  useEffect(() => {
    const fetchHeroSlides = async () => {
      try {
        const response = await fetch('/api/hero-slides');
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          setHeroSlides(data.data);
        }
      } catch (error) {
        console.error('Error fetching hero slides:', error);
      } finally {
        setSlidesLoading(false);
      }
    };
    fetchHeroSlides();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (heroSlides.length > 1) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }, 5000); // Change slide every 5 seconds
      return () => clearInterval(timer);
    }
  }, [heroSlides.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <Header />
      
      {/* Hero Slider Section - Alibaba Style */}
      <section className="relative overflow-hidden bg-gray-900 border-b border-gray-200">
        {slidesLoading ? (
          <div className="h-[250px] md:h-[350px] flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        ) : heroSlides.length === 0 ? (
          <div className="h-[250px] md:h-[350px] bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Welcome to SkyzoneBD</h2>
              <p className="text-lg md:text-xl mb-8 opacity-90">Your trusted B2B marketplace</p>
              <Link href="/products" className="inline-block bg-white text-gray-900 px-8 py-4 rounded-full font-bold shadow-2xl hover:scale-105 transition-all">
                Shop Now
              </Link>
            </div>
          </div>
        ) : (
          <div className="relative h-[250px] md:h-[350px]">
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-opacity duration-1000 ${
                  index === currentSlide ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div 
                  className="w-full h-full relative flex items-center justify-center"
                  style={{ backgroundColor: slide.bgColor }}
                >
                  {/* Background Image */}
                  {slide.imageUrl && (
                    <img
                      src={slide.imageUrl}
                      alt={slide.title}
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                  )}
                  
                  {/* Content Overlay */}
                  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Text Content */}
                    <div className="text-left">
                      <h2 
                        className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 md:mb-4 leading-tight animate-fade-in"
                        style={{ color: slide.textColor }}
                      >
                        {slide.title}
                      </h2>
                      {slide.subtitle && (
                        <p 
                          className="text-base md:text-xl mb-6 md:mb-8 opacity-90 animate-fade-in"
                          style={{ color: slide.textColor }}
                        >
                          {slide.subtitle}
                        </p>
                      )}
                      <Link
                        href={slide.linkUrl || (slide.product ? `/products/${slide.product.id}` : '/products')}
                        className="inline-block bg-white text-gray-900 px-6 md:px-10 py-3 md:py-4 rounded-full font-bold text-sm md:text-base shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 animate-fade-in"
                      >
                        {slide.buttonText}
                      </Link>
                    </div>
                    
                    {/* Product Image (if linked to a product) */}
                    {slide.product && (
                      <div className="hidden md:flex justify-center animate-fade-in">
                        <Link href={`/products/${slide.product.id}`} className="group">
                          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border-2 border-white/30 hover:border-white/60 transition-all group-hover:scale-105">
                            <img
                              src={slide.product.imageUrl}
                              alt={slide.product.name}
                              className="w-48 h-48 object-contain mb-4"
                            />
                            <h3 className="text-white font-semibold text-center text-lg">{slide.product.name}</h3>
                            <p className="text-white/90 text-center font-bold text-xl mt-2">৳{slide.product.retailPrice.toLocaleString()}</p>
                          </div>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Arrows */}
            {heroSlides.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 md:p-4 rounded-full transition-all duration-300 z-10 group"
                  aria-label="Previous slide"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 backdrop-blur-sm text-white p-3 md:p-4 rounded-full transition-all duration-300 z-10 group"
                  aria-label="Next slide"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Slide Indicators */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                  {heroSlides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`transition-all duration-300 rounded-full ${
                        index === currentSlide
                          ? 'bg-white w-10 h-3'
                          : 'bg-white/50 hover:bg-white/75 w-3 h-3'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </section>

      {/* Categories Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-10 md:py-16 px-4 border-b border-gray-200">

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
