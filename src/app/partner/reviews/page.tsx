/**
 * Partner Reviews Page
 * View all reviews for partner's products
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
  };
  product: {
    id: string;
    name: string;
    imageUrl?: string;
  };
}

export default function PartnerReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('APPROVED');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchReviews();
  }, [statusFilter, ratingFilter, page]);
  
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
      
      if (ratingFilter) {
        params.set('rating', ratingFilter.toString());
      }
      
      const response = await fetch(`/api/partner/reviews?${params}`);
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
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Product Reviews</h1>
        
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-2">Total Reviews</p>
              <p className="text-3xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-2">Average Rating</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-gray-900">
                  {summary.averageRating ? summary.averageRating.toFixed(1) : 'N/A'}
                </p>
                {summary.averageRating && (
                  <StarRating rating={summary.averageRating} showNumber={false} />
                )}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <p className="text-sm text-gray-600 mb-3">Rating Distribution</p>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = summary.byRating?.[star] || 0;
                  const percentage = summary.total > 0 ? (count / summary.total) * 100 : 0;
                  
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-6">{star}★</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending</option>
                <option value="HIDDEN">Hidden</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <select
                value={ratingFilter || ''}
                onChange={(e) => setRatingFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}
        
        {/* Loading */}
        {loading && reviews.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">No reviews found</p>
            <p className="text-sm text-gray-500 mt-2">
              Reviews will appear here once customers start reviewing your products
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
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
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verified
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {format(new Date(review.createdAt), 'MMM dd, yyyy')}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Product Info */}
                  <div className="md:col-span-1">
                    {review.product.imageUrl && (
                      <img
                        src={review.product.imageUrl}
                        alt={review.product.name}
                        className="w-full h-32 object-cover rounded mb-3"
                      />
                    )}
                    <p className="font-medium text-gray-900 text-sm">{review.product.name}</p>
                  </div>
                  
                  {/* Review Content */}
                  <div className="md:col-span-3">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {review.user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.user.name}</p>
                        <StarRating rating={review.rating} showNumber={false} size="sm" />
                      </div>
                    </div>
                    
                    {review.title && (
                      <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
                    )}
                    <p className="text-gray-700 whitespace-pre-wrap">{review.comment}</p>
                    
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Review image ${index + 1}`}
                            className="w-20 h-20 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(image, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
