'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Header from '../components/Header';
import ProtectedRoute from '../components/ProtectedRoute';

interface Order {
  id: number;
  orderId: string;
  items: any[];
  total: number;
  status: string;
  createdAt: string;
  shippingAddress: string;
  paymentMethod: string;
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered'>('all');

  useEffect(() => {
    // Simulate fetching orders from API
    // In a real app, you'd make an API call here
    const mockOrders: Order[] = [
      {
        id: 1,
        orderId: 'ORD-1704123456',
        items: [
          { name: 'Wireless Bluetooth Headphones', quantity: 2, price: 2500 },
          { name: 'USB-C Cable Set', quantity: 1, price: 800 }
        ],
        total: 5800,
        status: 'delivered',
        createdAt: '2024-01-15T10:30:00Z',
        shippingAddress: 'House 123, Road 5, Dhanmondi, Dhaka-1205',
        paymentMethod: 'bank_transfer'
      },
      {
        id: 2,
        orderId: 'ORD-1704234567',
        items: [
          { name: 'Smart Phone Stand', quantity: 3, price: 350 },
          { name: 'Laptop Cooling Pad', quantity: 1, price: 1200 }
        ],
        total: 2250,
        status: 'shipped',
        createdAt: '2024-01-20T14:45:00Z',
        shippingAddress: 'Flat 4B, Building 7, Gulshan-2, Dhaka-1212',
        paymentMethod: 'cash_on_delivery'
      },
      {
        id: 3,
        orderId: 'ORD-1704345678',
        items: [
          { name: 'Portable Power Bank', quantity: 1, price: 1500 }
        ],
        total: 1500,
        status: 'confirmed',
        createdAt: '2024-01-25T09:15:00Z',
        shippingAddress: 'House 456, Uttara Sector-7, Dhaka-1230',
        paymentMethod: 'bank_transfer'
      }
    ];

    setTimeout(() => {
      setOrders(mockOrders);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'shipped':
        return '🚚';
      case 'delivered':
        return '📦';
      default:
        return '❓';
    }
  };

  const filteredOrders = filter === 'all' ? orders : orders.filter(order => order.status === filter);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
            <p className="text-gray-600">Track and manage your order history</p>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-wrap gap-1 p-2">
              {['all', 'pending', 'confirmed', 'shipped', 'delivered'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    filter === status
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                  {status !== 'all' && (
                    <span className="ml-1">
                      ({orders.filter(order => order.status === status).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <div className="text-gray-300 text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "You haven't placed any orders yet." 
                  : `No orders with status "${filter}".`
                }
              </p>
              <Link 
                href="/products"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Order #{order.orderId}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 mt-3 sm:mt-0">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        <span className="mr-1">{getStatusIcon(order.status)}</span>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">৳{order.total.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">{order.items.length} items</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Items:</h4>
                        <ul className="space-y-1">
                          {order.items.map((item, index) => (
                            <li key={index} className="text-sm text-gray-600">
                              {item.name} × {item.quantity} = ৳{(item.price * item.quantity).toLocaleString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Shipping Address:</h4>
                        <p className="text-sm text-gray-600">{order.shippingAddress}</p>
                        <h4 className="font-medium text-gray-900 mb-2 mt-3">Payment Method:</h4>
                        <p className="text-sm text-gray-600 capitalize">
                          {order.paymentMethod.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Order Actions */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                        View Details
                      </button>
                      {order.status === 'delivered' && (
                        <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium cursor-pointer">
                          Reorder
                        </button>
                      )}
                      <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-700 font-medium cursor-pointer">
                        Download Invoice
                      </button>
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <button className="px-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer">
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}