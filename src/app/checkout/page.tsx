'use client'

import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
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
  };

  const handleGuestInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGuestInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlaceOrder = async () => {
    if (!orderData.shippingAddress || !orderData.billingAddress) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate payment reference for manual payment methods
    if ((orderData.paymentMethod === 'bkash' || orderData.paymentMethod === 'bank_transfer') && !orderData.paymentReference) {
      toast.error('Please enter the transaction ID / reference number');
      return;
    }

    // Validate payment reference format
    if (orderData.paymentReference && orderData.paymentReference.length < 5) {
      toast.error('Transaction ID must be at least 5 characters');
      return;
    }

    // For guest checkout, validate required fields
    if (checkoutType === 'guest' && !user) {
      if (!guestInfo.name || !guestInfo.mobile) {
        toast.error('Please fill in name and mobile number');
        return;
      }
    }

    // For logged-in users, validate they have required info
    if (user && (!user.name || !user.phone)) {
      toast.error('Please update your profile with name and phone number');
      return;
    }

    setIsProcessing(true);
    
    try {
      const orderPayload = {
        items: items.map(item => ({
          productId: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          total: item.product.price * item.quantity
        })),
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress,
        paymentMethod: orderData.paymentMethod,
        notes: orderData.notes,
        paymentReference: orderData.paymentReference || undefined, // Include transaction ID
        ...(checkoutType === 'guest' && { guestInfo })
      };

      console.log('🛒 Cart items:', items.map(item => ({ id: item.product.id, name: item.product.name })));
      console.log('📦 Order payload:', orderPayload);
      console.log('🆔 Product IDs type check:', orderPayload.items.map(item => {
        const prodId = String(item.productId);
        return { 
          id: prodId, 
          type: typeof item.productId,
          isString: typeof item.productId === 'string',
          isCuid: prodId.startsWith('cm')
        };
      }));

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
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">Your cart is empty</p>
            <a href="/" className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
              Continue Shopping
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Checkout Type Selection */}
              {!user && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Checkout Options</h2>
                  
                  {/* Guest Welcome Message */}
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 text-lg">✓</span>
                      <div className="text-sm text-green-800">
                        <strong>Welcome Guest Customer!</strong>
                        <p className="mt-1">You can place orders as a guest without creating an account. Simply provide your contact information below.</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setCheckoutType('guest')}
                      className={`flex-1 p-4 border-2 rounded-lg text-center cursor-pointer transition-colors ${
                        checkoutType === 'guest'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">🛍️ Guest Checkout</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Quick checkout without account
                      </div>
                    </button>
                    <button
                      onClick={() => router.push('/auth/login?redirect=/checkout')}
                      className="flex-1 p-4 border-2 border-gray-200 rounded-lg text-center hover:border-gray-300 cursor-pointer transition-colors"
                    >
                      <div className="font-medium">👤 Login & Checkout</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Save order history & track orders
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* User Information */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text"
                        placeholder="Enter your full name"
                      />
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-text"
                        placeholder="+880-1711-123456"
                      />
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
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Shipping Address</h2>
                  <textarea
                    name="shippingAddress"
                    value={orderData.shippingAddress}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your complete shipping address..."
                    required
                  />
                </div>

                {/* Billing Information */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Billing Address</h2>
                  <textarea
                    name="billingAddress"
                    value={orderData.billingAddress}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your billing address..."
                    required
                  />
                </div>

                {/* Payment Method */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Payment Method</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', desc: 'Direct bank transfer' },
                      { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when you receive' },
                      { value: 'bkash', label: 'bKash', icon: '📱', desc: 'Mobile banking' },
                      { value: 'nagad', label: 'Nagad', icon: '📱', desc: 'Digital wallet' },
                      { value: 'credit_card', label: 'Credit Card', icon: '💳', desc: 'Visa, MasterCard' },
                      { value: 'rocket', label: 'Rocket', icon: '🚀', desc: 'Mobile banking' }
                    ].map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
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
                          <span className="text-2xl mr-3">{method.icon}</span>
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
                              🏦 Bank Transfer Instructions
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
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                              <p className="text-xs text-amber-800">
                                ⚠️ <strong>Important:</strong> After transferring, please enter your bank transaction reference below.
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
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter transaction reference number"
                              required
                              minLength={5}
                            />
                            <p className="text-xs text-gray-500 mt-1">This will help us verify your payment quickly.</p>
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
                              📱 bKash Payment Instructions
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
                                    <p className="text-xs text-blue-900 font-medium mb-2">📋 How to Pay:</p>
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
                            <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mb-3">
                              <p className="text-xs text-amber-800">
                                ⚠️ <strong>Important:</strong> Please enter the exact Transaction ID you received from bKash.
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
                              className="w-full px-3 py-2 border-2 border-pink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 font-mono"
                              placeholder="e.g., 9AB12CD34E"
                              required
                              minLength={5}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              You can find this in your bKash transaction history or SMS.
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                    
                    {orderData.paymentMethod === 'cash_on_delivery' && (
                      <div className="text-sm text-gray-700">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          💵 Cash on Delivery
                        </h4>
                        <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <p className="mb-1">✓ Pay in cash when your order is delivered</p>
                          <p className="mb-1">✓ Additional COD charge: <strong>৳50</strong></p>
                          <p className="mb-1">✓ Available in Dhaka metropolitan area only</p>
                          <p className="text-xs text-green-700 mt-2">Please keep exact change ready for smooth delivery.</p>
                        </div>
                      </div>
                    )}
                    
                    {(orderData.paymentMethod === 'nagad' || orderData.paymentMethod === 'rocket') && (
                      <div className="text-sm text-gray-700">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          📱 {orderData.paymentMethod === 'nagad' ? 'Nagad' : 'Rocket'} Payment
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
                          💳 Credit Card Payment
                        </h4>
                        <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                          <p className="mb-1">✓ Secure payment through SSL encryption</p>
                          <p className="mb-1">✓ Accepts Visa, MasterCard, American Express</p>
                          <p className="text-xs text-purple-700 mt-2">No additional charges for card payments.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Notes */}
                <div className="bg-white p-6 rounded-lg shadow-sm">
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
                <div className="bg-white p-6 rounded-lg shadow-sm sticky top-4">
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
                          className="rounded object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium text-sm">{item.product.name}</h3>
                          <p className="text-gray-500 text-sm">Qty: {item.quantity}</p>
                          <p className="font-medium text-sm">৳{(item.product.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Total Items:</span>
                      <span>{getTotalItems()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span className="text-blue-700">৳{getTotalPrice().toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Place Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="w-full mt-6 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {isProcessing ? 'Processing Order...' : 'Place Order'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    );
}
