'use client'

import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';

interface RFQItem {
  productId: string;
  productName: string;
  quantity: number;
  imageUrl: string;
}

interface RFQ {
  id: string;
  rfqNumber: string;
  subject: string;
  message: string | null;
  targetPrice: number | null;
  status: 'PENDING' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  quotedPrice: number | null;
  responseMessage: string | null;
  respondedAt: string | null;
  items: RFQItem[];
  totalQuantity: number;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  QUOTED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
};

export default function MyRFQsPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRfqs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/rfq', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const data = await response.json();
          setRfqs(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching RFQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRfqs();
  }, []);

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Quote Requests</h1>
            <p className="text-gray-600">Track your RFQs and view quotes from our team</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : rfqs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <div className="text-gray-300 text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No quote requests yet</h3>
              <p className="text-gray-600">
                Use the &quot;Request Quote&quot; button on any product to ask for bulk pricing.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rfqs.map((rfq) => (
                <div key={rfq.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {rfq.rfqNumber} — {rfq.subject}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Requested on {new Date(rfq.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-3 sm:mt-0 ${STATUS_STYLES[rfq.status] || 'bg-gray-100 text-gray-800'}`}>
                      {rfq.status}
                    </span>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Items requested:</h4>
                    <ul className="space-y-1 mb-3">
                      {rfq.items.map((item) => (
                        <li key={item.productId} className="text-sm text-gray-600">
                          {item.productName} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                    {rfq.targetPrice != null && (
                      <p className="text-sm text-gray-600 mb-1">
                        <strong>Your target price:</strong> ৳{rfq.targetPrice.toLocaleString()}/unit
                      </p>
                    )}
                    {rfq.message && (
                      <p className="text-sm text-gray-600">
                        <strong>Your message:</strong> {rfq.message}
                      </p>
                    )}
                  </div>

                  {rfq.status === 'QUOTED' && rfq.responseMessage && (
                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-1">Quote from our team</h4>
                        {rfq.quotedPrice != null && (
                          <p className="text-lg font-bold text-blue-700 mb-2">
                            ৳{rfq.quotedPrice.toLocaleString()} <span className="text-sm font-normal">per unit</span>
                          </p>
                        )}
                        <p className="text-sm text-blue-900">{rfq.responseMessage}</p>
                        {rfq.respondedAt && (
                          <p className="text-xs text-blue-600 mt-2">
                            Quoted on {new Date(rfq.respondedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Footer />
      </main>
    </ProtectedRoute>
  );
}
