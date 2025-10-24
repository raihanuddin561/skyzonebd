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
    const minQty = (user && user.userType === 'wholesale') ? minOrderQuantity : 1;
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
          <h1 className="text-3xl font-bold mb-8">Your Cart</h1>
          
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Your Cart</h1>
          <button
            onClick={() => {
              clearCart();
              toast.success('Cart cleared');
            }}
            className="text-red-600 hover:text-red-700 font-medium cursor-pointer"
          >
            Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="flex gap-4">
                    <Image
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      width={120}
                      height={120}
                      className="w-24 h-24 object-cover rounded"
                    />
                    
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">{item.product.companyName}</p>
                      {/* Show MOQ only for wholesale users */}
                      {user && user.userType === 'wholesale' && (
                        <p className="text-sm text-gray-500">MOQ: {item.product.minOrderQuantity}</p>
                      )}
                      <p className="text-lg font-bold text-blue-700">৳{item.product.price.toLocaleString()}</p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2">
                          <label htmlFor={`cart-quantity-${item.product.id}`} className="text-sm text-gray-600">
                            Qty:
                          </label>
                          <input
                            id={`cart-quantity-${item.product.id}`}
                            type="number"
                            min={(user && user.userType === 'wholesale') ? item.product.minOrderQuantity : 1}
                            value={item.quantity}
                            onChange={(e) => {
                              const minQty = (user && user.userType === 'wholesale') ? item.product.minOrderQuantity : 1;
                              handleQuantityChange(
                                item.product.id, 
                                parseInt(e.target.value) || minQty,
                                item.product.minOrderQuantity
                              );
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        
                        <button
                          onClick={() => {
                            removeFromCart(item.product.id);
                            toast.success('Item removed from cart');
                          }}
                          className="text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-2">
                        Subtotal: ৳{(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 border rounded-lg p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-medium">{getTotalItems()}</span>
                </div>
                
                <div className="flex justify-between text-lg font-bold border-t pt-3">
                  <span>Total Amount:</span>
                  <span className="text-blue-700">৳{getTotalPrice().toLocaleString()}</span>
                </div>
              </div>
              
              <button
                onClick={handleProceedToCheckout}
                disabled={isProcessing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Proceed to Checkout'}
              </button>
              
              <Link 
                href="/"
                className="block w-full text-center text-blue-600 hover:text-blue-700 font-medium mt-4 cursor-pointer"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
