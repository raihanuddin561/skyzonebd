'use client'

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import Head from 'next/head';

export default function WishlistPage() {
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [addingToCart, setAddingToCart] = useState<number | null>(null);

  const handleAddToCart = async (product: any) => {
    setAddingToCart(product.id);
    
    try {
      // Use MOQ for wholesale (if set), otherwise 1
      const quantity = (user?.userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1;
      addToCart(product, quantity);
      toast.success(`Added ${product.name} to cart`);
    } catch (error) {
      toast.error('Failed to add item to cart');
      console.error('Error adding to cart:', error);
    } finally {
      setAddingToCart(null);
    }
  };

  const handleRemoveFromWishlist = (productId: string | number) => {
    removeFromWishlist(productId);
    toast.info('Removed from wishlist');
  };

  const handleClearWishlist = () => {
    clearWishlist();
    toast.success('Wishlist cleared');
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">My Wishlist</h1>

          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <svg className="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-8">
              Save items you're interested in to your wishlist
            </p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Browse Products
            </Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Wishlist</h1>
          <button
            onClick={handleClearWishlist}
            className="text-red-600 hover:text-red-700 font-medium cursor-pointer text-sm sm:text-base flex items-center gap-1"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Wishlist
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((product) => (
            <div key={product.id} className="card-hover bg-white border border-gray-100 rounded-xl shadow-sm hover:border-blue-200 transition-colors overflow-hidden">
              <div className="relative">
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={300}
                  height={200}
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={() => handleRemoveFromWishlist(product.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-100 cursor-pointer transition-transform hover:scale-110"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2 text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{product.companyName}</p>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-blue-700">
                    ৳{product.price.toLocaleString()}
                    {product.unit && <span className="text-sm text-gray-600">/{product.unit}</span>}
                  </span>
                  {product.rating && (
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="text-sm text-gray-600 ml-1">{product.rating}</span>
                    </div>
                  )}
                </div>
                {/* Show MOQ only for wholesale users and if MOQ is set */}
                {user && user.userType === 'WHOLESALE' && product.minOrderQuantity && product.minOrderQuantity > 0 && (
                  <p className="text-sm text-gray-500 mb-4">
                    MOQ: {product.minOrderQuantity} units
                  </p>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={addingToCart === product.id}
                    className={`w-full py-2.5 px-4 rounded-lg font-semibold transition-all cursor-pointer ${
                      addingToCart === product.id
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {addingToCart === product.id ? 'Adding...' : 'Add to Cart'}
                  </button>

                  <Link
                    href={`/products/${product.id}`}
                    className="block w-full py-2 px-4 border border-gray-200 rounded-lg font-medium text-center text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-8 bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Wishlist Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-700">{items.length}</div>
              <div className="text-gray-600">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ৳{items.reduce((total, item) => total + item.price, 0).toLocaleString()}
              </div>
              <div className="text-gray-600">Total Value</div>
            </div>
            {/* Show min order units only for wholesale users */}
            {user?.userType === 'WHOLESALE' && (
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {items.reduce((total, item) => total + (item.minOrderQuantity || 0), 0)}
                </div>
                <div className="text-gray-600">Min Order Units</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
