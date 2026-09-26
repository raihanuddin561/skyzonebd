'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import AdminIcon from '../components/AdminIcons';

const SearchIcon = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const XCircleIcon = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 105.636 5.636a9 9 0 0012.728 12.728zM9 9l6 6m0-6l-6 6" />
  </svg>
);

const MailIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

interface VerificationApplication {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  businessInfo: {
    businessName: string;
    businessType: string;
    registrationNumber: string;
    taxNumber: string;
    address: string;
    city: string;
    country: string;
    website?: string;
  };
  documents: {
    type: string;
    name: string;
    url: string;
    uploadedAt: string;
  }[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export default function B2BVerification() {
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<VerificationApplication | null>(null);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);


  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { class: string; text: string; icon: React.ReactNode } } = {
      pending: { class: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: <AdminIcon name="accountsReceivable" className="w-3 h-3" /> },
      under_review: { class: 'bg-blue-100 text-blue-800', text: 'Under Review', icon: <SearchIcon /> },
      approved: { class: 'bg-green-100 text-green-800', text: 'Approved', icon: <AdminIcon name="verification" className="w-3 h-3" /> },
      rejected: { class: 'bg-red-100 text-red-800', text: 'Rejected', icon: <XCircleIcon /> },
    };
    return badges[status] || badges.pending;
  };

  const handleApprove = async (appId: string) => {
    if (approving) return;
    setApproving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ applicationId: appId, action: 'approve' })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Application approved successfully');
        fetchApplications();
      } else {
        toast.error(data.error || 'Failed to approve application');
      }
    } catch (error) {
      console.error('Error approving application:', error);
      toast.error('Failed to approve application');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = (appId: string) => {
    setSelectedApp(applications.find(app => app.id === appId) || null);
    setShowRejectModal(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedApp || rejecting) return;

    setRejecting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/verification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          action: 'reject',
          reason: rejectionReason
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Application rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedApp(null);
        fetchApplications();
      } else {
        toast.error(data.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast.error('Failed to reject application');
    } finally {
      setRejecting(false);
    }
  };

  // Fetch applications when component mounts
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filterStatus,
        ...(searchTerm && { search: searchTerm }),
      });

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/verification?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const result = await response.json();
      
      if (result.success) {
        setApplications(result.data.applications);
        if (result.data.stats) {
          setStats(result.data.stats);
        }
      } else {
        throw new Error(result.error || 'Failed to load applications');
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchApplications();
  }, [filterStatus, searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 font-semibold">Error loading applications</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={fetchApplications}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 cursor-pointer transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-4 lg:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">B2B Verification</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Review and approve wholesale business applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Pending Review</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-yellow-50 text-yellow-600 flex items-center justify-center flex-shrink-0">
              <AdminIcon name="accountsReceivable" className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Total Applications</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-600">{stats.pending + stats.approved + stats.rejected}</p>
            </div>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <AdminIcon name="rfq" className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Approved</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.approved}</p>
            </div>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
              <AdminIcon name="verification" className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Rejected</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.rejected}</p>
            </div>
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0">
              <XCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by business name, applicant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Applications List */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Applications</h2>
          {applications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-500">
              <p className="text-sm">No applications found</p>
            </div>
          ) : (
            applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`bg-white rounded-lg shadow-sm border-2 p-3 sm:p-4 cursor-pointer transition-all ${
                selectedApp?.id === app.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{app.businessInfo.businessName}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{app.user.name}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${getStatusBadge(app.status).class}`}>
                  {getStatusBadge(app.status).icon}
                  <span className="hidden sm:inline">{getStatusBadge(app.status).text}</span>
                </span>
              </div>
              <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2 truncate">
                  <MailIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{app.user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span>{app.user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AdminIcon name="suppliers" className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span className="truncate">{app.businessInfo.businessType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AdminIcon name="invoices" className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span>{app.documents.length} documents</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <AdminIcon name="accountsReceivable" className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
                  <span>{new Date(app.submittedAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        {/* Application Details */}
        <div className="lg:col-span-2">
          {selectedApp ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{selectedApp.businessInfo.businessName}</h2>
                  <p className="text-sm sm:text-base text-gray-600 mt-1">{selectedApp.businessInfo.businessType}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex-shrink-0 ${getStatusBadge(selectedApp.status).class}`}>
                  {getStatusBadge(selectedApp.status).icon}
                  <span>{getStatusBadge(selectedApp.status).text}</span>
                </span>
              </div>

              {/* Applicant Info */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Applicant Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Name</p>
                    <p className="text-sm sm:text-base font-medium break-words">{selectedApp.user.name}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Email</p>
                    <p className="text-sm sm:text-base font-medium break-all">{selectedApp.user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Phone</p>
                    <p className="text-sm sm:text-base font-medium">{selectedApp.user.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Submitted</p>
                    <p className="text-sm sm:text-base font-medium">{new Date(selectedApp.submittedAt).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Business Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Registration Number</p>
                    <p className="text-sm sm:text-base font-medium break-all">{selectedApp.businessInfo.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-600">Tax Number</p>
                    <p className="text-sm sm:text-base font-medium break-all">{selectedApp.businessInfo.taxNumber}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{selectedApp.businessInfo.address}</p>
                    <p className="font-medium">{selectedApp.businessInfo.city}, {selectedApp.businessInfo.country}</p>
                  </div>
                  {selectedApp.businessInfo.website && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Website</p>
                      <a href={`https://${selectedApp.businessInfo.website}`} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:text-blue-700">
                        {selectedApp.businessInfo.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Uploaded Documents</h3>
                <div className="space-y-3">
                  {selectedApp.documents.map((doc, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                          <AdminIcon name="invoices" className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{doc.type}</p>
                          <p className="text-sm text-gray-600 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleString('en-GB')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                        >
                          View
                        </a>
                        <a
                          href={doc.url}
                          download
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {(selectedApp.status === 'pending' || selectedApp.status === 'under_review') && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    disabled={approving}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <AdminIcon name="verification" className="w-4 h-4" />
                    {approving ? 'Approving...' : 'Approve Application'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={approving}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircleIcon className="w-4 h-4" />
                    Reject Application
                  </button>
                </div>
              )}

              {/* Rejection reason display removed: BusinessInfo has no column to
                  persist it (see PATCH handler in api/admin/verification/route.ts),
                  so this always rendered nothing. Re-add once a schema field
                  (e.g. BusinessInfo.rejectionReason) exists. */}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-20 h-20 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
                <AdminIcon name="rfq" className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Application Selected</h3>
              <p className="text-gray-600">Select an application from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRejectModal(false);
              setRejectionReason('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Reject Application</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for rejecting this application. This will be sent to the applicant.</p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={!rejectionReason.trim() || rejecting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
