'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/app/components/Header';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface OrderItem {
  productId: string;
  name: string;
  imageUrl: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
}

interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  guestInfo: {
    name: string;
    email: string;
    mobile: string;
    companyName?: string;
  } | null;
  items: OrderItem[];
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  paymentReference: string | null;
  paymentProofUrl: string | null;
  paymentVerifiedAt: string | null;
  paymentVerifiedBy: string | null;
  paymentNotes: string | null;
  notes: string | null;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = useAuth();
  const [orderId, setOrderId] = useState<string>('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setOrderId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        setOrder(result.data);
        setEditedItems(result.data.items); // Initialize edited items
      } else {
        toast.error('Order not found');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    if (editMode) {
      // Cancel edit - reset to original items
      setEditedItems(order?.items || []);
    }
    setEditMode(!editMode);
  };

  const handleItemChange = (index: number, field: 'quantity' | 'price', value: number) => {
    const newItems = [...editedItems];
    newItems[index] = {
      ...newItems[index],
      [field]: value,
      total: field === 'quantity' 
        ? value * newItems[index].price 
        : newItems[index].quantity * value
    };
    setEditedItems(newItems);
  };

  const calculateEditedTotals = () => {
    const subtotal = editedItems.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // No tax
    const shipping = order?.shipping || 0;
    const total = subtotal + tax + shipping;
    return { subtotal, tax, shipping, total };
  };

  const handleSaveItems = async () => {
    if (!order || !user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      toast.error('Unauthorized');
      return;
    }

    if (!confirm('Save changes to this order?')) {
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/admin/orders/${orderId}/items`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: editedItems.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          }))
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order items updated successfully');
        setEditMode(false);
        fetchOrderDetails(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to update order items');
      }
    } catch (error) {
      console.error('Error updating order items:', error);
      toast.error('Failed to update order items');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelOrder = async () => {
    const reason = prompt('Please enter cancellation reason:');
    if (!reason) return;

    if (!confirm('Are you sure you want to cancel this order? Stock will be restored.')) {
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          orderId: order?.id,
          reason 
        })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order cancelled successfully');
        fetchOrderDetails(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to cancel order');
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      toast.error('Only admins can update order status');
      return;
    }

    if (!confirm(`Change order status to ${newStatus}?`)) {
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Order status updated successfully');
        fetchOrderDetails(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyPayment = async (status: 'PAID' | 'FAILED') => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
      toast.error('Only admins can verify payments');
      return;
    }

    const note = prompt(
      status === 'PAID' 
        ? 'Optional note (e.g., verified with bank):' 
        : 'Reason for rejection (required):'
    );
    
    if (status === 'FAILED' && !note) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (!confirm(`Are you sure you want to mark this payment as ${status}?`)) {
      return;
    }

    try {
      setUpdating(true);
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/admin/orders/${orderId}/verify-payment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, note: note || undefined })
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Payment ${status === 'PAID' ? 'verified successfully' : 'marked as failed'}`);
        fetchOrderDetails(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to verify payment');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'PROCESSING': 'bg-purple-100 text-purple-800',
      'SHIPPED': 'bg-indigo-100 text-indigo-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'RETURNED': 'bg-orange-100 text-orange-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'PENDING_VERIFICATION': 'bg-orange-100 text-orange-800',
      'PAID': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'PARTIAL': 'bg-blue-100 text-blue-800',
      'REFUNDED': 'bg-gray-100 text-gray-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <ToastContainer />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <ToastContainer />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <Link href="/orders" className="text-blue-600 hover:text-blue-700">
              ← Back to Orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href={(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? '/admin/orders' : '/orders'} 
            className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Orders
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
              <span className={`inline-flex px-4 py-2 text-sm font-semibold rounded-full ${getPaymentStatusColor(order.paymentStatus)}`}>
                Payment: {order.paymentStatus === 'PENDING_VERIFICATION' ? 'Pending Verification' : order.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && order.status === 'PENDING' && !editMode && (
                  <button
                    onClick={handleEditToggle}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    ✏️ Edit Items
                  </button>
                )}
                {editMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveItems}
                      disabled={updating}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {updating ? 'Saving...' : '✓ Save Changes'}
                    </button>
                    <button
                      onClick={handleEditToggle}
                      disabled={updating}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
              
              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  {(editMode ? editedItems : order.items).map((item, index) => (
                    <div key={index} className="flex gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                      <Link 
                        href={`/products/${item.productId}`}
                        className="flex-shrink-0"
                      >
                        <div className="relative rounded-lg w-20 h-20 bg-gray-100 overflow-hidden">
                          <img
                            src={item.imageUrl || '/images/placeholder.jpg'}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/placeholder.jpg';
                            }}
                          />
                        </div>
                      </Link>
                      
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/products/${item.productId}`}
                          className="group"
                        >
                          <h3 className="text-sm font-medium text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                            {item.name}
                            <svg className="inline-block w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </h3>
                        </Link>
                        {item.sku && (
                          <p className="text-xs text-gray-500 mb-2">SKU: {item.sku}</p>
                        )}
                        
                        {editMode ? (
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 font-medium">Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600 font-medium">Price:</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.price}
                                  onChange={(e) => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900">
                                Total: ৳{item.total.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="text-gray-600">Qty: {item.quantity}</span>
                            <span className="text-gray-600">৳{item.price.toLocaleString()}</span>
                            <span className="font-semibold text-gray-900">
                              Total: ৳{item.total.toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {editMode && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="flex justify-between">
                        <span>Updated Subtotal:</span>
                        <span className="font-semibold">৳{calculateEditedTotals().subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Updated Total:</span>
                        <span className="font-bold text-blue-600">৳{calculateEditedTotals().total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Delivery Status</h2>
              </div>
              
              <div className="p-4 sm:p-6">
                {/* Order Timeline */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        ['PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-500'
                      }`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {!['CANCELLED', 'RETURNED'].includes(order.status) && (
                        <div className="w-0.5 h-12 bg-gray-300"></div>
                      )}
                    </div>
                    <div className="flex-1 pt-2">
                      <h3 className="text-sm font-semibold text-gray-900">Order Confirmed</h3>
                      <p className="text-xs text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {order.status !== 'CANCELLED' && order.status !== 'PENDING' && (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ['PROCESSING', 'PACKED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="w-0.5 h-12 bg-gray-300"></div>
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="text-sm font-semibold text-gray-900">Processing</h3>
                        <p className="text-xs text-gray-500 mt-1">Order is being prepared</p>
                      </div>
                    </div>
                  )}

                  {order.status !== 'CANCELLED' && ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status) && (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          ['SHIPPED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)
                            ? 'bg-green-500 text-white'
                            : order.status === 'SHIPPED' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                        </div>
                        <div className="w-0.5 h-12 bg-gray-300"></div>
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {order.status === 'SHIPPED' ? '🚚 Shipped' : '🚚 In Transit'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {order.status === 'SHIPPED' ? 'Package has been shipped' : 'On the way to you'}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status !== 'CANCELLED' && (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          order.status === 'DELIVERED'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-500'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className={`text-sm font-semibold ${
                          order.status === 'DELIVERED' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                          {order.status === 'DELIVERED' ? '✓ Delivered' : 'Delivery Pending'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {order.status === 'DELIVERED' 
                            ? `Delivered on ${new Date(order.updatedAt).toLocaleDateString()}`
                            : 'Estimated delivery: 3-5 business days'}
                        </p>
                      </div>
                    </div>
                  )}

                  {order.status === 'CANCELLED' && (
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-500 text-white">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1 pt-2">
                        <h3 className="text-sm font-semibold text-red-600">Order Cancelled</h3>
                        <p className="text-xs text-gray-500 mt-1">This order has been cancelled</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Address Information */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Shipping Address</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{order.shippingAddress}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Billing Address</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-line">{order.billingAddress}</p>
                  </div>

                  {order.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Order Notes</h3>
                      <p className="text-sm text-gray-600 whitespace-pre-line">{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Status Card - For All Users */}
            {order.paymentStatus !== 'PAID' && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-yellow-900 mb-1">
                        Payment {order.paymentStatus === 'PENDING' ? 'Pending' : 'Partially Paid'}
                      </h3>
                      <p className="text-sm text-yellow-800">
                        {order.paymentStatus === 'PENDING' 
                          ? 'No payment received yet' 
                          : 'Additional payment required'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                      <span className="text-sm font-medium text-gray-600">Order Total</span>
                      <span className="text-lg font-bold text-gray-900">৳{order.total.toLocaleString()}</span>
                    </div>
                    
                    {order.paymentStatus === 'PARTIAL' && (
                      <>
                        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                          <span className="text-sm font-medium text-green-700">Amount Paid</span>
                          <span className="text-lg font-semibold text-green-600">
                            ৳{((order.total || 0) * 0.6).toLocaleString()} {/* Placeholder - will be dynamic */}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-2 border-red-200">
                          <span className="text-sm font-bold text-red-700">Outstanding Due</span>
                          <span className="text-xl font-bold text-red-600">
                            ৳{((order.total || 0) * 0.4).toLocaleString()} {/* Placeholder - will be dynamic */}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {order.paymentStatus === 'PENDING' && (
                      <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border-2 border-red-200">
                        <span className="text-sm font-bold text-red-700">Amount Due</span>
                        <span className="text-xl font-bold text-red-600">৳{order.total.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => toast.info('Payment gateway integration coming soon! Please contact admin to process payment.')}
                      className="w-full px-4 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 transition-all transform hover:scale-[1.02] shadow-md"
                    >
                      💳 Make Payment
                    </button>
                    
                    <p className="text-xs text-center text-gray-600 mt-2">
                      Or contact us to arrange payment: <br/>
                      <span className="font-semibold text-gray-800">📞 +880-XXX-XXXXXX</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Confirmed Card */}
            {order.paymentStatus === 'PAID' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-green-900 mb-1">✓ Payment Confirmed</h3>
                      <p className="text-sm text-green-800 mb-3">Full payment received</p>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Amount Paid</span>
                          <span className="text-lg font-bold text-green-600">৳{order.total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Verification Section - For Manual Payments (Admin Only) */}
            {order.paymentStatus === 'PENDING_VERIFICATION' && 
             (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div className="bg-gradient-to-br from-orange-50 to-yellow-50 border-l-4 border-orange-500 rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex-shrink-0">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-orange-900 mb-1">
                        ⚠️ Payment Verification Required
                      </h3>
                      <p className="text-sm text-orange-800 mb-3">
                        Customer has submitted payment details. Please verify before processing the order.
                      </p>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white rounded-lg p-4 mb-4 space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Payment Method</span>
                      <span className="text-sm font-bold text-gray-900 uppercase">
                        {order.paymentMethod.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Transaction ID / Reference</span>
                      <span className="text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                        {order.paymentReference || 'N/A'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Amount to Verify</span>
                      <span className="text-lg font-bold text-orange-600">৳{order.total.toLocaleString()}</span>
                    </div>
                    
                    {order.paymentNotes && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Admin Notes</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{order.paymentNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Verification Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleVerifyPayment('PAID')}
                      disabled={updating}
                      className="w-full px-4 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 transition-all transform hover:scale-[1.02] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? 'Processing...' : '✓ Verify & Mark as PAID'}
                    </button>
                    
                    <button
                      onClick={() => handleVerifyPayment('FAILED')}
                      disabled={updating}
                      className="w-full px-4 py-3 text-sm font-bold rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-[1.02] shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updating ? 'Processing...' : '✗ Reject Payment'}
                    </button>
                  </div>

                  <p className="text-xs text-center text-orange-700 mt-3">
                    <strong>Important:</strong> Please verify the transaction with your {order.paymentMethod === 'bkash' ? 'bKash' : 'bank'} account before confirming.
                  </p>
                </div>
              </div>
            )}

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Customer</h2>
              </div>
              
              <div className="p-4 sm:p-6 space-y-3">
                {order.guestInfo ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Name</p>
                      <p className="text-sm font-medium text-gray-900">{order.guestInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-sm text-gray-900">{order.guestInfo.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Phone</p>
                      <p className="text-sm text-gray-900">{order.guestInfo.mobile}</p>
                    </div>
                    {order.guestInfo.companyName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Company</p>
                        <p className="text-sm text-gray-900">{order.guestInfo.companyName}</p>
                      </div>
                    )}
                    <div>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        Guest Order
                      </span>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">Registered Customer</p>
                    <p className="text-xs text-gray-500 mt-1">User ID: {order.userId}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>
              
              <div className="p-4 sm:p-6 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">৳{order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-gray-900">৳{order.shipping.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium text-gray-900">৳{order.tax.toLocaleString()}</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-base font-semibold text-gray-900">Total</span>
                    <span className="text-base font-bold text-blue-600">৳{order.total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {order.paymentMethod.replace('_', ' ')}
                  </p>
                </div>
                
                {/* Show payment reference if available */}
                {order.paymentReference && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Transaction Reference</p>
                    <p className="text-sm font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                      {order.paymentReference}
                    </p>
                    {order.paymentStatus === 'PENDING_VERIFICATION' && (
                      <p className="text-xs text-orange-600 mt-1">⏳ Awaiting admin verification</p>
                    )}
                    {order.paymentVerifiedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Verified on {new Date(order.paymentVerifiedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                
                {order.paymentNotes && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Payment Notes (Admin)</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {order.paymentNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Admin Actions */}
            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Admin Actions</h2>
                </div>
                
                <div className="p-4 sm:p-6 space-y-3">
                  {order.status === 'PENDING' && (
                    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        💡 <strong>Tip:</strong> You can edit order items (quantity & price) before confirming this order.
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Update Status</h3>
                    {['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        disabled={updating || order.status === status || editMode}
                        className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                          order.status === status
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : editMode
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {updating ? 'Updating...' : `Mark as ${status}`}
                      </button>
                    ))}
                  </div>
                  
                  {/* Cancel Order Button */}
                  {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
                    <div className="pt-3 border-t border-gray-200">
                      <button
                        onClick={handleCancelOrder}
                        disabled={updating || editMode}
                        className="w-full px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {updating ? 'Cancelling...' : '❌ Cancel Order'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
