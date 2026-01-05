'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import Header from '@/app/components/Header';

interface Product {
  id: string;
  name: string;
  imageUrl: string;
  sku: string;
  wholesalePrice: number;
  stockQuantity: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
}

interface OrderItem {
  productId: string;
  productName: string;
  imageUrl: string;
  sku: string;
  quantity: number;
  customPrice: number;
  standardPrice: number;
  total: number;
}

function CreateOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  // Form data
  const [customerId, setCustomerId] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  const [items, setItems] = useState<OrderItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  
  const [shippingAddress, setShippingAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [shipping, setShipping] = useState(0);
  const [tax, setTax] = useState(0);
  const [notes, setNotes] = useState('');

  // Search customers
  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }

    try {
      setSearching(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setCustomers(result.data || []);
      }
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setSearching(false);
    }
  };

  // Search products
  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setProducts(result.data?.products || []);
      }
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  // Add product to order
  const addProduct = async (product: Product) => {
    // Check if already added
    if (items.find(item => item.productId === product.id)) {
      toast.warning('Product already added to order');
      return;
    }

    // Check for customer-specific pricing
    let customPrice = product.wholesalePrice;
    
    if (customerId) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/customers/${customerId}/pricing`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const result = await response.json();
          const pricing = result.data?.find((p: any) => p.productId === product.id);
          if (pricing) {
            customPrice = pricing.customPrice;
            toast.info(`Applied custom price: ৳${customPrice.toLocaleString()}`);
          }
        }
      } catch (error) {
        console.error('Error fetching custom pricing:', error);
      }
    }

    const newItem: OrderItem = {
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      sku: product.sku,
      quantity: 1,
      customPrice: customPrice,
      standardPrice: product.wholesalePrice,
      total: customPrice
    };

    setItems([...items, newItem]);
    setProductSearch('');
    setProducts([]);
    toast.success('Product added to order');
  };

  // Update item quantity
  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) return;
    
    const newItems = [...items];
    newItems[index].quantity = quantity;
    newItems[index].total = newItems[index].customPrice * quantity;
    setItems(newItems);
  };

  // Update item price
  const updatePrice = (index: number, price: number) => {
    if (price < 0) return;
    
    const newItems = [...items];
    newItems[index].customPrice = price;
    newItems[index].total = price * newItems[index].quantity;
    setItems(newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal + shipping + tax;

  // Copy shipping to billing
  const copyShippingToBilling = () => {
    setBillingAddress(shippingAddress);
  };

  // Submit order
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (!shippingAddress || !billingAddress) {
      toast.error('Please fill in shipping and billing addresses');
      return;
    }

    if (!confirm('Create this order?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: customerId || null,
          items: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            customPrice: item.customPrice
          })),
          shippingAddress,
          billingAddress,
          paymentMethod,
          shipping,
          tax,
          notes
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order created successfully!');
        setTimeout(() => {
          router.push(`/admin/orders/${result.data.id}`);
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error('Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requireAdmin>
      <main className="min-h-screen bg-gray-50">
        <Header />
        <ToastContainer />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <Link href="/admin/orders" className="text-blue-600 hover:text-blue-700 inline-flex items-center mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Orders
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Create New Order</h1>
            <p className="text-gray-600 mt-1">Manually create an order with custom pricing</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Selection */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer (Optional)</h2>
                
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      searchCustomers(e.target.value);
                    }}
                    placeholder="Search customer by name, email, or phone..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!!selectedCustomer}
                  />
                  
                  {searching && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}

                  {/* Customer dropdown */}
                  {customers.length > 0 && !selectedCustomer && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {customers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerId(customer.id);
                            setCustomerSearch(customer.name);
                            setCustomers([]);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                          {customer.companyName && (
                            <div className="text-xs text-gray-500">{customer.companyName}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedCustomer && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setCustomerId('');
                        setCustomerSearch('');
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-500 mt-2">
                  💡 Leave empty to create order without customer (manual/guest order)
                </p>
              </div>

              {/* Products */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
                
                {/* Product search */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      searchProducts(e.target.value);
                    }}
                    placeholder="Search products to add..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />

                  {/* Product dropdown */}
                  {products.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {products.map(product => (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => addProduct(product)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 flex items-center gap-3"
                        >
                          <img 
                            src={product.imageUrl || '/images/placeholder.jpg'} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{product.name}</div>
                            <div className="text-sm text-gray-600">
                              ৳{product.wholesalePrice.toLocaleString()} • Stock: {product.stockQuantity}
                            </div>
                            {product.sku && (
                              <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order items */}
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    No items added yet. Search and add products above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex gap-3 p-3 border border-gray-200 rounded-lg">
                        <img 
                          src={item.imageUrl || '/images/placeholder.jpg'} 
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{item.productName}</h3>
                          <p className="text-xs text-gray-500">{item.sku}</p>
                          
                          <div className="flex flex-wrap gap-3 mt-2">
                            <div>
                              <label className="text-xs text-gray-600">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-sm border rounded"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Price</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.customPrice}
                                onChange={(e) => updatePrice(index, parseFloat(e.target.value) || 0)}
                                className="w-28 px-2 py-1 text-sm border rounded"
                              />
                            </div>
                            <div className="flex items-end">
                              <div>
                                <div className="text-xs text-gray-600">Total</div>
                                <div className="font-semibold text-gray-900">৳{item.total.toLocaleString()}</div>
                              </div>
                            </div>
                          </div>

                          {item.customPrice !== item.standardPrice && (
                            <p className="text-xs text-green-600 mt-1">
                              Custom price (Standard: ৳{item.standardPrice.toLocaleString()})
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-700 self-start"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Addresses */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Shipping & Billing</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Shipping Address *
                    </label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter full shipping address..."
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Billing Address *
                      </label>
                      <button
                        type="button"
                        onClick={copyShippingToBilling}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        Same as shipping
                      </button>
                    </div>
                    <textarea
                      value={billingAddress}
                      onChange={(e) => setBillingAddress(e.target.value)}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter billing address..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Items ({items.length})</span>
                    <span className="font-medium">৳{subtotal.toLocaleString()}</span>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Shipping</label>
                    <input
                      type="number"
                      min="0"
                      value={shipping}
                      onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Tax</label>
                    <input
                      type="number"
                      min="0"
                      value={tax}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>

                  <div className="pt-3 border-t">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-blue-600 text-lg">৳{total.toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="ROCKET">Rocket</option>
                      <option value="INVOICE_NET30">NET 30</option>
                      <option value="INVOICE_NET60">NET 60</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Internal notes..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || items.length === 0}
                    className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating Order...' : 'Create Order'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </ProtectedRoute>
  );
}

export default CreateOrderPage;
