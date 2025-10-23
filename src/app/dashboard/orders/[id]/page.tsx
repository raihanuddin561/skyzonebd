'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '@/app/components/Header';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Order {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string | null;
  guestInfo: {
    name: string;
    email: string;
    mobile: string;
    companyName: string;
  } | null;
  items: OrderItem[];
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  notes: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          router.push('/auth/login');
          return;
        }

        console.log('🔍 Fetching order details for ID:', params.id);
        const response = await fetch('/api/orders', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }

        const result = await response.json();
        
        if (result.success && result.data) {
          // Find the specific order by ID
          const foundOrder = result.data.find((o: any) => o.id === params.id);
          
          if (foundOrder) {
            console.log('✅ Order found:', foundOrder);
            setOrder(foundOrder);
          } else {
            setError('Order not found');
          }
        }
      } catch (error) {
        console.error('❌ Error fetching order:', error);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchOrderDetails();
    }
  }, [params.id, router]);

  const handleStatusUpdate = async (newStatus: string, newPaymentStatus: string) => {
    try {
      setUpdating(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order?.id,
          status: newStatus,
          paymentStatus: newPaymentStatus
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update local order state
        setOrder(result.data);
        setShowStatusModal(false);
        toast.success('Order status updated successfully! 🎉', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      } else {
        throw new Error(result.error || 'Failed to update order');
      }
    } catch (error) {
      console.error('❌ Error updating order:', error);
      toast.error('Failed to update order status. Please try again.', {
        position: 'top-right',
        autoClose: 3000,
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading order details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-red-600 text-lg mb-4">{error || 'Order not found'}</p>
              <Link
                href="/dashboard/orders"
                className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Orders
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Orders
            </Link>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Order Details</h1>
                <p className="text-gray-600 mt-1">{order.orderId || order.orderNumber}</p>
              </div>
              <div className="flex gap-3 flex-wrap items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600 font-medium">Order Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-600 font-medium">Payment Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPaymentStatusColor(order.paymentStatus)}`}>
                    {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                  </span>
                </div>
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium self-end"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              {/* Items Card */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b last:border-b-0">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                          <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">৳{item.total.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">৳{item.price} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Addresses Card */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Addresses</h2>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Shipping Address</h3>
                    <p className="text-gray-600 whitespace-pre-line">{order.shippingAddress}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Billing Address</h3>
                    <p className="text-gray-600 whitespace-pre-line">{order.billingAddress}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Order Notes</h2>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Customer Information</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">{order.guestInfo?.name || 'N/A'}</p>
                  </div>
                  {order.guestInfo?.email && (
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium text-gray-900">{order.guestInfo.email}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{order.guestInfo?.mobile || 'N/A'}</p>
                  </div>
                  {order.guestInfo?.companyName && (
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-medium text-gray-900">{order.guestInfo.companyName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium text-gray-900">৳{order.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium text-gray-900">৳{order.shipping.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">৳{order.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-gray-900 text-lg">৳{order.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Payment & Dates */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Payment & Timeline</h2>
                </div>
                <div className="p-6 space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-900 capitalize">{order.paymentMethod.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-medium text-gray-900">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Updated</p>
                    <p className="font-medium text-gray-900">{new Date(order.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Update Order Status</h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Order Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Status
                  </label>
                  <select
                    id="orderStatus"
                    defaultValue={order.status}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <select
                    id="paymentStatus"
                    defaultValue={order.paymentStatus}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowStatusModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const orderStatus = (document.getElementById('orderStatus') as HTMLSelectElement).value;
                      const paymentStatus = (document.getElementById('paymentStatus') as HTMLSelectElement).value;
                      handleStatusUpdate(orderStatus, paymentStatus);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                    disabled={updating}
                  >
                    {updating ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function OrderDetailsPageWrapper() {
  return (
    <ProtectedRoute requiredRole="admin">
      <OrderDetailsPage />
    </ProtectedRoute>
  );
}
