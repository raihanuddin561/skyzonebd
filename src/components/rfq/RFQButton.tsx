'use client'

import { useState } from 'react';
import { Product } from '@/types/cart';
import { toast } from 'react-toastify';

interface RFQButtonProps {
  product: Product;
  userType?: 'WHOLESALE' | 'RETAIL' | null;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
}

export default function RFQButton({ product, userType, className = '', variant = 'secondary' }: RFQButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    quantity: product.minOrderQuantity || 10,
    targetPrice: '',
    message: '',
  });

  // Only show for wholesale users
  if (userType !== 'WHOLESALE') {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/rfq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [
            {
              productId: product.id,
              quantity: formData.quantity,
              notes: formData.message,
            }
          ],
          subject: `RFQ for ${product.name}`,
          message: formData.message,
          targetPrice: formData.targetPrice ? parseFloat(formData.targetPrice) : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Request for Quotation sent successfully!');
        setIsModalOpen(false);
        setFormData({
          quantity: product.minOrderQuantity || 10,
          targetPrice: '',
          message: '',
        });
      } else {
        toast.error(data.error || 'Failed to send RFQ');
      }
    } catch (error) {
      console.error('Error submitting RFQ:', error);
      toast.error('Failed to send RFQ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Button variants
  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${className}`}
          title="Request Quote"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        {renderModal()}
      </>
    );
  }

  if (variant === 'primary') {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors ${className}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Request Quote
        </button>
        {renderModal()}
      </>
    );
  }

  // Secondary variant (default)
  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Request Quote
      </button>
      {renderModal()}
    </>
  );

  function renderModal() {
    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Request for Quotation
                </h3>
                <p className="text-sm text-blue-100 mt-1">Get a custom quote for bulk orders</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Product Preview */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200">
                <img 
                  src={product.imageUrl} 
                  alt={product.name}
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{product.name}</h4>
                <div className="text-sm text-gray-600 mt-1">
                  Current Price: <span className="font-bold text-blue-600">৳{product.price.toLocaleString()}</span>
                  {product.minOrderQuantity && product.minOrderQuantity > 1 && (
                    <span className="ml-3 text-gray-500">MOQ: {product.minOrderQuantity}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quantity *
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
                min={product.minOrderQuantity || 1}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter desired quantity"
              />
              {product.minOrderQuantity && (
                <p className="text-sm text-gray-500 mt-1">
                  Minimum order quantity: {product.minOrderQuantity}
                </p>
              )}
            </div>

            {/* Target Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Price per Unit (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">৳</span>
                <input
                  type="number"
                  value={formData.targetPrice}
                  onChange={(e) => handleChange('targetPrice', e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Your target price"
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                What price per unit are you looking for?
              </p>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => handleChange('message', e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Any specific requirements, delivery timeframe, or questions..."
              />
            </div>

            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-700">Estimated Total (at current price):</span>
                <span className="font-bold text-gray-900">
                  ৳{(product.price * formData.quantity).toLocaleString()}
                </span>
              </div>
              {formData.targetPrice && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Your Target Total:</span>
                  <span className="font-bold text-blue-600">
                    ৳{(parseFloat(formData.targetPrice) * formData.quantity).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send RFQ
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}
