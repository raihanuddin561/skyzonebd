'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  costPerUnit: number;
  basePrice: number;
  wholesalePrice: number;
  imageUrl: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
}

interface SaleItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  costPerUnit: number;
  discount: number;
  notes: string;
}

export default function ManualSalesEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  
  // Form data
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [saleType, setSaleType] = useState('OFFLINE');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [items, setItems] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [shipping, setShipping] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentStatus, setPaymentStatus] = useState('PAID');
  const [amountPaid, setAmountPaid] = useState(0);
  const [adjustInventory, setAdjustInventory] = useState(true);
  const [notes, setNotes] = useState('');

  // Search products
  const searchProducts = async (query: string) => {
    if (query.length < 2) {
      setProducts([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=10`, {
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

  // Search customers
  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }

    try {
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
    }
  };

  // Add product to sale
  const addProduct = (product: Product) => {
    const existing = items.find(item => item.productId === product.id);
    if (existing) {
      toast.warning('Product already added');
      return;
    }

    setItems([...items, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      unitPrice: product.wholesalePrice,
      costPerUnit: product.costPerUnit || product.basePrice,
      discount: 0,
      notes: ''
    }]);
    
    setProductSearch('');
    setProducts([]);
    toast.success(`Added ${product.name}`);
  };

  // Update item
  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    
    const totalCost = items.reduce((sum, item) => {
      return sum + (item.quantity * item.costPerUnit);
    }, 0);
    
    const total = subtotal - discount + tax + shipping;
    const profit = total - totalCost;
    const profitMargin = total > 0 ? (profit / total) * 100 : 0;
    
    return { subtotal, totalCost, total, profit, profitMargin };
  };

  // Submit sale
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    if (!customerName && !customerId) {
      toast.error('Please provide customer information');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/manual-sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          saleDate,
          referenceNumber: referenceNumber || null,
          saleType,
          customerId: customerId || null,
          customerName: customerName || null,
          customerPhone: customerPhone || null,
          customerCompany: customerCompany || null,
          items,
          discount,
          tax,
          shipping,
          paymentMethod,
          paymentStatus,
          amountPaid: paymentStatus === 'PAID' ? calculateTotals().total : amountPaid,
          adjustInventory,
          notes
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Sale recorded successfully!');
        setTimeout(() => {
          router.push('/admin/manual-sales');
        }, 1500);
      } else {
        toast.error(result.error || 'Failed to record sale');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to record sale');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/admin/manual-sales"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sales List
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Record Manual Sale</h1>
          <p className="text-gray-600 mt-1">Enter offline sales, phone orders, or external channel sales</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Sale Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sale Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Date *
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reference/Invoice Number
                    </label>
                    <input
                      type="text"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="INV-2026-001"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Type *
                    </label>
                    <select
                      value={saleType}
                      onChange={(e) => setSaleType(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    >
                      <option value="OFFLINE">Offline Store</option>
                      <option value="PHONE_ORDER">Phone Order</option>
                      <option value="WHOLESALE_DIRECT">Wholesale Direct</option>
                      <option value="EXTERNAL_CHANNEL">External Channel</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
                
                {/* Customer Search */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Existing Customer
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        searchCustomers(e.target.value);
                      }}
                      placeholder="Search by name, email, or phone"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    
                    {customers.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {customers.map(customer => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setCustomerId(customer.id);
                              setCustomerName(customer.name);
                              setCustomerPhone(customer.phone || '');
                              setCustomerCompany(customer.companyName || '');
                              setCustomerSearch('');
                              setCustomers([]);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b"
                          >
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-600">{customer.email}</div>
                            {customer.companyName && (
                              <div className="text-xs text-gray-500">{customer.companyName}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-center text-gray-500 text-sm my-4">OR</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-2 border rounded-lg"
                      required={!customerId}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={customerCompany}
                      onChange={(e) => setCustomerCompany(e.target.value)}
                      placeholder="Company Ltd."
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Products *</h2>
                
                {/* Product Search */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        searchProducts(e.target.value);
                      }}
                      placeholder="Search products by name or SKU"
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    
                    {products.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {products.map(product => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addProduct(product)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b flex items-center gap-3"
                          >
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-600">
                                SKU: {product.sku} | Stock: {product.stockQuantity}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">৳{product.wholesalePrice}</div>
                              <div className="text-xs text-gray-500">Cost: ৳{product.costPerUnit || product.basePrice}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Items List */}
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No products added yet. Search and add products above.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{item.productName}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Cost/Unit</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.costPerUnit}
                              onChange={(e) => updateItem(index, 'costPerUnit', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Discount</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="mt-3 flex justify-between items-center">
                          <div className="text-sm text-gray-600">
                            Subtotal: ৳{(item.quantity * item.unitPrice).toFixed(2)}
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            Total: ৳{(item.quantity * item.unitPrice - item.discount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Charges */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Charges</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Discount
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={tax}
                      onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={shipping}
                      onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes about this sale..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Payment Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="MOBILE_PAYMENT">Mobile Payment</option>
                      <option value="CARD">Card</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Status *
                    </label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    >
                      <option value="PAID">Paid</option>
                      <option value="PARTIAL">Partial Payment</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                  
                  {paymentStatus === 'PARTIAL' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount Paid
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Adjustment */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={adjustInventory}
                    onChange={(e) => setAdjustInventory(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Adjust Inventory</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Automatically decrease stock quantities for sold products
                    </div>
                  </div>
                </label>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Sale Summary</h2>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">৳{totals.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount</span>
                      <span>-৳{discount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium">৳{tax.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {shipping > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Shipping</span>
                      <span className="font-medium">৳{shipping.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total Sale</span>
                      <span className="font-bold text-lg text-blue-600">৳{totals.total.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Cost</span>
                      <span className="font-medium text-red-600">৳{totals.totalCost.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Profit</span>
                      <span className="font-bold text-green-600">৳{totals.profit.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Profit Margin</span>
                      <span className="font-semibold text-green-600">{totals.profitMargin.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || items.length === 0}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Recording Sale...' : 'Record Sale'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
