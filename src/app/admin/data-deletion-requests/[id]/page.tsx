'use client'

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  ipAddress: string | null;
  userAgent: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    userType: string;
    createdAt: string;
  };
  auditLogs: AuditLog[];
}

interface AuditLog {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  metadata: any;
  timestamp: string;
}

export default function DeletionRequestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchRequestDetails();
    }
  }, [id]);

  const fetchRequestDetails = async () => {
    try {
      const response = await fetch(`/api/admin/data-deletion-requests/${id}`);
      const data = await response.json();

      if (data.success) {
        setRequest(data.request);
      } else {
        toast.error('Failed to fetch request details');
        router.push('/admin/data-deletion-requests');
      }
    } catch (error) {
      console.error('Error fetching request:', error);
      toast.error('Failed to fetch request details');
      router.push('/admin/data-deletion-requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this deletion request? This will move it to PROCESSING status.')) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/data-deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Request approved successfully');
        await fetchRequestDetails();
      } else {
        toast.error(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
      toast.error('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/data-deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          notes: rejectNotes 
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Request rejected successfully');
        setShowRejectModal(false);
        setRejectNotes('');
        await fetchRequestDetails();
      } else {
        toast.error(data.error || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!confirm(
      '⚠️ WARNING: This will permanently delete/anonymize user data!\n\n' +
      'This action cannot be undone. The following will happen:\n' +
      '- User account will be anonymized\n' +
      '- Personal information will be deleted\n' +
      '- Order history will be retained but anonymized\n\n' +
      'Are you absolutely sure you want to proceed?'
    )) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/data-deletion-requests/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Data deletion executed successfully');
        await fetchRequestDetails();
      } else {
        toast.error(data.error || 'Failed to execute deletion');
      }
    } catch (error) {
      console.error('Error executing deletion:', error);
      toast.error('Failed to execute deletion');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
      <span className={`px-4 py-2 rounded-full text-sm font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Request not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin/data-deletion-requests')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Requests
          </button>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Deletion Request</h1>
                <p className="text-gray-600">Request ID: <span className="font-mono text-sm">{request.id}</span></p>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </div>
        </div>

        {/* User Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            User Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
              <p className="text-lg font-semibold text-gray-900">{request.user.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
              <p className="text-lg text-gray-900">{request.user.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
              <p className="text-lg text-gray-900">{request.user.phone || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">User Type</label>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                request.user.userType === 'WHOLESALE' ? 'bg-purple-100 text-purple-800' :
                request.user.userType === 'RETAIL' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {request.user.userType}
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
              <p className="text-lg text-gray-900">{formatDate(request.user.createdAt)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
              <p className="text-sm font-mono text-gray-600">{request.user.id}</p>
            </div>
          </div>
        </div>

        {/* Request Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Request Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">Reason for Deletion</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {request.reason || 'No reason provided'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Requested At</label>
                <p className="text-gray-900">{formatDate(request.requestedAt)}</p>
              </div>
              {request.processedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Processed At</label>
                  <p className="text-gray-900">{formatDate(request.processedAt)}</p>
                </div>
              )}
              {request.completedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Completed At</label>
                  <p className="text-gray-900">{formatDate(request.completedAt)}</p>
                </div>
              )}
              {request.rejectedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">Rejected At</label>
                  <p className="text-gray-900">{formatDate(request.rejectedAt)}</p>
                </div>
              )}
            </div>
            {request.rejectionReason && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Rejection Reason</label>
                <p className="text-gray-900 bg-red-50 p-3 rounded border border-red-200">
                  {request.rejectionReason}
                </p>
              </div>
            )}
            {request.notes && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">Admin Notes</label>
                <p className="text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                  {request.notes}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">IP Address</label>
                <p className="text-gray-600 font-mono text-sm">{request.ipAddress || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">User Agent</label>
                <p className="text-gray-600 text-sm truncate">{request.userAgent || 'Unknown'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {request.status === 'PENDING' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
            <div className="flex gap-4">
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Approve Request
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Reject Request
              </button>
            </div>
          </div>
        )}

        {request.status === 'PROCESSING' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Execute Deletion</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-red-800">
                  <p className="font-semibold mb-1">⚠️ Warning: Irreversible Action</p>
                  <p>This will permanently delete/anonymize the user's personal data. Order history will be retained but anonymized for business purposes.</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleExecute}
              disabled={actionLoading}
              className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Execute Data Deletion
                </>
              )}
            </button>
          </div>
        )}

        {/* Audit Log */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Audit Trail
          </h2>
          <div className="space-y-3">
            {request.auditLogs.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No audit logs yet</p>
            ) : (
              request.auditLogs.map((log, index) => (
                <div key={log.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {request.auditLogs.length - index}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900">{log.action}</span>
                      <span className="text-sm text-gray-500">{formatDate(log.timestamp)}</span>
                    </div>
                    {log.previousStatus && log.newStatus && (
                      <p className="text-sm text-gray-600">
                        Status changed: <span className="font-medium">{log.previousStatus}</span> → <span className="font-medium">{log.newStatus}</span>
                      </p>
                    )}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {log.metadata.adminName && (
                          <p>By: {log.metadata.adminName} ({log.metadata.adminEmail})</p>
                        )}
                        {log.metadata.notes && (
                          <p className="mt-1 italic">Notes: {log.metadata.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Deletion Request</h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this data deletion request. This will be visible to the user.
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectNotes('');
                }}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectNotes.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
