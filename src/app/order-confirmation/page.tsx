'use client'

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';

interface Order {
  id: number;
  orderId: string;
  items: any[];
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function OrderConfirmationPage() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // Simulate getting order details from API or local storage
    // In a real app, you'd fetch from your API
    
    // Get data from localStorage
    const itemsData = localStorage.getItem('lastOrderItems');
    const shippingData = localStorage.getItem('lastShippingAddress');
    const billingData = localStorage.getItem('lastBillingAddress');
    const paymentData = localStorage.getItem('lastPaymentMethod');
    const totalData = localStorage.getItem('lastOrderTotal');
    
    console.log('Order Confirmation - Raw localStorage data:', {
      itemsData,
      shippingData,
      billingData,
      paymentData,
      totalData
    });
    
    let items = [];
    try {
      items = itemsData ? JSON.parse(itemsData) : [];
      console.log('Order Confirmation - Parsed items:', items);
    } catch (e) {
      console.error('Error parsing items:', e);
      items = [];
    }
    
    const mockOrder: Order = {
      id: 1,
      orderId: orderId || 'ORD-' + Date.now(),
      items: items,
      shippingAddress: shippingData || '',
      billingAddress: billingData || '',
      paymentMethod: paymentData || 'bank_transfer',
      total: parseFloat(totalData || '0'),
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };

    console.log('Order Confirmation - Final order object:', mockOrder);
    setOrder(mockOrder);
    setLoading(false);

    // Clear the stored order data after a delay to ensure it's been read
    setTimeout(() => {
      localStorage.removeItem('lastOrderItems');
      localStorage.removeItem('lastShippingAddress');
      localStorage.removeItem('lastBillingAddress');
      localStorage.removeItem('lastPaymentMethod');
      localStorage.removeItem('lastOrderTotal');
    }, 1000);
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <p className="text-gray-600 mb-8">We couldn't find the order you're looking for.</p>
          <Link 
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600">Thank you for your order. We've received your request and will process it shortly.</p>
        </div>

        {/* Order Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Order Information</h2>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Order ID:</span>
                  <span className="ml-2 font-medium">{order.orderId}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Status:</span>
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {order.status}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Payment Method:</span>
                  <span className="ml-2 font-medium capitalize">
                    {order.paymentMethod.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Payment Status</h2>
              <div className="space-y-2">
                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    Pending Payment
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <p>Your order will be processed within 1-2 business days.</p>
                  <p>You'll receive an email confirmation shortly.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
            
            {order.items && order.items.length > 0 ? (
              <>
                <div className="space-y-4">
                  {order.items.map((item: any, index: number) => {
                    const itemName = item.name || item.product?.name || 'Product';
                    const itemPrice = item.price || item.product?.price || 0;
                    const itemQuantity = item.quantity || 1;
                    const itemTotal = itemPrice * itemQuantity;
                    
                    console.log('Rendering item:', { item, itemName, itemPrice, itemQuantity, itemTotal });
                    
                    return (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{itemName}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-gray-600">Qty: {itemQuantity}</p>
                            <p className="text-sm text-gray-600">× ৳{itemPrice.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            ৳{itemTotal.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Order Summary */}
                <div className="mt-6 pt-4 border-t-2 border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({order.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0)} items)</span>
                    <span className="font-medium text-gray-900">
                      ৳{order.items.reduce((sum: number, item: any) => {
                        const price = item.price || item.product?.price || 0;
                        const quantity = item.quantity || 1;
                        return sum + (price * quantity);
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="font-medium text-green-600">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT / Tax</span>
                    <span className="font-medium text-gray-900">৳0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-medium text-gray-900">৳0</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-gray-300">
                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ৳{order.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-gray-600 mb-2">No order items found</p>
                <p className="text-sm text-gray-500">Your order has been placed successfully</p>
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 inline-block">
                  <p className="text-sm font-medium text-gray-900">Order Total: ৳{order.total.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Shipping Address</h3>
              <p className="text-gray-700 whitespace-pre-line">{order.shippingAddress}</p>
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Next?</h3>
          <div className="space-y-2 text-blue-800">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Order confirmation email sent to your registered email</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Our team will contact you within 24 hours to confirm details</span>
            </div>
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Processing will begin after payment confirmation</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/"
            className="flex-1 bg-blue-600 text-white text-center py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Continue Shopping
          </Link>
          <Link 
            href="/profile"
            className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer"
          >
            View Profile
          </Link>
        </div>

        {/* Support Contact */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Need help with your order? Contact us at:</p>
          <p className="font-medium">
            Email: support@skyzonebd.com | Phone: +880-1711-123456
          </p>
        </div>
      </div>
    </main>
  );
}