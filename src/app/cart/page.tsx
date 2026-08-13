'use client'

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'react-toastify';
import ImageZoomLightbox from '@/components/common/ImageZoomLightbox';
import QuantityInput from '@/components/common/QuantityInput';
import { getLineTotal } from '@/utils/cartPricing';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice } = useCart();
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

          <div className="text-center py-16 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <svg className="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">Add some products to get started with your B2B order.</p>
            <Link
              href="/products"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
        <Footer />
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
                <div key={item.product.id} className="bg-white border border-gray-100 rounded-xl p-3 sm:p-4 shadow-sm hover:border-blue-200 transition-colors">
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {/* Product Image with Zoom */}
                    <div 
                      className="flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden cursor-pointer group relative"
                      onClick={() => setLightboxImage(item.product.imageUrl)}
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full sm:w-24 h-32 sm:h-24 object-contain p-2 transition-transform group-hover:scale-110"
                      />
                      {/* Zoom indicator */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="bg-white/90 rounded-full p-1.5">
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                        </div>
                      </div>
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
                        ৳{(typeof item.product.price === 'number' ? item.product.price : 0).toLocaleString()}
                        {item.product.unit && <span className="text-xs text-gray-600">/{item.product.unit}</span>}
                      </p>
                      
                      {/* Quantity Controls and Actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-3">
                        {/* Quantity Input with validation */}
                        <div className="flex-1 sm:flex-initial">
                          <QuantityInput
                            value={item.quantity}
                            onChange={(newQty) => handleQuantityChange(item.product.id, newQty, item.product.minOrderQuantity || 1)}
                            min={(user && user.userType === 'WHOLESALE') ? (item.product.minOrderQuantity || 1) : 1}
                            max={item.product.stock || undefined}
                            showLabel={false}
                          />
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
                          <span className="font-bold text-blue-700">৳{getLineTotal(item.product, item.quantity).toLocaleString()}</span>
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
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 sm:p-6 lg:sticky lg:top-4 overflow-hidden">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-semibold text-gray-900">{getTotalItems()}</span>
                </div>

                <div className="flex justify-between items-center text-base sm:text-lg font-bold border-t border-gray-100 pt-3">
                  <span className="text-gray-900">Total Amount:</span>
                  <span className="text-blue-700">৳{getTotalPrice().toLocaleString()}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToCheckout}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all cursor-pointer text-sm sm:text-base flex items-center justify-center gap-2"
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

              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
                </svg>
                Secure checkout &middot; Verified sellers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox */}
      {lightboxImage && (
        <ImageZoomLightbox
          images={[lightboxImage]}
          currentIndex={0}
          onClose={() => setLightboxImage(null)}
          onNext={() => {}}
          onPrevious={() => {}}
          alt="Product image"
        />
      )}

      <Footer />
    </main>
  );
}
