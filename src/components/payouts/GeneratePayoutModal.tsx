/**
 * Generate Payout Modal Component
 * Modal form for generating new payout statements
 */

'use client';

import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

interface Partner {
  id: string;
  name: string;
  businessName?: string | null;
  profitSharePercentage: number;
}

interface GeneratePayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: PayoutFormData) => Promise<void>;
  partners: Partner[];
}

export interface PayoutFormData {
  partnerId: string;
  startDate: string;
  endDate: string;
  periodType: string;
  notes?: string;
}

const periodPresets = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'CUSTOM', label: 'Custom Period' }
];

export default function GeneratePayoutModal({
  isOpen,
  onClose,
  onGenerate,
  partners
}: GeneratePayoutModalProps) {
  const [formData, setFormData] = useState<PayoutFormData>({
    partnerId: '',
    startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
    periodType: 'MONTHLY',
    notes: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.partnerId) {
      setError('Please select a partner');
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      setError('Please specify start and end dates');
      return;
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onGenerate(formData);
      onClose();
      // Reset form
      setFormData({
        partnerId: '',
        startDate: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
        periodType: 'MONTHLY',
        notes: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payout');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePeriodPresetChange = (preset: string) => {
    const now = new Date();
    let start: Date, end: Date;
    
    switch (preset) {
      case 'MONTHLY':
        start = startOfMonth(subMonths(now, 1));
        end = endOfMonth(subMonths(now, 1));
        break;
      case 'WEEKLY':
        start = subMonths(now, 0);
        start.setDate(start.getDate() - 7);
        end = now;
        break;
      case 'QUARTERLY':
        start = subMonths(now, 3);
        end = now;
        break;
      default:
        return; // Custom - user sets dates manually
    }
    
    setFormData(prev => ({
      ...prev,
      periodType: preset,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }));
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Generate Payout Statement
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {/* Partner Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Partner <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.partnerId}
              onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a partner</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.businessName || partner.name} ({partner.profitSharePercentage}% share)
                </option>
              ))}
            </select>
          </div>
          
          {/* Period Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {periodPresets.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePeriodPresetChange(preset.value)}
                  className={`px-3 py-2 text-sm border rounded-md ${
                    formData.periodType === preset.value
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
          
          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add any additional notes..."
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Generating...' : 'Generate Payout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
