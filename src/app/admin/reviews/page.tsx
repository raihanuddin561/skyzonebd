/**
 * Admin Review Moderation Page
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import StarRating from '@/components/reviews/StarRating';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  status: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED';
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
  order: {
    id: string;
  };
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Moderation
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [moderationNote, setModerationNote] = useState('');
  
  useEffect(() => {
    fetchReviews();
  }, [statusFilter, page]);
  
  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      if (statusFilter) {
        params.set('status', statusFilter);
      }
      
      const response = await fetch(`/api/admin/reviews?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reviews');
      }
      
      setReviews(data.reviews);
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };
  
  const moderateReview = async (reviewId: string, status: string) => {
    setModeratingId(reviewId);
    
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          moderationNote: moderationNote || undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to moderate review');
      }
      
      // Refresh reviews
      fetchReviews();
      setModerationNote('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to moderate review');
    } finally {
      setModeratingId(null);
    }
  };
  
  const deleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) {
      return;
    }
    
    setModeratingId(reviewId);
    
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete review');
      }
      
      // Refresh reviews
      fetchReviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete review');
    } finally {
      setModeratingId(null);
    }
  };
  
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Review Moderation</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Moderate and manage customer reviews</p>
        </div>
      </div>
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <button
            onClick={() => setStatusFilter('')}
            className={`p-3 sm:p-4 rounded-lg border ${!statusFilter ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
          >
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{summary.total}</p>
            <p className="text-xs sm:text-sm text-gray-600">Total</p>
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`p-3 sm:p-4 rounded-lg border ${statusFilter === 'PENDING' ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}
          >
            <p className="text-xl sm:text-2xl font-bold text-yellow-600">{summary.pending}</p>
            <p className="text-xs sm:text-sm text-gray-600">Pending</p>
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`p-3 sm:p-4 rounded-lg border ${statusFilter === 'APPROVED' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}
          >
            <p className="text-xl sm:text-2xl font-bold text-green-600">{summary.approved}</p>
            <p className="text-xs sm:text-sm text-gray-600">Approved</p>
          </button>
          <button
            onClick={() => setStatusFilter('HIDDEN')}
            className={`p-3 sm:p-4 rounded-lg border ${statusFilter === 'HIDDEN' ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}
          >
            <p className="text-xl sm:text-2xl font-bold text-gray-600">{summary.hidden}</p>
            <p className="text-xs sm:text-sm text-gray-600">Hidden</p>
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`p-3 sm:p-4 rounded-lg border ${statusFilter === 'REJECTED' ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}
          >
            <p className="text-xl sm:text-2xl font-bold text-red-600">{summary.rejected}</p>
            <p className="text-xs sm:text-sm text-gray-600">Rejected</p>
          </button>
        </div>
      )}
      
      {/* Error */}
      {error && (
        <div className="p-3 sm:p-4 bg-red-50 border border-red-200 rounded text-sm sm:text-base text-red-700">
          {error}
        </div>
      )}
      
      {/* Loading */}
      {loading && reviews.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-600">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
              {/* Status Badge */}
              <div className="flex items-start justify-between mb-4">
                <span
                  className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                    review.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : review.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : review.status === 'HIDDEN'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {review.status}
                </span>
                <span className="text-xs sm:text-sm text-gray-500">
                  {format(new Date(review.createdAt), 'MMM dd, yyyy HH:mm')}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Review Content */}
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold text-sm sm:text-base">
                        {review.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{review.user.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{review.user.email}</p>
                    </div>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  
                  <StarRating rating={review.rating} showNumber={false} size="sm" />
                  
                  {review.title && (
                    <h3 className="font-semibold text-gray-900 mt-3 mb-2 text-sm sm:text-base">{review.title}</h3>
                  )}
                  <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{review.comment}</p>
                  
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {review.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review ${index + 1}`}
                          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                        />
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Product Info */}
                <div className="border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6">
                  <p className="text-xs sm:text-sm text-gray-600 mb-2">Product</p>
                  <div className="flex items-start gap-3">
                    {review.product.imageUrl && (
                      <img
                        src={review.product.imageUrl}
                        alt={review.product.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 text-sm sm:text-base">{review.product.name}</p>
                      <p className="text-xs sm:text-sm text-gray-500">Order: {review.order.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Moderation Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Moderation Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={moderationNote}
                    onChange={(e) => setModerationNote(e.target.value)}
                    placeholder="Add a note..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {review.status !== 'APPROVED' && (
                    <button
                      onClick={() => moderateReview(review.id, 'APPROVED')}
                      disabled={moderatingId === review.id}
                      className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      ✓ Approve
                    </button>
                  )}
                  {review.status !== 'HIDDEN' && (
                    <button
                      onClick={() => moderateReview(review.id, 'HIDDEN')}
                      disabled={moderatingId === review.id}
                      className="px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      ⊘ Hide
                    </button>
                  )}
                  {review.status !== 'REJECTED' && (
                    <button
                      onClick={() => moderateReview(review.id, 'REJECTED')}
                      disabled={moderatingId === review.id}
                      className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs sm:text-sm"
                    >
                      ✕ Reject
                    </button>
                  )}
                  <button
                    onClick={() => deleteReview(review.id)}
                    disabled={moderatingId === review.id}
                    className="ml-auto px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs sm:text-sm"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs sm:text-sm"
          >
            Previous
          </button>
          <span className="text-xs sm:text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-xs sm:text-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
