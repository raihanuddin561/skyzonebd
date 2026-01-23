/**
 * Review List Component with Filters and Pagination
 */

'use client';

import React, { useState, useEffect } from 'react';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';

interface Review {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  user: {
    name: string;
  };
  product?: {
    name: string;
    imageUrl?: string;
  };
  helpfulCount?: number;
  notHelpfulCount?: number;
}

interface ReviewListProps {
  productId: string;
  showFilters?: boolean;
}

export default function ReviewList({ productId, showFilters = true }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [aggregation, setAggregation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  useEffect(() => {
    fetchReviews();
  }, [productId, ratingFilter, sortBy, page]);
  
  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        sortBy,
        sortOrder: 'desc'
      });
      
      if (ratingFilter) {
        params.set('ratingFilter', ratingFilter.toString());
      }
      
      const response = await fetch(`/api/reviews/product/${productId}?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load reviews');
      }
      
      setReviews(data.reviews);
      setAggregation(data.aggregation);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading && reviews.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
        {error}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {aggregation && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start gap-8">
            {/* Overall Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {aggregation.averageRating.toFixed(1)}
              </div>
              <StarRating rating={aggregation.averageRating} showNumber={false} />
              <p className="text-sm text-gray-600 mt-2">
                {aggregation.totalReviews} review{aggregation.totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Rating Distribution */}
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = aggregation.ratingDistribution[star] || 0;
                const percentage = aggregation.ratingPercentages[star] || 0;
                
                return (
                  <button
                    key={star}
                    onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                    className={`flex items-center gap-2 w-full mb-2 hover:bg-gray-50 p-2 rounded ${
                      ratingFilter === star ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="text-sm text-gray-600 w-8">{star} ★</span>
                    <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-4">
            {ratingFilter && (
              <button
                onClick={() => setRatingFilter(null)}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {ratingFilter} stars
                <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <span className="text-sm text-gray-600">
              {aggregation?.totalReviews || 0} review{aggregation?.totalReviews !== 1 ? 's' : ''}
            </span>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="createdAt">Most Recent</option>
            <option value="rating">Highest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>
      )}
      
      {/* Reviews */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
            <p className="text-gray-600">No reviews yet</p>
            <p className="text-sm text-gray-500 mt-2">Be the first to review this product</p>
          </div>
        ) : (
          reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
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
  );
}
