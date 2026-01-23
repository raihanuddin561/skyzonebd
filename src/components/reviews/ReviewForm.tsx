/**
 * Review Form Component
 * Submit new review for purchased product
 */

'use client';

import React, { useState } from 'react';
import StarRating from './StarRating';

interface ReviewFormProps {
  productId: string;
  productName: string;
  orderId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({
  productId,
  productName,
  orderId,
  onSuccess,
  onCancel
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      setError('Please write a review');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          orderId,
          rating,
          title: title.trim() || null,
          comment: comment.trim(),
          images: images.length > 0 ? images : undefined
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }
      
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Write a Review for {productName}
      </h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rating <span className="text-red-500">*</span>
        </label>
        <StarRating
          rating={rating}
          interactive
          onChange={setRating}
          showNumber={false}
          size="lg"
        />
        {rating > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            You selected {rating} star{rating > 1 ? 's' : ''}
          </p>
        )}
      </div>
      
      {/* Title */}
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Review Title (Optional)
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience in a few words"
          maxLength={100}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">{title.length}/100 characters</p>
      </div>
      
      {/* Comment */}
      <div className="mb-4">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
          Your Review <span className="text-red-500">*</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product. What did you like or dislike?"
          rows={6}
          maxLength={1000}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">{comment.length}/1000 characters</p>
      </div>
      
      {/* Image Upload Placeholder */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Add Photos (Optional)
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            Upload product photos (Coming soon)
          </p>
        </div>
      </div>
      
      {/* Disclaimer */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        <p className="font-medium mb-1">Review Guidelines:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your review will be moderated before being published</li>
          <li>Only verified purchasers can write reviews</li>
          <li>Be honest and provide helpful information</li>
          <li>Keep reviews relevant to the product</li>
        </ul>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
