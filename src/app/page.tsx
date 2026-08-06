// apppage.tsx
'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ProductCard from "./components/ProductCard";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { getCategoryIcon, getCategoryColor } from "@/utils/categoryIcons";

// Metadata is handled in layout.tsx

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
    wholesalePrice: number;
  };
}

interface CarouselSettings {
  autoplayEnabled: boolean;
  autoplaySpeed: number;
  transitionEffect: 'fade' | 'slide';
  pauseOnHover: boolean;
  showArrows: boolean;
  showDots: boolean;
  showCounter: boolean;
}

const DEFAULT_CAROUSEL_SETTINGS: CarouselSettings = {
  autoplayEnabled: true,
  autoplaySpeed: 5,
  transitionEffect: 'fade',
  pauseOnHover: true,
  showArrows: true,
  showDots: true,
  showCounter: true,
};

export default function HomePage() {
  const { products: featuredProducts, loading: productsLoading } = useFeaturedProducts();
  const { categories, loading: categoriesLoading } = useCategories();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [carouselSettings, setCarouselSettings] = useState<CarouselSettings>(DEFAULT_CAROUSEL_SETTINGS);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  // JSON-LD Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "SkyzoneBD",
    "url": "https://skyzonebd.com",
    "description": "Bangladesh's leading B2B and B2C marketplace",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://skyzonebd.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "SkyzoneBD",
    "url": "https://skyzonebd.com",
    "logo": "https://skyzonebd.com/logo.png",
    "description": "Bangladesh's trusted B2B and B2C marketplace",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "areaServed": "BD",
      "availableLanguage": ["English", "Bengali"]
    }
  };

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

  // Fetch carousel behavior settings (autoplay speed, transition, arrows/
  // dots/counter visibility) — admin-configurable under Admin > Settings.
  // Public/unauthenticated endpoint, since a visitor's own homepage load
  // needs this before any login has happened.
  useEffect(() => {
    const fetchCarouselSettings = async () => {
      try {
        const response = await fetch('/api/carousel-settings');
        const data = await response.json();
        if (data.success && data.data) {
          setCarouselSettings({ ...DEFAULT_CAROUSEL_SETTINGS, ...data.data });
        }
      } catch (error) {
        console.error('Error fetching carousel settings:', error);
      }
    };
    fetchCarouselSettings();
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (heroSlides.length > 1 && carouselSettings.autoplayEnabled && !(isPaused && carouselSettings.pauseOnHover)) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
      }, carouselSettings.autoplaySpeed * 1000);
      return () => clearInterval(timer);
    }
  }, [heroSlides.length, isPaused, carouselSettings.autoplayEnabled, carouselSettings.autoplaySpeed, carouselSettings.pauseOnHover]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  // Touch event handlers for swipe functionality
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  return (
    <main className="min-h-screen bg-white text-gray-800">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }}
      />
      
      <Header />
      
      {/* Hero Carousel Section - Enhanced Responsive Design */}
      <section className="relative overflow-hidden bg-gray-900 border-b border-gray-200">
        {slidesLoading ? (
          <div className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] flex items-center justify-center bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-4 border-white mx-auto mb-4"></div>
              <p className="text-base sm:text-lg font-medium">Loading carousel...</p>
            </div>
          </div>
        ) : heroSlides.length === 0 ? (
          <div className="h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center">
            <div className="max-w-4xl mx-auto text-center px-4 relative z-10 py-16 sm:py-24 md:py-32">
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 animate-fade-in text-white">Welcome to SkyzoneBD</h2>
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 opacity-90 animate-fade-in text-white">Your trusted B2B marketplace</p>
              <Link href="/products" className="inline-block bg-white text-gray-900 px-6 sm:px-8 md:px-10 py-3 sm:py-4 rounded-full font-bold text-sm sm:text-base md:text-lg shadow-2xl hover:scale-105 hover:shadow-3xl transition-all duration-300">
                Shop Now
              </Link>
            </div>
          </div>
        ) : (
          <div 
            className="relative h-[300px] sm:h-[350px] md:h-[400px] lg:h-[450px] group"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Slides Container */}
            {heroSlides.map((slide, index) => (
              <div
                key={slide.id}
                className={
                  carouselSettings.transitionEffect === 'slide'
                    ? `absolute inset-0 transition-transform duration-700 ease-in-out ${
                        index === currentSlide ? 'z-10' : 'z-0 pointer-events-none'
                      }`
                    : `absolute inset-0 transition-all duration-700 ease-in-out ${
                        index === currentSlide
                          ? 'opacity-100 scale-100 z-10'
                          : 'opacity-0 scale-95 pointer-events-none z-0'
                      }`
                }
                style={
                  carouselSettings.transitionEffect === 'slide'
                    ? { transform: `translateX(${(index - currentSlide) * 100}%)` }
                    : undefined
                }
              >
                <div 
                  className="w-full h-full relative flex items-center justify-center"
                  style={{ backgroundColor: slide.bgColor }}
                >
                  {/* Background Image with Gradient Overlay */}
                  {slide.imageUrl && (
                    <div className="absolute inset-0">
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent"></div>
                    </div>
                  )}
                  
                  {/* Content Overlay */}
                  <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
                      {/* Text Content */}
                      <div className="text-left space-y-4 sm:space-y-5 md:space-y-6">
                        <h2 
                          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight animate-slide-in-left"
                          style={{ 
                            color: slide.textColor,
                            textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
                          }}
                        >
                          {slide.title}
                        </h2>
                        {slide.subtitle && (
                          <p 
                            className="text-sm sm:text-base md:text-lg lg:text-xl max-w-xl animate-slide-in-left animation-delay-200"
                            style={{ 
                              color: slide.textColor,
                              opacity: 0.95,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
                            }}
                          >
                            {slide.subtitle}
                          </p>
                        )}
                        <div className="animate-slide-in-left animation-delay-400">
                          <Link
                            href={slide.linkUrl || (slide.product ? `/products/${slide.product.id}` : '/products')}
                            className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 md:py-4 rounded-full font-bold text-sm sm:text-base md:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 hover:-translate-y-1 transition-all duration-300 group"
                          >
                            {slide.buttonText}
                            <svg className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                      
                      {/* Product Card (if linked to a product) */}
                      {slide.product && (
                        <div className="hidden md:flex justify-center lg:justify-end animate-slide-in-right">
                          <Link href={`/products/${slide.product.id}`} className="group/card">
                            <div className="bg-white/95 backdrop-blur-md p-5 lg:p-6 xl:p-8 rounded-2xl lg:rounded-3xl border-2 border-white/50 shadow-2xl hover:shadow-3xl hover:border-white transition-all duration-300 group-hover/card:scale-105 group-hover/card:-translate-y-2 max-w-sm">
                              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 mb-4">
                                <img
                                  src={slide.product.imageUrl}
                                  alt={slide.product.name}
                                  className="w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56 object-contain mx-auto transform group-hover/card:scale-110 transition-transform duration-500"
                                />
                              </div>
                              <h3 className="text-gray-900 font-bold text-center text-base lg:text-lg xl:text-xl mb-2 line-clamp-2 group-hover/card:text-blue-600 transition-colors">
                                {slide.product.name}
                              </h3>
                              <div className="flex items-center justify-center gap-2">
                                <p className="text-blue-600 font-bold text-xl lg:text-2xl xl:text-3xl">
                                  ৳{slide.product.wholesalePrice.toLocaleString()}
                                </p>
                                <span className="text-green-600 text-xs font-semibold bg-green-50 px-2 py-1 rounded-full">
                                  In Stock
                                </span>
                              </div>
                            </div>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Navigation Arrows */}
            {heroSlides.length > 1 && carouselSettings.showArrows && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 bg-white/25 hover:bg-white/40 active:bg-white/50 backdrop-blur-md text-white p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl cursor-pointer"
                  aria-label="Previous slide"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 bg-white/25 hover:bg-white/40 active:bg-white/50 backdrop-blur-md text-white p-2 sm:p-3 md:p-4 rounded-full transition-all duration-300 z-20 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl cursor-pointer"
                  aria-label="Next slide"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Slide Indicators, each doubling as an autoplay progress bar for the active slide */}
            {heroSlides.length > 1 && carouselSettings.showDots && (
              <div className="absolute bottom-4 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-20">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`relative overflow-hidden transition-all duration-300 rounded-full shadow-md hover:shadow-lg cursor-pointer ${
                      index === currentSlide
                        ? 'bg-white/40 w-8 sm:w-10 md:w-12 h-2.5 sm:h-3 scale-110'
                        : 'bg-white/60 hover:bg-white/80 w-2.5 sm:w-3 h-2.5 sm:h-3 hover:scale-110'
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  >
                    {index === currentSlide && carouselSettings.autoplayEnabled && !(isPaused && carouselSettings.pauseOnHover) && (
                      <span
                        key={`${currentSlide}-${carouselSettings.autoplaySpeed}`}
                        className="absolute inset-0 bg-white rounded-full origin-left animate-carousel-progress"
                        style={{ animationDuration: `${carouselSettings.autoplaySpeed}s` }}
                      />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Slide Counter */}
            {heroSlides.length > 1 && carouselSettings.showCounter && (
              <div className="absolute top-4 right-4 bg-black/30 backdrop-blur-md text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-semibold z-20">
                {currentSlide + 1} / {heroSlides.length}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Trust Bar */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                title: 'Verified Suppliers',
                desc: 'Every seller is reviewed & approved',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
              },
              {
                title: 'Secure Payments',
                desc: 'Your transactions are protected',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />,
              },
              {
                title: 'Bulk Pricing',
                desc: 'Tiered discounts as you order more',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4m16 0l-4 4m4-4l-4-4M4 12l4 4m-4-4l4-4" />,
              },
              {
                title: 'Fast Delivery',
                desc: 'Nationwide shipping, tracked end to end',
                icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
              },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-3 md:p-0">
                <span className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {item.icon}
                  </svg>
                </span>
                <div>
                  <p className="text-sm md:text-base font-semibold text-gray-900">{item.title}</p>
                  <p className="text-xs md:text-sm text-gray-500 mt-0.5 hidden sm:block">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-10 md:py-16 px-4 border-b border-gray-200">

        <div className="max-w-7xl mx-auto text-center mb-6 md:mb-8">
          <span className="section-eyebrow mb-3">Shop by category</span>
          <h3 className="text-xl md:text-3xl font-bold text-gray-900">Browse Categories</h3>
        </div>

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
      <section className="py-10 md:py-14 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            <span className="section-eyebrow mb-3">Hot right now</span>
            <h3 className="text-xl md:text-3xl font-bold text-gray-900">Featured Products</h3>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:text-blue-700 transition-colors flex-shrink-0"
          >
            View All
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
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
            <div className="text-center mt-6 md:mt-8 sm:hidden">
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
      <section className="py-10 md:py-20 bg-gray-50 text-center px-4">
        <div className="max-w-2xl mx-auto mb-8 md:mb-12">
          <span className="section-eyebrow mb-3">Get started in minutes</span>
          <h3 className="text-xl md:text-3xl font-bold text-gray-900">How It Works</h3>
          <p className="text-sm md:text-base text-gray-500 mt-2">Three simple steps to start buying or selling wholesale.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8 max-w-5xl mx-auto">
          {[
            { title: 'Create your account', desc: 'Register your company on SkyzoneBD in minutes.' },
            { title: 'List or browse products', desc: 'Add your catalog and pricing, or browse verified sellers.' },
            { title: 'Order & grow', desc: 'Start receiving and managing bulk orders with ease.' },
          ].map((step, idx) => (
            <div key={idx} className="card-hover p-6 md:p-8 bg-white rounded-2xl shadow-sm border border-gray-100 relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-lg font-bold mb-4 mx-auto shadow-md">
                {idx + 1}
              </div>
              <p className="text-base md:text-lg font-semibold text-gray-900 mb-1.5">{step.title}</p>
              <p className="text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative py-16 md:py-20 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 text-white text-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-4">
          <h3 className="text-2xl md:text-4xl font-bold mb-3 text-white">Ready to scale your business?</h3>
          <p className="mb-8 text-blue-100 text-base md:text-lg">Join SkyzoneBD today and reach thousands of verified B2B buyers across Bangladesh.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="px-8 py-3.5 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Become a Vendor
            </Link>
            <Link
              href="/products"
              className="px-8 py-3.5 bg-white/10 border border-white/30 text-white font-bold rounded-xl hover:bg-white/20 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
