/**
 * Review Card Component
 * Display individual review
 */

import React from 'react';
import { format } from 'date-fns';
import StarRating from './StarRating';

interface ReviewCardProps {
  review: {
    id: string;
    rating: number;
    title?: string | null;
    comment: string;
    images?: string[];
    isVerifiedPurchase: boolean;
    createdAt: string | Date;
    user: {
      name: string;
    };
    product?: {
      name: string;
      imageUrl?: string;
    };
    helpfulCount?: number;
    notHelpfulCount?: number;
  };
  showProduct?: boolean;
  onHelpful?: (reviewId: string) => void;
  onNotHelpful?: (reviewId: string) => void;
}

export default function ReviewCard({ 
  review, 
  showProduct = false,
  onHelpful,
  onNotHelpful
}: ReviewCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 font-semibold">
                {review.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{review.user.name}</span>
                {review.isVerifiedPurchase && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified Purchase
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {format(new Date(review.createdAt), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>
          <StarRating rating={review.rating} showNumber={false} />
        </div>
        
        {showProduct && review.product && (
          <div className="flex items-center gap-2 ml-4">
            {review.product.imageUrl && (
              <img
                src={review.product.imageUrl}
                alt={review.product.name}
                className="w-12 h-12 object-cover rounded"
              />
            )}
            <span className="text-sm text-gray-600">{review.product.name}</span>
          </div>
        )}
      </div>
      
      {/* Review Content */}
      {review.title && (
        <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
      )}
      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{review.comment}</p>
      
      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4">
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
      
      {/* Helpfulness Actions */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <span className="text-sm text-gray-600">Was this helpful?</span>
        <button
          onClick={() => onHelpful?.(review.id)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-green-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Yes {review.helpfulCount ? `(${review.helpfulCount})` : ''}
        </button>
        <button
          onClick={() => onNotHelpful?.(review.id)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
          </svg>
          No {review.notHelpfulCount ? `(${review.notHelpfulCount})` : ''}
        </button>
      </div>
    </div>
  );
}
