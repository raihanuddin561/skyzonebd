/**
 * Customer Dashboard Page
 * Order history and review prompts
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import StatCard from '@/components/dashboard/StatCard';
import ProgressBar from '@/components/dashboard/ProgressBar';
import Link from 'next/link';

interface Analytics {
  stats: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    cancelledOrders: number;
    reviewsWritten: number;
    pendingReviews: number;
  };
  orders: Array<any>;
  ordersByStatus: Array<{ status: string; count: number }>;
  reviewPrompts: Array<{
    productId: string;
    productName: string;
    productImage: string | null;
    orderId: string;
    orderNumber: string;
    deliveredDate: Date;
  }>;
}

export default function CustomerDashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'orders' | 'reviews'>('orders');
  
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/customer/analytics');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }
      
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && !analytics) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      </div>
    );
  }
  
  if (!analytics) return null;
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-1">Track your orders and manage reviews</p>
        </div>
        
        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={analytics.stats.totalOrders}
            color="blue"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
          
          <StatCard
            title="Total Spent"
            value={analytics.stats.totalSpent}
            prefix="৳"
            color="green"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          
          <StatCard
            title="Average Order"
            value={analytics.stats.averageOrderValue}
            prefix="৳"
            color="purple"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            }
          />
          
          <StatCard
            title="Pending Reviews"
            value={analytics.stats.pendingReviews}
            color="yellow"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          />
        </div>
        
        {/* Orders by Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Orders by Status</h2>
          <div className="space-y-4">
            {analytics.ordersByStatus.map((item) => (
              <ProgressBar
                key={item.status}
                label={item.status}
                value={item.count}
                total={analytics.stats.totalOrders}
                color={
                  item.status === 'DELIVERED' ? 'green' :
                  item.status === 'PENDING' ? 'yellow' :
                  item.status === 'CANCELLED' ? 'red' : 'blue'
                }
              />
            ))}
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setSelectedTab('orders')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              selectedTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Order History ({analytics.orders.length})
          </button>
          <button
            onClick={() => setSelectedTab('reviews')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              selectedTab === 'reviews'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Reviews ({analytics.reviewPrompts.length})
          </button>
        </div>
        
        {/* Order History Tab */}
        {selectedTab === 'orders' && (
          <div className="space-y-4">
            {analytics.orders.length > 0 ? (
              analytics.orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          order.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(order.date), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">৳{order.total.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{order.itemCount} items</p>
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="space-y-3">
                    {order.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                          <p className="text-sm text-gray-500">Seller: {item.seller}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity} × ৳{item.unitPrice.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">৳{item.totalPrice.toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Order Summary */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">৳{order.subtotal.toLocaleString()}</span>
                      </div>
                      {order.shippingCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="font-medium">৳{order.shippingCost.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span>৳{order.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-gray-600 font-medium">No orders yet</p>
                <p className="text-sm text-gray-500 mt-1">Start shopping to see your orders here</p>
              </div>
            )}
          </div>
        )}
        
        {/* Review Prompts Tab */}
        {selectedTab === 'reviews' && (
          <div className="space-y-4">
            {analytics.reviewPrompts.length > 0 ? (
              analytics.reviewPrompts.map((prompt) => (
                <div key={`${prompt.productId}-${prompt.orderId}`} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    {prompt.productImage && (
                      <img 
                        src={prompt.productImage} 
                        alt={prompt.productName} 
                        className="w-20 h-20 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{prompt.productName}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Order #{prompt.orderNumber} • Delivered {format(new Date(prompt.deliveredDate), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        Share your experience with this product
                      </p>
                    </div>
                    <Link
                      href={`/products/${prompt.productId}?review=true&orderId=${prompt.orderId}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Write Review
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-gray-600 font-medium">All caught up!</p>
                <p className="text-sm text-gray-500 mt-1">You've reviewed all your delivered products</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
