'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

export default function ReviewsPage() {
  const [reviews] = useState([
    {
      id: '1',
      productName: 'Sample Product',
      customerName: 'John Doe',
      rating: 5,
      comment: 'Great product!',
      status: 'pending',
      date: new Date().toISOString()
    }
  ]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Reviews</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Moderate and manage customer reviews</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Reviews</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Approved</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">0</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Avg Rating</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">0.0 ⭐</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
        <div className="text-4xl sm:text-5xl mb-3">⭐</div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Reviews Yet</h3>
        <p className="text-sm sm:text-base text-gray-600">
          Customer reviews will appear here once they start reviewing products.
        </p>
      </div>
    </div>
  );
}
