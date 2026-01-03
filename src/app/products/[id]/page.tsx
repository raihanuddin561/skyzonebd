'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Head from 'next/head';
import Header from '../../components/Header';
import { useProduct, useRelatedProducts } from '@/hooks/useProducts';
import { Product } from '@/types/cart';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const productId = params.id as string; // Keep as string (cuid)
  
  const { product, loading: productLoading } = useProduct(productId);
  const { products: relatedProducts, loading: relatedLoading } = useRelatedProducts(productId);
  
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('description');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [modalImageIndex, setModalImageIndex] = useState<number>(0);

  // Update page title and meta tags dynamically
  useEffect(() => {
    if (product) {
      document.title = `${product.name} | SkyzoneBD`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', product.description || `Buy ${product.name} at best price in Bangladesh`);
      }
      
      // Update Open Graph meta tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${product.name} | SkyzoneBD`);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', product.description || `Buy ${product.name} at best price`);
      }
      
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && product.imageUrl) {
        ogImage.setAttribute('content', product.imageUrl);
      }
    }
  }, [product]);

  useEffect(() => {
    if (product) {
      // Set quantity based on user type: ONLY wholesale uses MOQ, guests/retail always start at 1
      const initialQty = (user && user.userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1;
      setQuantity(initialQty);
      
      // Automatically set the first available image
      const images = getProductImages();
      const firstImage = images.length > 0 ? images[0] : product.imageUrl;
      
      console.log('🖼️ Product Image Auto-Selected:', {
        productId: product.id,
        totalImages: images.length,
        selectedImage: firstImage
      });
      
      setSelectedImage(firstImage || '');
    } else if (!productLoading && !product) {
      router.push('/products');
    }
  }, [product, productLoading, router, user]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    setIsAdding(true);
    
    try {
      addToCart(product, quantity);
      toast.success(`Added ${quantity} ${product.name}(s) to cart`);
    } catch (error) {
      toast.error('Failed to add item to cart');
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (product) {
      // Enforce MOQ ONLY for wholesale users, guests/retail can order from 1
      const minQty = (user && user.userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1;
      setQuantity(Math.max(newQuantity, minQty));
    }
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    
    // Check for bulk pricing
    if (product.bulkPricing) {
      const applicablePricing = product.bulkPricing
        .filter(bp => quantity >= bp.quantity)
        .sort((a, b) => b.quantity - a.quantity)[0];
      
      if (applicablePricing) {
        return applicablePricing.price * quantity;
      }
    }
    
    return product.price * quantity;
  };

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setShowImageModal(true);
  };

  const nextImage = () => {
    const images = getProductImages();
    if (images.length > 0) {
      setModalImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    const images = getProductImages();
    if (images.length > 0) {
      setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  const getProductImages = (): string[] => {
    if (!product) return [];
    // Check for imageUrls (from API) or images (legacy)
    const images = (product as any).imageUrls || product.images;
    if (images && Array.isArray(images) && images.length > 0) return images;
    return [product.imageUrl];
  };

  if (productLoading || !product) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product details...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
            <span className="text-gray-500">/</span>
            <Link href="/products" className="text-blue-600 hover:text-blue-700">Products</Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images - Professional Design */}
          <div className="lg:sticky lg:top-6 self-start">
            {/* Main Image Container */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4 transition-shadow hover:shadow-md">
              <div 
                className="relative w-full cursor-zoom-in bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group"
                style={{ minHeight: '450px', height: '500px' }}
                onClick={() => openImageModal(getProductImages().indexOf(selectedImage || product.imageUrl))}
              >
                <img
                  src={selectedImage || product.imageUrl}
                  alt={product.name}
                  className="max-w-full max-h-full w-auto h-auto object-contain p-8 transition-transform group-hover:scale-105 duration-300"
                  style={{ maxHeight: '484px' }}
                  onError={(e) => {
                    console.error('Image load error:', selectedImage || product.imageUrl);
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect width="400" height="400" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%236b7280"%3EImage not available%3C/text%3E%3C/svg%3E';
                  }}
                />
                
                {/* Navigation Arrows - Show when multiple images exist */}
                {getProductImages().length > 1 && (
                  <>
                    {/* Previous Image Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const images = getProductImages();
                        const currentIndex = images.indexOf(selectedImage || product.imageUrl);
                        const prevIndex = (currentIndex - 1 + images.length) % images.length;
                        setSelectedImage(images[prevIndex]);
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
                      aria-label="Previous image"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    {/* Next Image Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const images = getProductImages();
                        const currentIndex = images.indexOf(selectedImage || product.imageUrl);
                        const nextIndex = (currentIndex + 1) % images.length;
                        setSelectedImage(images[nextIndex]);
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full p-3 shadow-lg border border-gray-200 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
                      aria-label="Next image"
                    >
                      <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
                
                {/* Image Counter */}
                {getProductImages().length > 1 && (
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                    {getProductImages().indexOf(selectedImage || product.imageUrl) + 1} / {getProductImages().length}
                  </div>
                )}
                
                {/* Hover zoom indicator */}
                <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm rounded-full p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg border border-gray-200">
                  <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
              
              {/* Thumbnails Row - Enhanced with Better Selection Indicators */}
              {getProductImages().length > 1 && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-t border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">Product Images ({getProductImages().length})</span>
                  </div>
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                    {getProductImages().map((image, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSelectedImage(image);
                          console.log(`🖼️ Image ${index + 1} of ${getProductImages().length} selected`);
                        }}
                        className={`group relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                          (selectedImage || product.imageUrl) === image 
                            ? 'border-blue-600 ring-4 ring-blue-200 shadow-lg scale-105 bg-white' 
                            : 'border-gray-300 hover:border-blue-400 hover:shadow-md hover:scale-105 bg-white'
                        }`}
                        aria-label={`Select image ${index + 1}`}
                      >
                        <img
                          src={image}
                          alt={`${product.name} - View ${index + 1}`}
                          className="w-full h-full object-contain p-1.5 sm:p-2"
                          loading="lazy"
                        />
                        
                        {/* Selected Indicator Badge */}
                        {(selectedImage || product.imageUrl) === image && (
                          <div className="absolute top-1 right-1 bg-blue-600 rounded-full p-0.5 shadow-md">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-10 transition-opacity duration-200" />
                        
                        {/* Image Number Badge */}
                        <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm">
                          {index + 1}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">Click any image to view in detail</p>
                </div>
              )}
            </div>
            
            {/* Product Stats - Enhanced Design */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 overflow-hidden">
              <div className="grid grid-cols-3 divide-x divide-blue-200">
                <div className="p-4 text-center hover:bg-white/50 transition-colors">
                  {product.rating ? (
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-2xl font-bold text-gray-900">{product.rating.toFixed(1)}</span>
                      <svg className="w-5 h-5 ml-1 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <span className="text-2xl font-bold text-gray-400">N/A</span>
                    </div>
                  )}
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Rating</div>
                </div>
                <div className="p-4 text-center hover:bg-white/50 transition-colors">
                  <div className="text-2xl font-bold text-indigo-600 mb-2">{product.reviews || 0}</div>
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Reviews</div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info - Professional Layout */}
          <div className="space-y-6">
            {/* Product Title & Rating */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">{product.name}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-4">
                {product.rating ? (
                  <div className="flex items-center bg-gradient-to-r from-yellow-50 to-orange-50 px-3 py-2 rounded-lg border border-yellow-200">
                    <div className="flex text-yellow-400 mr-2">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} className={`w-5 h-5 ${i < Math.floor(product.rating!) ? 'text-yellow-400 fill-current' : 'text-gray-300 fill-current'}`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {product.rating.toFixed(1)} <span className="text-gray-500">({product.reviews || 0} reviews)</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-semibold text-gray-500">No ratings yet</span>
                  </div>
                )}
                
                <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold ${
                  product.availability === 'in_stock' 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : product.availability === 'limited'
                    ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${
                    product.availability === 'in_stock' ? 'bg-green-500' :
                    product.availability === 'limited' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
                  {product.availability === 'in_stock' ? 'In Stock' : 
                   product.availability === 'limited' ? 'Limited Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Price Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 p-6">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-4xl font-bold text-blue-600">
                  ৳{product.price.toLocaleString()}
                  {product.unit && <span className="text-lg text-gray-600">/{product.unit}</span>}
                  {product.unit && <span className="text-xl text-gray-600 font-normal ml-2">/ {product.unit}</span>}
                </span>
                {product.discount && (
                  <>
                    <span className="text-xl text-gray-400 line-through">৳{(product.price / (1 - product.discount / 100)).toFixed(0)}</span>
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                      -{product.discount}% OFF
                    </span>
                  </>
                )}
              </div>
              {/* Show MOQ ONLY for wholesale users and if MOQ is set */}
              {user && user.userType === 'WHOLESALE' && product.minOrderQuantity && product.minOrderQuantity > 0 && (
                <p className="text-sm text-gray-600">
                  Minimum Order Quantity: {product.minOrderQuantity} units
                </p>
              )}
            </div>

            {/* Bulk Pricing */}
            {product.bulkPricing && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-gray-900">Bulk Pricing</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.bulkPricing.map((pricing, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                      <span className="font-medium">{pricing.quantity}+ units:</span>
                      <span className="text-blue-600 ml-2">৳{pricing.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="mb-6">
              {product.availability === 'in_stock' || product.availability === 'limited' ? (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Quantity {(user && user.userType === 'WHOLESALE' && product.minOrderQuantity && product.minOrderQuantity > 0) ? `(Min: ${product.minOrderQuantity})` : ''}
                      </label>
                      <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                        {/* Decrease Button */}
                        <button
                          onClick={() => {
                            const minQty = (user && user.userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1;
                            const newQty = Math.max(quantity - 1, minQty);
                            handleQuantityChange(newQty);
                          }}
                          disabled={quantity <= ((user && user.userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1)}
                          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-600 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-700"
                          aria-label="Decrease quantity"
                        >
                          <svg 
                            className="w-5 h-5 sm:w-6 sm:h-6" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            strokeWidth="3"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        
                        {/* Quantity Display */}
                        <div className="w-16 sm:w-20 h-10 sm:h-12 flex items-center justify-center bg-white text-gray-900 font-bold text-base sm:text-lg border-x-2 border-gray-300">
                          {quantity}
                        </div>
                        
                        {/* Increase Button */}
                        <button
                          onClick={() => {
                            const newQty = quantity + 1;
                            if (product.stock && newQty <= product.stock) {
                              handleQuantityChange(newQty);
                            }
                          }}
                          disabled={product.stock ? quantity >= product.stock : false}
                          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-600 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-700"
                          aria-label="Increase quantity"
                        >
                          <svg 
                            className="w-5 h-5 sm:w-6 sm:h-6" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                            strokeWidth="3"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 w-full sm:w-auto">
                      <p className="text-sm text-gray-600 mb-1">Total Price</p>
                      <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                        ৳{calculateTotalPrice().toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? 'Adding...' : 'Add to Cart'}
                  </button>
                  
                  {product.availability === 'limited' && (
                    <p className="text-sm text-yellow-600 mt-2 text-center">
                      ⚠ Limited stock available - Order soon!
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <button
                    disabled
                    className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-300 text-gray-600 cursor-not-allowed mb-2"
                  >
                    Out of Stock
                  </button>
                  <p className="text-sm text-red-600">
                    This product is currently unavailable. Please check back later.
                  </p>
                  <button
                    onClick={() => toast.info('We will notify you when this product is back in stock')}
                    className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                  >
                    Notify Me When Available
                  </button>
                </div>
              )}
            </div>

            {/* Key Features */}
            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div className="border-t pt-6 mb-6">
                <h3 className="font-semibold mb-3 text-gray-900">Key Features</h3>
                <ul className="space-y-2">
                  {Object.entries(product.specifications).slice(0, 5).map(([key, value]) => (
                    <li key={key} className="flex items-start text-sm">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-700"><span className="font-medium">{key}:</span> {value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Product Info Grid */}
            <div className="border-t pt-6 mb-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {product.category && (
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <p className="font-medium text-gray-900">{product.category}</p>
                  </div>
                )}
                {product.brand && (
                  <div>
                    <span className="text-gray-600">Brand:</span>
                    <p className="font-medium text-gray-900">{product.brand}</p>
                  </div>
                )}
                {product.availability && (
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className={`font-medium ${
                      product.availability === 'in_stock' ? 'text-green-600' : 
                      product.availability === 'limited' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {product.availability === 'in_stock' ? 'In Stock' : 
                       product.availability === 'limited' ? 'Limited Stock' : 'Out of Stock'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Company Info */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 text-gray-900">Seller Information</h3>
              <div className="flex items-center gap-4">
                {product.companyLogo && (
                  <Image
                    src={product.companyLogo}
                    alt={product.companyName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full border-2 border-gray-200"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-900">{product.companyName}</p>
                  {product.companyLocation && (
                    <p className="text-sm text-gray-600 flex items-center mt-1">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {product.companyLocation}
                    </p>
                  )}
                  {product.companyVerified && (
                    <span className="inline-flex items-center text-sm text-green-600 mt-1">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Seller
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {['description', 'specifications', 'shipping', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8">
            {activeTab === 'description' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Product Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
                
                {product.tags && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Product Specifications</h3>
                {product.specifications ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex border-b pb-2">
                        <span className="font-medium text-gray-700 w-1/2">{key}:</span>
                        <span className="text-gray-600 w-1/2">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No specifications available</p>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Shipping & Returns</h3>
                <div className="space-y-4">
                  {product.leadTime && (
                    <div>
                      <h4 className="font-medium">Lead Time:</h4>
                      <p className="text-gray-600">{product.leadTime}</p>
                    </div>
                  )}
                  {product.shippingInfo && (
                    <div>
                      <h4 className="font-medium">Shipping Information:</h4>
                      <p className="text-gray-600">{product.shippingInfo}</p>
                    </div>
                  )}
                  {product.returnPolicy && (
                    <div>
                      <h4 className="font-medium">Return Policy:</h4>
                      <p className="text-gray-600">{product.returnPolicy}</p>
                    </div>
                  )}
                  {product.warranty && (
                    <div>
                      <h4 className="font-medium">Warranty:</h4>
                      <p className="text-gray-600">{product.warranty}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Customer Reviews</h3>
                {product.rating && product.reviews ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">{product.rating}/5</div>
                    <div className="flex justify-center text-yellow-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.floor(product.rating!) ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-600">{product.reviews} reviews</p>
                    <p className="text-gray-500 mt-4">Review system coming soon...</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No reviews available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-semibold mb-8 text-gray-900">Related Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.id}`}
                  className="group"
                >
                  <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <Image
                      src={relatedProduct.imageUrl}
                      alt={relatedProduct.name}
                      width={200}
                      height={150}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <h4 className="font-medium group-hover:text-blue-600 truncate">
                      {relatedProduct.name}
                    </h4>
                    <p className="text-blue-600 font-bold">
                      ৳{relatedProduct.price.toLocaleString()}
                      {relatedProduct.unit && <span className="text-sm text-gray-600">/{relatedProduct.unit}</span>}
                    </p>
                    <p className="text-sm text-gray-500">{relatedProduct.companyName}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Modal/Lightbox */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Button */}
          {getProductImages().length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div 
            className="relative max-w-6xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Product Title - Clickable */}
            <div className="absolute top-4 left-4 right-16 z-10">
              <Link
                href={`/products/${product.id}`}
                className="inline-block bg-black bg-opacity-70 text-white px-6 py-3 rounded-lg text-lg font-semibold hover:bg-opacity-90 transition-all"
                onClick={() => setShowImageModal(false)}
              >
                {product.name}
              </Link>
            </div>

            <Image
              src={getProductImages()[modalImageIndex]}
              alt={`${product.name} - Image ${modalImageIndex + 1}`}
              width={1200}
              height={900}
              className="max-h-[90vh] w-auto object-contain"
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm">
              {modalImageIndex + 1} / {getProductImages().length}
            </div>
          </div>

          {/* Next Button */}
          {getProductImages().length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 text-white hover:text-gray-300 bg-black bg-opacity-50 rounded-full p-3 hover:bg-opacity-70 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      )}
    </main>
  );
}
