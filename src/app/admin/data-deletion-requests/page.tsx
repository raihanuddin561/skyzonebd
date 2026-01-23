'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

interface DeletionRequest {
  id: string;
  userId: string;
  email: string;
  phone: string;
  reason: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestedAt: string;
  processedAt: string | null;
  completedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  user: {
    name: string;
    email: string;
    userType: string;
  };
}

export default function DataDeletionRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (statusFilter === 'ALL') {
      setFilteredRequests(requests);
    } else {
      setFilteredRequests(requests.filter(r => r.status === statusFilter));
    }
  }, [statusFilter, requests]);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/admin/data-deletion-requests');
      const data = await response.json();

      if (data.success) {
        setRequests(data.requests);
        setFilteredRequests(data.requests);
      } else {
        toast.error('Failed to fetch deletion requests');
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast.error('Failed to fetch deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    };

    const badge = badges[status] || badges.PENDING;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusCounts = () => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'PENDING').length,
      processing: requests.filter(r => r.status === 'PROCESSING').length,
      completed: requests.filter(r => r.status === 'COMPLETED').length,
      rejected: requests.filter(r => r.status === 'REJECTED').length,
    };
  };

  const counts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading deletion requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Data Deletion Requests
              </h1>
              <p className="text-gray-600 mt-2">
                Manage user data deletion requests according to privacy regulations
              </p>
            </div>
            <button
              onClick={fetchRequests}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{counts.total}</p>
              </div>
              <div className="bg-gray-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">{counts.pending}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Processing</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{counts.processing}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{counts.completed}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{counts.rejected}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-lg">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-700 font-medium">Filter by Status:</span>
            {['ALL', 'PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-gray-400 text-xl mb-2">📭</div>
                      <p className="text-gray-600">No deletion requests found</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-gray-900">{request.user.name}</div>
                          <div className="text-sm text-gray-500">{request.user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900">{request.email}</div>
                          <div className="text-gray-500">{request.phone}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          request.user.userType === 'WHOLESALE' ? 'bg-purple-100 text-purple-800' :
                          request.user.userType === 'RETAIL' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {request.user.userType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(request.requestedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {request.reason || 'No reason provided'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => router.push(`/admin/data-deletion-requests/${request.id}`)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Privacy Compliance Information</p>
              <p>Data deletion requests must be processed within 30 days according to privacy regulations. 
              Approved requests will anonymize user data while preserving order records for business purposes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
