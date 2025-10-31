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
  const effectiveMinQty = (user && user.userType === 'wholesale') ? product.minOrderQuantity : 1;
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
    <div className="p-4 bg-white border rounded-xl shadow hover:shadow-md transition-shadow relative">
      {/* Wishlist Button */}
      <button
        onClick={handleWishlistToggle}
        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 z-10 cursor-pointer"
      >
        <svg 
          className={`w-4 h-4 ${isClient && isInWishlist(product.id) ? 'text-red-500 fill-current' : 'text-gray-400'}`} 
          fill={isClient && isInWishlist(product.id) ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <Link href={`/products/${product.id}`}>
        <Image
          src={product.imageUrl}
          alt={product.name}
          width={300}
          height={200}
          className="w-full h-32 object-cover rounded mb-2 cursor-pointer hover:opacity-90 transition-opacity"
        />
      </Link>
      
      <Link href={`/products/${product.id}`} className="hover:text-blue-600 transition-colors">
        <h4 className="text-md font-semibold mb-1 cursor-pointer">{product.name}</h4>
      </Link>
      
      {/* Show MOQ ONLY for wholesale users, NOT for guests or retail */}
      {isClient && user && user.userType === 'wholesale' && (
        <p className="text-sm text-gray-600 mb-1">MOQ: {product.minOrderQuantity} units</p>
      )}
      
      {/* Availability Badge */}
      <div className="mb-2">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          product.availability === 'in_stock' 
            ? 'bg-green-100 text-green-800' 
            : product.availability === 'limited'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {product.availability === 'in_stock' ? '✓ In Stock' : 
           product.availability === 'limited' ? '⚠ Limited Stock' : '✗ Out of Stock'}
        </span>
      </div>
      
      <div className="flex items-center justify-between mb-1">
        <p className="text-lg text-blue-700 font-bold">৳{product.price.toLocaleString()}</p>
        {product.rating && (
          <div className="flex items-center">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-3">{product.companyName}</p>
      
      {/* Quantity Input - Only show if product is available */}
      {(product.availability === 'in_stock' || product.availability === 'limited') && (
        <div className="mb-3">
          <label htmlFor={`quantity-${product.id}`} className="block text-xs text-gray-600 mb-1">
            Quantity {(user && user.userType === 'wholesale') ? `(Min: ${product.minOrderQuantity})` : ''}
          </label>
          <input
            id={`quantity-${product.id}`}
            type="number"
            min={effectiveMinQty}
            value={quantity}
            onChange={handleQuantityChange}
            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-text"
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
            className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            suppressHydrationWarning
          >
            {isAdding ? 'Adding...' : 'Add to Cart'}
          </button>
          
          {/* Total Price Preview */}
          <p className="text-xs text-gray-500 mt-2 text-center">
            Total: ৳{isClient ? (product.price * quantity).toLocaleString() : (product.price * effectiveMinQty).toLocaleString()}
          </p>
        </>
      ) : (
        <div className="text-center">
          <button
            disabled
            className="w-full bg-gray-300 text-gray-600 py-2 px-3 rounded-lg text-sm font-medium cursor-not-allowed"
          >
            Out of Stock
          </button>
          <p className="text-xs text-red-600 mt-2">Currently Unavailable</p>
        </div>
      )}
    </div>
  );
}
