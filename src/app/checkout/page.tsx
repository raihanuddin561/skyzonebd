'use client'

import { useCart } from '@/contexts/CartContext';
import { getLineTotal } from '@/utils/cartPricing';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { toast } from 'react-toastify';

interface PaymentConfig {
  id: string;
  type: string;
  name: string;
  accountNumber?: string;
  accountName?: string;
  accountType?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  instructions?: string;
  logoUrl?: string;
  priority: number;
}

export default function CheckoutPage() {
  const { items, getTotalItems, getTotalPrice, clearCart, isLoaded } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  // Passed into getLineTotal below so the previewed per-item/order total
  // matches what POST /api/orders will actually charge (tier price, then
  // this discount on top — see src/utils/cartPricing.ts).
  const customerDiscount = user ? { discountPercent: user.discountPercent, discountValidUntil: user.discountValidUntil } : null;



  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutType, setCheckoutType] = useState<'guest' | 'user'>('guest');
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);
  const [orderData, setOrderData] = useState({
    shippingAddress: '',
    billingAddress: '',
    paymentMethod: 'bank_transfer',
    notes: '',
    paymentReference: '' // Transaction ID for manual payments
  });
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    mobile: '',
    companyName: ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Fetch payment configurations
  useEffect(() => {
    const fetchPaymentConfigs = async () => {
      try {
        const response = await fetch('/api/payment-config');
        const result = await response.json();
        if (result.success) {
          setPaymentConfigs(result.data);
        }
      } catch (error) {
        console.error('Error fetching payment configs:', error);
      }
    };
    fetchPaymentConfigs();
  }, []);

  // Update checkout type when user changes
  useEffect(() => {
    if (user) {
      setCheckoutType('user');
    } else {
      setCheckoutType('guest');
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOrderData(prev => ({
      ...prev,
      [name]: value
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleGuestInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestInfo(prev => ({
      ...prev,
      [name]: value
    }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handlePlaceOrder = async () => {
    const errors: Record<string, string> = {};

    // In Bangladesh, shipping and billing addresses are almost always the same —
    // only require at least one of the two, and mirror it into the other below.
    const shippingFilled = orderData.shippingAddress.trim().length > 0;
    const billingFilled = orderData.billingAddress.trim().length > 0;
    if (!shippingFilled && !billingFilled) {
      errors.shippingAddress = 'Shipping Address is required (or fill in Billing Address instead)';
      errors.billingAddress = 'Billing Address is required (or fill in Shipping Address instead)';
    }

    // Validate payment reference for manual payment methods
    if ((orderData.paymentMethod === 'bkash' || orderData.paymentMethod === 'bank_transfer') && !orderData.paymentReference) {
      errors.paymentReference = 'Transaction ID / Reference Number is required for this payment method';
    } else if (orderData.paymentReference && orderData.paymentReference.length < 5) {
      errors.paymentReference = 'Transaction ID must be at least 5 characters';
    }

    // For guest checkout, validate required fields
    if (checkoutType === 'guest' && !user) {
      if (!guestInfo.name.trim()) {
        errors.name = 'Full Name is required';
      }
      if (!guestInfo.mobile.trim()) {
        errors.mobile = 'Mobile Number is required';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstErrorField = Object.keys(errors)[0];
      const el = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement | null;
      el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      el?.focus?.();
      return;
    }
    setFieldErrors({});

    // For logged-in users, validate they have required info
    if (user && (!user.name || !user.phone)) {
      toast.error('Please update your profile with name and phone number');
      return;
    }

    // A logged-in user's token can expire while they're sitting on this page.
    // AuthContext only checks expiry once at load, so `user` can still be
    // populated from stale state/localStorage even though the token is dead.
    // Submitting in that state used to silently fall back to the guest order
    // path server-side (since the expired token fails verification) and
    // produce a confusing "Guest name and mobile number are required" error.
    // Catch that here and prompt for a fresh login instead.
    if (checkoutType === 'user' && user) {
      const token = localStorage.getItem('token');
      let isExpired = !token;
      if (token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Date.now() / 1000;
            if (payload.exp && payload.exp < now) {
              isExpired = true;
            }
          }
        } catch {
          isExpired = true;
        }
      }

      if (isExpired) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        toast.error('Your session has expired — please log in again.');
        router.push('/auth/login?redirect=/checkout');
        return;
      }
    }

    // Mirror the filled address into the empty one so both are always populated
    const finalShippingAddress = shippingFilled ? orderData.shippingAddress : orderData.billingAddress;
    const finalBillingAddress = billingFilled ? orderData.billingAddress : orderData.shippingAddress;

    setIsProcessing(true);

    try {
      const orderPayload = {
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          total: getLineTotal(item.product, item.quantity, customerDiscount)
        })),
        shippingAddress: finalShippingAddress,
        billingAddress: finalBillingAddress,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        paymentReference: orderData.paymentReference || undefined, // Include transaction ID
        ...(checkoutType === 'guest' && { guestInfo })
      };

      // Call the actual API to create the order
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add auth header if user is logged in
      if (token && checkoutType === 'user') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log('🚀 Sending order to API:', {
        url: '/api/orders',
        method: 'POST',
        hasToken: !!token,
        itemsCount: orderPayload.items.length
      });

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload)
      });

      console.log('📨 API Response status:', response.status, response.statusText);

      // Clone response to read it multiple times if needed
      const responseClone = response.clone();

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('❌ API Error Response:', errorData);
          console.error('❌ Error field:', errorData?.error);
          console.error('❌ Success field:', errorData?.success);
          errorMessage = errorData?.error || errorData?.message || errorMessage;
          console.error('❌ Final error message:', errorMessage);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          try {
            const textResponse = await responseClone.text();
            console.error('❌ Response text:', textResponse);
          } catch (e) {
            console.error('❌ Could not read response');
          }
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('✅ Order API response:', result);

      if (result.success && result.data.order) {
        const order = result.data.order;
        
        // Store order details temporarily for confirmation page
        localStorage.setItem('lastOrderItems', JSON.stringify(order.items));
        localStorage.setItem('lastShippingAddress', order.shippingAddress);
        localStorage.setItem('lastBillingAddress', order.billingAddress);
        localStorage.setItem('lastPaymentMethod', order.paymentMethod);
        localStorage.setItem('lastOrderTotal', order.total.toString());
        localStorage.setItem('lastOrderId', order.orderId);
        
        // Show different success messages based on payment method
        if (orderData.paymentMethod === 'bkash' || orderData.paymentMethod === 'bank_transfer') {
          toast.success('Order submitted! Payment verification pending.', { autoClose: 5000 });
        } else {
          toast.success('Order placed successfully!');
        }
        
        setIsProcessing(false);
        
        // Redirect to order confirmation page FIRST
        router.push(`/order-confirmation?orderId=${order.orderId}`);
        
        // Clear cart AFTER navigation to prevent race condition
        setTimeout(() => {
          clearCart();
        }, 500);
      } else {
        console.error('❌ Invalid API response structure:', result);
        throw new Error('Invalid API response');
      }
    } catch (error) {
      console.error('❌ Checkout error:', error);
      toast.error(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  // Show loading state while cart is being loaded from localStorage
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Checkout</h1>
        
        {items.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-6">
              <svg className="h-12 w-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-8">Add some products before proceeding to checkout.</p>
            <a
              href="/"
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Continue Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Checkout Type Selection */}
              {!user && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Checkout Options</h2>
                  
                  {/* Guest Welcome Message */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-green-800">
                        <strong>Welcome Guest Customer!</strong>
                        <p className="mt-1">You can place orders as a guest without creating an account. Simply provide your contact information below.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setCheckoutType('guest')}
                      className={`flex-1 p-4 border-2 rounded-xl text-center cursor-pointer transition-colors ${
                        checkoutType === 'guest'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                        Guest Checkout
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Quick checkout without account
                      </div>
                    </button>
                    <button
                      onClick={() => router.push('/auth/login?redirect=/checkout')}
                      className="flex-1 p-4 border-2 border-gray-200 rounded-xl text-center hover:border-gray-300 cursor-pointer transition-colors"
                    >
                      <div className="font-medium flex items-center justify-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Login &amp; Checkout
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Save order history &amp; track orders
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* User Information */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">
                  {user ? 'Account Information' : 'Contact Information'}
                </h2>
                {user ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-gray-900">{user.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company</label>
                      <p className="mt-1 text-gray-900">{user.companyName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-gray-900">{user.phone}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="guestName"
                        name="name"
                        type="text"
                        required
                        value={guestInfo.name}
                        onChange={handleGuestInfoChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 cursor-text ${fieldErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                        placeholder="Enter your full name"
                      />
                      {fieldErrors.name && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {fieldErrors.name}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="guestMobile" className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        id="guestMobile"
                        name="mobile"
                        type="tel"
                        required
                        value={guestInfo.mobile}
                        onChange={handleGuestInfoChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 cursor-text ${fieldErrors.mobile ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                        placeholder="+880-1711-123456"
                      />
                      {fieldErrors.mobile && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          {fieldErrors.mobile}
                        </p>
                      )}
                    </div>
                    <div>
                      <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email (Optional)
                      </label>
                      <input
                        id="guestEmail"
                        name="email"
                        type="email"
                        value={guestInfo.email}
                        onChange={handleGuestInfoChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text"
                        placeholder="your.email@example.com"
                      />
                    </div>
                    <div>
                      <label htmlFor="guestCompany" className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name (Optional)
                      </label>
                      <input
                        id="guestCompany"
                        name="companyName"
                        type="text"
                        value={guestInfo.companyName}
                        onChange={handleGuestInfoChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text"
                        placeholder="Your Company Ltd."
                      />
                    </div>
                  </div>
                )}
              </div>

                {/* Shipping Information */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-semibold mb-1 text-gray-900">Shipping Address</h2>
                  <p className="text-xs text-gray-500 mb-3">Same as billing? You only need to fill in one of the two addresses.</p>
                  <textarea
                    name="shippingAddress"
                    value={orderData.shippingAddress}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${fieldErrors.shippingAddress ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Enter your complete shipping address..."
                  />
                  {fieldErrors.shippingAddress && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {fieldErrors.shippingAddress}
                    </p>
                  )}
                </div>

                {/* Billing Information */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-semibold mb-1 text-gray-900">Billing Address</h2>
                  <p className="text-xs text-gray-500 mb-3">Same as shipping? You only need to fill in one of the two addresses.</p>
                  <textarea
                    name="billingAddress"
                    value={orderData.billingAddress}
                    onChange={handleInputChange}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${fieldErrors.billingAddress ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="Enter your billing address..."
                  />
                  {fieldErrors.billingAddress && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {fieldErrors.billingAddress}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Payment Method</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: 'bank_transfer', label: 'Bank Transfer', desc: 'Direct bank transfer', icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M4 10h16M12 3L3 8h18l-9-5zm-6 7v7m4-7v7m4-7v7m4-7v7" />
                      ) },
                      { value: 'cash_on_delivery', label: 'Cash on Delivery', desc: 'Pay when you receive', icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) },
                      { value: 'bkash', label: 'bKash', desc: 'Mobile banking', icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      ) },
                      { value: 'nagad', label: 'Nagad', desc: 'Digital wallet', icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      ) },
                      { value: 'credit_card', label: 'Credit Card', desc: 'Visa, MasterCard', icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h5M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      ) },
                      { value: 'rocket', label: 'Rocket', desc: 'Mobile banking', icon: (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3 7h-6l3-7zM9 9v9a3 3 0 006 0V9M9 9H5.5L4 13m5-4h6m0 0h3.5L20 13M9 18l-2 3m8-3l2 3" />
                      ) },
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                          orderData.paymentMethod === method.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={orderData.paymentMethod === method.value}
                          onChange={handleInputChange}
                          className="mr-3 cursor-pointer"
                        />
                        <div className="flex items-center">
                          <span className="w-9 h-9 mr-3 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {method.icon}
                            </svg>
                          </span>
                          <div>
                            <div className="font-medium">{method.label}</div>
                            <div className="text-sm text-gray-600">{method.desc}</div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Payment Instructions */}
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    {orderData.paymentMethod === 'bank_transfer' && (() => {
                      const bankConfig = paymentConfigs.find(c => c.type === 'BANK_TRANSFER');
                      return (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-700">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M4 10h16M12 3L3 8h18l-9-5zm-6 7v7m4-7v7m4-7v7m4-7v7" />
                              </svg>
                              Bank Transfer Instructions
                            </h4>
                            {bankConfig ? (
                              <>
                                <div className="bg-white p-3 rounded-md space-y-2 mb-3">
                                  {bankConfig.bankName && (
                                    <p className="flex justify-between"><span className="font-medium">Bank Name:</span> <span>{bankConfig.bankName}</span></p>
                                  )}
                                  {bankConfig.accountName && (
                                    <p className="flex justify-between"><span className="font-medium">Account Name:</span> <span>{bankConfig.accountName}</span></p>
                                  )}
                                  {bankConfig.accountNumber && (
                                    <p className="flex justify-between"><span className="font-medium">Account Number:</span> <span className="font-mono">{bankConfig.accountNumber}</span></p>
                                  )}
                                  {bankConfig.routingNumber && (
                                    <p className="flex justify-between"><span className="font-medium">Routing Number:</span> <span className="font-mono">{bankConfig.routingNumber}</span></p>
                                  )}
                                  {bankConfig.branchName && (
                                    <p className="flex justify-between"><span className="font-medium">Branch:</span> <span>{bankConfig.branchName}</span></p>
                                  )}
                                </div>
                                {bankConfig.instructions && (
                                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
                                    <p className="text-xs text-blue-800">{bankConfig.instructions}</p>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="bg-white p-3 rounded-md mb-3">
                                <p className="text-gray-500">Bank transfer details not configured. Please contact support.</p>
                              </div>
                            )}
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3 flex items-start gap-1.5">
                              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="text-xs text-amber-800">
                                <strong>Important:</strong> After transferring, please enter your bank transaction reference below.
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <label htmlFor="bankTransferRef" className="block text-sm font-semibold text-gray-900 mb-2">
                              Bank Transaction Reference / ID *
                            </label>
                            <input
                              id="bankTransferRef"
                              name="paymentReference"
                              type="text"
                              value={orderData.paymentReference}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 ${fieldErrors.paymentReference ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'}`}
                              placeholder="Enter transaction reference number"
                              minLength={5}
                            />
                            {fieldErrors.paymentReference ? (
                              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {fieldErrors.paymentReference}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">This will help us verify your payment quickly.</p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {orderData.paymentMethod === 'bkash' && (() => {
                      const bkashConfig = paymentConfigs.find(c => c.type === 'BKASH');
                      return (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-700">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              bKash Payment Instructions
                            </h4>
                            {bkashConfig ? (
                              <>
                                <div className="bg-white p-3 rounded-md space-y-2 mb-3">
                                  {bkashConfig.accountType && (
                                    <p className="flex justify-between"><span className="font-medium">bKash Type:</span> <span className="text-pink-600 font-semibold">{bkashConfig.accountType}</span></p>
                                  )}
                                  {bkashConfig.accountNumber && (
                                    <p className="flex justify-between"><span className="font-medium">Account Number:</span> <span className="font-mono text-lg">{bkashConfig.accountNumber}</span></p>
                                  )}
                                  {bkashConfig.accountName && (
                                    <p className="flex justify-between"><span className="font-medium">Account Name:</span> <span>{bkashConfig.accountName}</span></p>
                                  )}
                                  <p className="flex justify-between"><span className="font-medium">Amount to Send:</span> <span className="text-green-600 font-bold">৳{getTotalPrice().toLocaleString()}</span></p>
                                </div>
                                {bkashConfig.instructions ? (
                                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2 mb-3">
                                    <p className="text-xs text-blue-800 whitespace-pre-wrap">{bkashConfig.instructions}</p>
                                  </div>
                                ) : (
                                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                                    <p className="text-xs text-blue-900 font-medium mb-2 flex items-center gap-1.5">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                      </svg>
                                      How to Pay:
                                    </p>
                                    <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                                      <li>Go to bKash menu on your phone</li>
                                      <li>Select "Send Money" or "Payment"</li>
                                      <li>Enter account number: <strong>{bkashConfig.accountNumber}</strong></li>
                                      <li>Enter amount: <strong>৳{getTotalPrice().toLocaleString()}</strong></li>
                                      <li>Complete the payment</li>
                                      <li>Enter the Transaction ID below</li>
                                    </ol>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="bg-white p-3 rounded-md mb-3">
                                <p className="text-gray-500">bKash payment details not configured. Please contact support.</p>
                              </div>
                            )}
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3 flex items-start gap-1.5">
                              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <p className="text-xs text-amber-800">
                                <strong>Important:</strong> Please enter the exact Transaction ID you received from bKash.
                              </p>
                            </div>
                          </div>
                          
                          <div>
                            <label htmlFor="bkashTrxId" className="block text-sm font-semibold text-gray-900 mb-2">
                              bKash Transaction ID (TrxID) *
                            </label>
                            <input
                              id="bkashTrxId"
                              name="paymentReference"
                              type="text"
                              value={orderData.paymentReference}
                              onChange={handleInputChange}
                              className={`w-full px-3 py-2 border-2 rounded-md focus:outline-none focus:ring-2 font-mono ${fieldErrors.paymentReference ? 'border-red-400 focus:ring-red-400 focus:border-red-400' : 'border-pink-300 focus:ring-pink-500 focus:border-pink-500'}`}
                              placeholder="e.g., 9AB12CD34E"
                              minLength={5}
                            />
                            {fieldErrors.paymentReference ? (
                              <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {fieldErrors.paymentReference}
                              </p>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">
                                You can find this in your bKash transaction history or SMS.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {orderData.paymentMethod === 'cash_on_delivery' && (
                      <div className="text-sm text-gray-700">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V6m0 10v2m9-8a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Cash on Delivery
                        </h4>
                        <div className="bg-green-50 border border-green-200 rounded-md p-3 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Pay in cash when your order is delivered
                          </p>
                          <p className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Available in Dhaka metropolitan area only
                          </p>
                          <p className="text-xs text-green-700 mt-2">Please keep exact change ready for smooth delivery.</p>
                        </div>
                      </div>
                    )}

                    {(orderData.paymentMethod === 'nagad' || orderData.paymentMethod === 'rocket') && (
                      <div className="text-sm text-gray-700">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          {orderData.paymentMethod === 'nagad' ? 'Nagad' : 'Rocket'} Payment
                        </h4>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                          <p className="mb-1">• You will receive detailed payment instructions after placing the order</p>
                          <p className="mb-1">• Payment must be completed within 30 minutes</p>
                          <p className="text-xs text-blue-700 mt-2">Transaction fee may apply as per your provider.</p>
                        </div>
                      </div>
                    )}

                    {orderData.paymentMethod === 'credit_card' && (
                      <div className="text-sm text-gray-700">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h5M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Credit Card Payment
                        </h4>
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-3 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Secure payment through SSL encryption
                          </p>
                          <p className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Accepts Visa, MasterCard, American Express
                          </p>
                          <p className="text-xs text-purple-700 mt-2">No additional charges for card payments.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Notes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Order Notes (Optional)</h2>
                  <textarea
                    name="notes"
                    value={orderData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Any special instructions for this order..."
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-4">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Order Summary</h2>

                  {/* Order Items */}
                  <div className="space-y-4 mb-6">
                    {items.map((item) => (
                      <div key={item.product.id} className="flex items-center space-x-4">
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover bg-gray-50 border border-gray-100"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{item.product.name}</h3>
                          <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                          <p className="font-medium text-sm">৳{getLineTotal(item.product, item.quantity, customerDiscount).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-100 pt-4 space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total Items:</span>
                      <span className="font-semibold text-gray-900">{getTotalItems()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-gray-900">Total Amount:</span>
                      <span className="text-blue-700">৳{getTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-3.5 px-4 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all cursor-pointer"
                  >
                    {isProcessing ? 'Processing Order...' : 'Place Order'}
                  </button>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-xs text-gray-500">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
                    </svg>
                    Your information is secure &amp; encrypted
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </main>
    );
}
