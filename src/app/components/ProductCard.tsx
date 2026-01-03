'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/types/cart';
import { toast } from 'react-toastify';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { user } = useAuth();
  
  // Determine minimum order quantity based on user type
  // ONLY wholesale users have MOQ requirement, guests and retail customers start at 1
  const effectiveMinQty = (user && user.userType === 'WHOLESALE') ? product.minOrderQuantity : 1;
  const [quantity, setQuantity] = useState(effectiveMinQty);
  const [isAdding, setIsAdding] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // Fix hydration by ensuring client-side rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleAddToCart = async () => {
    setIsAdding(true);
    
    // Ensure quantity meets minimum order requirement based on user type
    // Wholesale users must meet MOQ, guests/retail can order from 1
    const finalQuantity = Math.max(quantity, effectiveMinQty);
    
    try {
      console.log('ProductCard - Adding to cart:', product.name, 'quantity:', finalQuantity);
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

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = parseInt(e.target.value) || effectiveMinQty;
    setQuantity(Math.max(newQuantity, effectiveMinQty));
  };

  return (
    <div className="p-3 sm:p-4 bg-white border rounded-xl shadow hover:shadow-lg transition-all relative group">
      {/* Wishlist Button - Better touch target */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-2 right-2 w-9 h-9 sm:w-8 sm:h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 z-10 cursor-pointer touch-manipulation transition-transform hover:scale-110"
        aria-label={isClient && isInWishlist(product.id) ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg 
          className={`w-5 h-5 sm:w-4 sm:h-4 ${isClient && isInWishlist(product.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
          fill={isClient && isInWishlist(product.id) ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <Link href={`/products/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-lg mb-3">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={300}
            height={200}
            className="w-full h-36 sm:h-40 lg:h-44 object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
          />
        </div>
      </Link>
      
      <Link href={`/products/${product.id}`} className="hover:text-blue-600 transition-colors">
        <h4 className="text-sm sm:text-base font-semibold mb-2 cursor-pointer text-gray-900 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
          {product.name}
        </h4>
      </Link>
      
      {/* Show MOQ ONLY for wholesale users, NOT for guests or retail */}
      {isClient && user && user.userType === 'WHOLESALE' && (
        <p className="text-xs sm:text-sm text-gray-600 mb-2">MOQ: {product.minOrderQuantity} units</p>
      )}
      
      {/* Availability Badge */}
      <div className="mb-2 sm:mb-3">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          product.availability === 'in_stock' 
            ? 'bg-green-100 text-green-800' 
            : product.availability === 'limited'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {product.availability === 'in_stock' ? '✓ In Stock' : 
           product.availability === 'limited' ? '⚠ Limited' : '✗ Out of Stock'}
        </span>
      </div>
      
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <p className="text-base sm:text-lg lg:text-xl text-blue-700 font-bold">
          ৳{product.price.toLocaleString()}
          {product.unit && <span className="text-sm text-gray-600 font-normal">/{product.unit}</span>}
        </p>
        {product.rating && (
          <div className="flex items-center">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-xs sm:text-sm text-gray-600 ml-1">{product.rating}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3 truncate">{product.companyName}</p>
      
      {/* Quantity Input - Only show if product is available */}
      {(product.availability === 'in_stock' || product.availability === 'limited') && (
        <div className="mb-3">
          <label htmlFor={`quantity-${product.id}`} className="block text-xs sm:text-sm text-gray-600 mb-1.5 font-medium">
            Quantity {(user && user.userType === 'WHOLESALE' && product.minOrderQuantity && product.minOrderQuantity > 0) ? `(Min: ${product.minOrderQuantity})` : ''}
          </label>
          <input
            id={`quantity-${product.id}`}
            type="number"
            min={effectiveMinQty}
            value={quantity}
            onChange={handleQuantityChange}
            className="w-full px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-text transition-all"
            suppressHydrationWarning
          />
        </div>
      )}
      
      {/* Add to Cart Button - Only show if product is available */}
      {product.availability === 'in_stock' || product.availability === 'limited' ? (
        <>
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer touch-manipulation shadow-sm hover:shadow-md active:scale-95"
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
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to Cart
              </span>
            )}
          </button>
          
          {/* Total Price Preview */}
          <p className="text-xs sm:text-sm text-gray-600 mt-2 text-center font-medium">
            Total: <span className="text-blue-600 font-semibold">৳{isClient ? (product.price * quantity).toLocaleString() : (product.price * effectiveMinQty).toLocaleString()}</span>
          </p>
        </>
      ) : (
        <div className="text-center">
          <button
            disabled
            className="w-full bg-gray-300 text-gray-600 py-2.5 sm:py-3 px-3 rounded-lg text-sm sm:text-base font-semibold cursor-not-allowed"
          >
            Out of Stock
          </button>
          <p className="text-xs sm:text-sm text-red-600 mt-2 font-medium">Currently Unavailable</p>
        </div>
      )}
    </div>
  );
}
