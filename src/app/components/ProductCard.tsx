'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types/cart';
import { getLineTotal } from '@/utils/cartPricing';
import { toast } from 'react-toastify';
import ImageZoomLightbox from '@/components/common/ImageZoomLightbox';
import QuantityInput from '@/components/common/QuantityInput';
import RFQButton from '@/components/rfq/RFQButton';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  
  // Determine minimum order quantity based on user type
  // Wholesale users have MOQ requirement, guests and retail customers start at 1
  const effectiveMinQty = (user && user.userType === 'WHOLESALE') ? (product.minOrderQuantity || 1) : 1;
  const customerDiscount = user ? { discountPercent: user.discountPercent, discountValidUntil: user.discountValidUntil } : null;
  const [quantity, setQuantity] = useState(effectiveMinQty);
  const [isAdding, setIsAdding] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fix hydration by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddToCart = async () => {
    setIsAdding(true);
    
    // Ensure quantity meets minimum order requirement based on user type
    const finalQuantity = Math.max(quantity || 1, effectiveMinQty);
    
    try {
      addToCart(product, finalQuantity);
      toast.success(`Added ${finalQuantity} ${product.name}(s) to cart`);
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlistToggle = () => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast.info('Removed from wishlist');
    } else {
      addToWishlist(product);
      toast.success('Added to wishlist');
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(Math.max(newQuantity, effectiveMinQty));
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLightboxIndex(0);
    setShowLightbox(true);
  };

  // Find lowest bulk tier price if available
  const lowestTierPrice = (product.wholesaleTiers && product.wholesaleTiers.length > 0)
    ? Math.min(...product.wholesaleTiers.map(t => t.price))
    : null;

  return (
    <div className="card-hover p-3 sm:p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs hover:border-blue-400 hover:shadow-lg transition-all duration-200 relative group flex flex-col justify-between">
      <div>
        {/* Wishlist Button */}
        <button
          onClick={handleWishlistToggle}
          className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 bg-white/90 backdrop-blur-xs rounded-full shadow-xs border border-slate-200 flex items-center justify-center hover:bg-slate-100 z-10 cursor-pointer touch-manipulation transition-transform hover:scale-110 active:scale-95"
          aria-label={isClient && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
        >
          <svg 
            className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${isClient && isInWishlist(product.id) ? 'text-red-500 fill-current' : 'text-slate-400'}`} 
            fill={isClient && isInWishlist(product.id) ? 'currentColor' : 'none'} 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
        
        {/* Product Image with Zoom */}
        <div className="relative overflow-hidden rounded-xl mb-3 bg-slate-50 border border-slate-100">
          <Link href={`/products/${product.id}`} className="block">
            <div className="relative w-full h-36 sm:h-44 flex items-center justify-center group/image">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-contain p-3 cursor-pointer transition-transform duration-300 group-hover:scale-105"
                onClick={handleImageClick}
              />
              {/* Zoom indicator on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-all duration-300 flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                <div className="bg-white/95 backdrop-blur-xs rounded-full p-2 shadow-md">
                  <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
          
          {/* Badges Overlay */}
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 pointer-events-none">
            {lowestTierPrice && lowestTierPrice < product.price && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-bold bg-amber-500 text-white shadow-xs">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                Bulk ৳{lowestTierPrice.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        
        {/* Availability & MOQ strip */}
        <div className="flex items-center justify-between gap-1 mb-2">
          {/* Availability Badge */}
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
            product.availability === 'in_stock'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : product.availability === 'limited'
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              product.availability === 'in_stock' ? 'bg-emerald-500 animate-pulse' :
              product.availability === 'limited' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            {product.availability === 'in_stock' ? 'In Stock' :
             product.availability === 'limited' ? 'Limited' : 'Out of Stock'}
          </span>

          {/* MOQ pill */}
          {isClient && product.minOrderQuantity != null && product.minOrderQuantity > 1 && (
            <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
              MOQ: {product.minOrderQuantity}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/products/${product.id}`} className="hover:text-blue-600 transition-colors">
          <h4 className="text-sm sm:text-base font-semibold mb-2 cursor-pointer text-slate-900 line-clamp-2 min-h-[2.5rem] leading-snug">
            {product.name}
          </h4>
        </Link>
        
        {/* Price & Rating */}
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-lg lg:text-xl text-blue-700 font-extrabold tracking-tight">
                ৳{product.price.toLocaleString()}
              </span>
              {product.unit && (
                <span className="text-xs text-slate-500 font-medium">/{product.unit}</span>
              )}
            </div>
            {lowestTierPrice && lowestTierPrice < product.price && (
              <p className="text-[11px] text-emerald-700 font-medium">
                Save up to {Math.round(((product.price - lowestTierPrice) / product.price) * 100)}% on bulk
              </p>
            )}
          </div>

          {product.rating && (
            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
              <svg className="w-3.5 h-3.5 text-amber-500 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.958a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.447a1 1 0 00-.363 1.118l1.287 3.957c.3.922-.755 1.688-1.538 1.118l-3.367-2.446a1 1 0 00-1.176 0l-3.367 2.446c-.783.57-1.838-.196-1.538-1.118l1.287-3.957a1 1 0 00-.363-1.118L2.062 9.385c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.286-3.958z" />
              </svg>
              <span className="text-xs font-semibold text-slate-700">{product.rating}</span>
            </div>
          )}
        </div>
      </div>

      <div>
        {/* Quantity Input */}
        {(product.availability === 'in_stock' || product.availability === 'limited') && (
          <div className="mb-2.5">
            <QuantityInput
              value={quantity}
              onChange={handleQuantityChange}
              min={effectiveMinQty}
              max={product.stock ?? undefined}
              label={`Qty ${(user && user.userType === 'WHOLESALE' && product.minOrderQuantity && product.minOrderQuantity > 0) ? `(Min: ${product.minOrderQuantity})` : ''}`}
              showLabel={false}
              className="w-full"
            />
          </div>
        )}
        
        {/* Add to Cart Button */}
        {product.availability === 'in_stock' || product.availability === 'limited' ? (
          <>
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex-1 bg-gradient-to-r from-blue-700 to-indigo-700 text-white py-2.5 px-3 rounded-xl text-sm font-semibold hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer touch-manipulation shadow-xs hover:shadow-md active:scale-95"
                suppressHydrationWarning
              >
                {isAdding ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Add to Cart
                  </span>
                )}
              </button>
              
              {/* RFQ Button for wholesale users */}
              <RFQButton 
                product={product} 
                userType={user?.userType as 'WHOLESALE' | 'RETAIL' | null}
                variant="icon"
                className="flex-shrink-0"
              />
            </div>
            
            {/* Total Price Preview */}
            <p className="text-xs text-slate-500 mt-2 text-center font-medium">
              Line Total: <span className="text-blue-700 font-bold">৳{isClient ? getLineTotal(product, quantity || 1, customerDiscount).toLocaleString() : getLineTotal(product, effectiveMinQty, customerDiscount).toLocaleString()}</span>
            </p>
          </>
        ) : (
          <div className="text-center">
            <button
              disabled
              className="w-full bg-slate-100 text-slate-400 py-2.5 px-3 rounded-xl text-sm font-semibold cursor-not-allowed border border-slate-200"
            >
              Out of Stock
            </button>
            <p className="text-xs text-rose-600 mt-1.5 font-medium">Currently Unavailable</p>
            
            {/* RFQ Button for out of stock items (wholesale only) */}
            {user?.userType === 'WHOLESALE' && (
              <div className="mt-2">
                <RFQButton 
                  product={product} 
                  userType={user.userType}
                  variant="secondary"
                  className="w-full text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Lightbox */}
      {showLightbox && (
        <ImageZoomLightbox
          images={[product.imageUrl]}
          currentIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
          onNext={() => setLightboxIndex(0)}
          onPrevious={() => setLightboxIndex(0)}
          alt={product.name}
        />
      )}
    </div>
  );
}
