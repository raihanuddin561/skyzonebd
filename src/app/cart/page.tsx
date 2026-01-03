'use client'

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Header from '../components/Header';
import { toast } from 'react-toastify';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug: Log cart items
  console.log('Cart page - Cart items:', items, 'Count:', items.length);

  const handleQuantityChange = (productId: string | number, newQuantity: number, minOrderQuantity: number) => {
    // Only enforce MOQ for wholesale users, guests and retail can order any quantity >= 1
    const minQty = (user && user.userType === 'WHOLESALE') ? minOrderQuantity : 1;
    const finalQuantity = Math.max(newQuantity, minQty);
    updateQuantity(productId, finalQuantity);
    toast.info('Cart updated');
  };

  const handleProceedToCheckout = () => {
    setIsProcessing(true);
    // Redirect to checkout page
    setTimeout(() => {
      window.location.href = '/checkout';
    }, 500);
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-white text-gray-800">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Your Cart</h1>
          
          <div className="text-center py-16">
            <div className="mb-4">
              <svg className="mx-auto h-24 w-24 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-600 mb-4">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">Add some products to get started with your B2B order.</p>
            <Link 
              href="/" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Cart ({getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'})</h1>
          <button
            onClick={() => {
              clearCart();
              toast.success('Cart cleared');
            }}
            className="text-red-600 hover:text-red-700 font-medium cursor-pointer text-sm sm:text-base flex items-center gap-1"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      <Image
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        width={120}
                        height={120}
                        className="w-full sm:w-24 h-32 sm:h-24 object-cover rounded"
                      />
                    </div>
                    
                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        href={`/products/${item.product.id}`}
                        className="text-base sm:text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors inline-block line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">{item.product.companyName}</p>
                      
                      {/* Show MOQ only for wholesale users and if MOQ is set */}
                      {user && user.userType === 'WHOLESALE' && item.product.minOrderQuantity && item.product.minOrderQuantity > 0 && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">MOQ: {item.product.minOrderQuantity}</p>
                      )}
                      
                      {/* Price */}
                      <p className="text-lg sm:text-xl font-bold text-blue-700 mt-2">
                        ৳{item.product.price.toLocaleString()}
                        {item.product.unit && <span className="text-xs text-gray-600">/{item.product.unit}</span>}
                      </p>
                      
                      {/* Quantity Controls and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-3">
                        {/* Quantity Controls with +/- Buttons */}
                        <div className="flex items-center">
                          <span className="text-xs sm:text-sm text-gray-600 mr-2">Qty:</span>
                          <div className="flex items-center border-2 border-gray-300 rounded-lg overflow-hidden shadow-sm">
                            {/* Decrease Button */}
                            <button
                              onClick={() => {
                                const minQty = (user && user.userType === 'WHOLESALE') ? (item.product.minOrderQuantity || 1) : 1;
                                const newQty = Math.max(item.quantity - 1, minQty);
                                handleQuantityChange(item.product.id, newQty, item.product.minOrderQuantity || 1);
                              }}
                              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-600 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-700 group"
                              disabled={item.quantity <= ((user && user.userType === 'WHOLESALE') ? (item.product.minOrderQuantity || 1) : 1)}
                              aria-label="Decrease quantity"
                            >
                              <svg 
                                className="w-4 h-4 sm:w-5 sm:h-5" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                                strokeWidth="3"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                              </svg>
                            </button>
                            
                            {/* Quantity Display */}
                            <div className="w-14 sm:w-16 h-9 sm:h-10 flex items-center justify-center bg-white text-gray-900 font-bold text-base sm:text-lg border-x-2 border-gray-300">
                              {item.quantity}
                            </div>
                            
                            {/* Increase Button */}
                            <button
                              onClick={() => {
                                handleQuantityChange(item.product.id, item.quantity + 1, item.product.minOrderQuantity || 1);
                              }}
                              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-600 transition-all duration-200 cursor-pointer group"
                              aria-label="Increase quantity"
                            >
                              <svg 
                                className="w-4 h-4 sm:w-5 sm:h-5" 
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
                        
                        {/* Remove Button */}
                        <button
                          onClick={() => {
                            removeFromCart(item.product.id);
                            toast.success('Item removed from cart');
                          }}
                          className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium cursor-pointer flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Remove
                        </button>
                      </div>
                      
                      {/* Subtotal */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm sm:text-base text-gray-900">
                          <span className="text-gray-600">Subtotal: </span>
                          <span className="font-bold text-blue-700">৳{(item.product.price * item.quantity).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border rounded-lg p-4 sm:p-6 lg:sticky lg:top-4">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-semibold text-gray-900">{getTotalItems()}</span>
                </div>
                
                <div className="flex justify-between items-center text-base sm:text-lg font-bold border-t pt-3">
                  <span className="text-gray-900">Total Amount:</span>
                  <span className="text-blue-700">৳{getTotalPrice().toLocaleString()}</span>
                </div>
              </div>
              
              <button
                onClick={handleProceedToCheckout}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
              
              <Link 
                href="/"
                className="block w-full text-center text-blue-600 hover:text-blue-700 font-medium mt-4 cursor-pointer text-sm sm:text-base"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
