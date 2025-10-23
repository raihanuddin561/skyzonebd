'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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

  useEffect(() => {
    // Mock data - replace with actual API call
    setApplications([
      {
        id: '1',
        user: {
          id: 'u1',
          name: 'Fatima Noor',
          email: 'fatima@noordist.com',
          phone: '+880-1744-456789'
        },
        businessInfo: {
          businessName: 'Noor Distributors Ltd.',
          businessType: 'Wholesale Distributor',
          registrationNumber: 'BD-REG-2024-001234',
          taxNumber: 'TIN-987654321',
          address: 'House 45, Road 12, Dhanmondi',
          city: 'Dhaka',
          country: 'Bangladesh',
          website: 'www.noordist.com'
        },
        documents: [
          {
            type: 'Trade License',
            name: 'trade_license.pdf',
            url: '/documents/trade_license_1.pdf',
            uploadedAt: '2024-10-20T08:15:00'
          },
          {
            type: 'Tax Certificate',
            name: 'tax_cert.pdf',
            url: '/documents/tax_cert_1.pdf',
            uploadedAt: '2024-10-20T08:16:00'
          },
          {
            type: 'Business Registration',
            name: 'business_reg.pdf',
            url: '/documents/business_reg_1.pdf',
            uploadedAt: '2024-10-20T08:17:00'
          }
        ],
        status: 'pending',
        submittedAt: '2024-10-20T08:15:00'
      },
      {
        id: '2',
        user: {
          id: 'u2',
          name: 'Kamal Rahman',
          email: 'kamal@superstore.com',
          phone: '+880-1755-567890'
        },
        businessInfo: {
          businessName: 'Super Store BD',
          businessType: 'Retail Chain',
          registrationNumber: 'BD-REG-2024-005678',
          taxNumber: 'TIN-123456789',
          address: 'Plot 23, Gulshan Avenue',
          city: 'Dhaka',
          country: 'Bangladesh'
        },
        documents: [
          {
            type: 'Trade License',
            name: 'trade_license.pdf',
            url: '/documents/trade_license_2.pdf',
            uploadedAt: '2024-10-19T14:30:00'
          },
          {
            type: 'Tax Certificate',
            name: 'tax_certificate.pdf',
            url: '/documents/tax_cert_2.pdf',
            uploadedAt: '2024-10-19T14:31:00'
          }
        ],
        status: 'under_review',
        submittedAt: '2024-10-19T14:30:00'
      },
      {
        id: '3',
        user: {
          id: 'u3',
          name: 'Rashid Ali',
          email: 'rashid@import.com',
          phone: '+880-1766-678901'
        },
        businessInfo: {
          businessName: 'Ali Import & Export',
          businessType: 'Import/Export',
          registrationNumber: 'BD-REG-2024-009012',
          taxNumber: 'TIN-456789123',
          address: 'Building 7, Motijheel',
          city: 'Dhaka',
          country: 'Bangladesh',
          website: 'www.aliimport.com'
        },
        documents: [
          {
            type: 'Trade License',
            name: 'license.pdf',
            url: '/documents/trade_license_3.pdf',
            uploadedAt: '2024-10-18T10:00:00'
          }
        ],
        status: 'pending',
        submittedAt: '2024-10-18T10:00:00'
      }
    ]);
  }, []);

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { class: string; text: string; icon: string } } = {
      pending: { class: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: '⏳' },
      under_review: { class: 'bg-blue-100 text-blue-800', text: 'Under Review', icon: '🔍' },
      approved: { class: 'bg-green-100 text-green-800', text: 'Approved', icon: '✓' },
      rejected: { class: 'bg-red-100 text-red-800', text: 'Rejected', icon: '✕' },
    };
    return badges[status] || badges.pending;
  };

  const handleApprove = (appId: string) => {
    console.log(`Approving application ${appId}`);
    // TODO: Implement approve API call
    setSelectedApp(null);
  };

  const handleReject = (appId: string) => {
    console.log(`Rejecting application ${appId} with reason: ${rejectionReason}`);
    // TODO: Implement reject API call
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedApp(null);
  };

  const handleMarkUnderReview = (appId: string) => {
    console.log(`Marking application ${appId} as under review`);
    // TODO: Implement status change API call
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">B2B Verification</h1>
          <p className="text-gray-600 mt-1">Review and approve wholesale business applications</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">8</p>
            </div>
            <span className="text-3xl">⏳</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Under Review</p>
              <p className="text-2xl font-bold text-blue-600">3</p>
            </div>
            <span className="text-3xl">🔍</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-green-600">156</p>
            </div>
            <span className="text-3xl">✅</span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-2xl font-bold text-red-600">12</p>
            </div>
            <span className="text-3xl">❌</span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              placeholder="Search by business name, applicant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applications List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Applications</h2>
          {applications.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className={`bg-white rounded-lg shadow-sm border-2 p-4 cursor-pointer transition-all ${
                selectedApp?.id === app.id ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{app.businessInfo.businessName}</h3>
                  <p className="text-sm text-gray-600">{app.user.name}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusBadge(app.status).class}`}>
                  <span>{getStatusBadge(app.status).icon}</span>
                  <span>{getStatusBadge(app.status).text}</span>
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <span>{app.user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📱</span>
                  <span>{app.user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🏢</span>
                  <span>{app.businessInfo.businessType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  <span>{app.documents.length} documents</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span>🕒</span>
                  <span>{new Date(app.submittedAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Application Details */}
        <div className="lg:col-span-2">
          {selectedApp ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedApp.businessInfo.businessName}</h2>
                  <p className="text-gray-600 mt-1">{selectedApp.businessInfo.businessType}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusBadge(selectedApp.status).class}`}>
                  <span>{getStatusBadge(selectedApp.status).icon}</span>
                  <span>{getStatusBadge(selectedApp.status).text}</span>
                </span>
              </div>

              {/* Applicant Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Applicant Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedApp.user.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedApp.user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedApp.user.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-medium">{new Date(selectedApp.submittedAt).toLocaleString('en-GB')}</p>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Business Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Registration Number</p>
                    <p className="font-medium">{selectedApp.businessInfo.registrationNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tax Number</p>
                    <p className="font-medium">{selectedApp.businessInfo.taxNumber}</p>
                  </div>
                  <div className="col-span-2">
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
                    <div key={idx} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">📄</span>
                        <div>
                          <p className="font-medium text-gray-900">{doc.type}</p>
                          <p className="text-sm text-gray-600">{doc.name}</p>
                          <p className="text-xs text-gray-500">Uploaded: {new Date(doc.uploadedAt).toLocaleString('en-GB')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                          View
                        </button>
                        <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              {(selectedApp.status === 'pending' || selectedApp.status === 'under_review') && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  {selectedApp.status === 'pending' && (
                    <button
                      onClick={() => handleMarkUnderReview(selectedApp.id)}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Mark Under Review
                    </button>
                  )}
                  <button
                    onClick={() => handleApprove(selectedApp.id)}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    ✓ Approve Application
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    ✕ Reject Application
                  </button>
                </div>
              )}

              {selectedApp.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-800">{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <span className="text-6xl mb-4 block">📋</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Application Selected</h3>
              <p className="text-gray-600">Select an application from the list to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
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
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => selectedApp && handleReject(selectedApp.id)}
                disabled={!rejectionReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
