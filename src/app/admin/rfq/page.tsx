'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface RFQ {
  id: string;
  customerName: string;
  customerEmail: string;
  company: string;
  phone: string;
  productName: string;
  quantity: number;
  message: string;
  status: 'pending' | 'responded' | 'quoted' | 'closed';
  createdAt: string;
  response?: string;
}

export default function RFQPage() {
  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'responded' | 'closed'>('all');
  const [selectedRFQ, setSelectedRFQ] = useState<RFQ | null>(null);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchRFQs();
  }, []);

  const fetchRFQs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/rfq');
      
      if (response.ok) {
        const data = await response.json();
        setRfqs(Array.isArray(data) ? data : data.data || []);
      }
    } catch (error) {
      console.error('Error fetching RFQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (rfqId: string) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response');
      return;
    }

    try {
      const response = await fetch(`/api/rfq/${rfqId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText })
      });

      if (response.ok) {
        toast.success('Response sent successfully');
        setSelectedRFQ(null);
        setResponseText('');
        fetchRFQs();
      } else {
        toast.error('Failed to send response');
      }
    } catch (error) {
      console.error('Error responding to RFQ:', error);
      toast.error('Failed to send response');
    }
  };

  const filteredRFQs = rfqs.filter(rfq => filter === 'all' || rfq.status === filter);

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      responded: 'bg-blue-100 text-blue-800',
      quoted: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">RFQ Requests</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage customer quote requests</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Requests</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{rfqs.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">
            {rfqs.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Responded</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600">
            {rfqs.filter(r => r.status === 'responded').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Closed</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {rfqs.filter(r => r.status === 'closed').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'All Requests' },
            { value: 'pending', label: 'Pending' },
            { value: 'responded', label: 'Responded' },
            { value: 'closed', label: 'Closed' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as typeof filter)}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* RFQ List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="divide-y divide-gray-200">
          {filteredRFQs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>No RFQ requests found</p>
            </div>
          ) : (
            filteredRFQs.map((rfq) => (
              <div key={rfq.id} className="p-3 sm:p-4 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{rfq.productName}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{rfq.customerName} • {rfq.company}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 whitespace-nowrap ${getStatusBadge(rfq.status)}`}>
                        {rfq.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600 mb-2">
                      <div>📧 {rfq.customerEmail}</div>
                      <div>📞 {rfq.phone}</div>
                      <div>📦 Quantity: {rfq.quantity} units</div>
                      <div>📅 {new Date(rfq.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-xs sm:text-sm text-gray-700 mb-2">
                      <strong>Message:</strong> {rfq.message}
                    </div>
                    {rfq.response && (
                      <div className="bg-blue-50 rounded p-2 text-xs sm:text-sm text-blue-900">
                        <strong>Your Response:</strong> {rfq.response}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  {rfq.status === 'pending' && (
                    <button
                      onClick={() => setSelectedRFQ(rfq)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
                    >
                      Respond
                    </button>
                  )}
                  <a
                    href={`mailto:${rfq.customerEmail}`}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs sm:text-sm hover:bg-gray-300"
                  >
                    Email
                  </a>
                  <a
                    href={`tel:${rfq.phone}`}
                    className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-xs sm:text-sm hover:bg-gray-300"
                  >
                    Call
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Response Modal */}
      {selectedRFQ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
              Respond to RFQ - {selectedRFQ.productName}
            </h3>
            <div className="mb-4 p-3 bg-gray-50 rounded text-sm">
              <p><strong>Customer:</strong> {selectedRFQ.customerName}</p>
              <p><strong>Company:</strong> {selectedRFQ.company}</p>
              <p><strong>Quantity:</strong> {selectedRFQ.quantity} units</p>
              <p className="mt-2"><strong>Request:</strong> {selectedRFQ.message}</p>
            </div>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Enter your quote and response..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[120px] text-sm sm:text-base"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleRespond(selectedRFQ.id)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Response
              </button>
              <button
                onClick={() => {
                  setSelectedRFQ(null);
                  setResponseText('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
