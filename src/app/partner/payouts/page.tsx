/**
 * Partner Payout View Page
 * Partner-facing page to view their payout statements
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PayoutTable from '@/components/payouts/PayoutTable';
import PayoutStatusBadge from '@/components/payouts/PayoutStatusBadge';

interface Payout {
  id: string;
  periodType: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  netProfit: number;
  distributionAmount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  approvedAt?: string | null;
  paidAt?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
}

interface PayoutSummary {
  totalEarned: number;
  totalPaid: number;
  totalApproved: number;
  totalPending: number;
  outstanding: number;
}

export default function PartnerPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchPayouts();
  }, [statusFilter]);
  
  const fetchPayouts = async () => {
    try {
      setIsLoading(true);
      
      const url = statusFilter === 'all'
        ? '/api/partner/financial/distributions'
        : `/api/partner/financial/distributions?status=${statusFilter}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payouts');
      }
      
      const data = await response.json();
      
      setPayouts(data.data?.distributions || []);
      setSummary(data.data?.summary || null);
    } catch (err) {
      setError('Failed to load payout data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Payouts</h1>
        <p className="mt-2 text-gray-600">
          View your profit distributions and payment history
        </p>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-blue-800">Total Earned</h3>
            <p className="mt-2 text-2xl font-bold text-blue-900">
              {formatCurrency(summary.totalEarned)}
            </p>
            <p className="mt-1 text-xs text-blue-600">
              All-time earnings
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-green-800">Paid Out</h3>
            <p className="mt-2 text-2xl font-bold text-green-900">
              {formatCurrency(summary.totalPaid)}
            </p>
            <p className="mt-1 text-xs text-green-600">
              Successfully received
            </p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-yellow-800">Pending</h3>
            <p className="mt-2 text-2xl font-bold text-yellow-900">
              {formatCurrency(summary.totalPending)}
            </p>
            <p className="mt-1 text-xs text-yellow-600">
              Awaiting approval
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-sm font-medium text-purple-800">Outstanding</h3>
            <p className="mt-2 text-2xl font-bold text-purple-900">
              {formatCurrency(summary.outstanding)}
            </p>
            <p className="mt-1 text-xs text-purple-600">
              Approved, not yet paid
            </p>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            statusFilter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          All Payouts
        </button>
        <button
          onClick={() => setStatusFilter('PENDING')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            statusFilter === 'PENDING'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setStatusFilter('APPROVED')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            statusFilter === 'APPROVED'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Approved
        </button>
        <button
          onClick={() => setStatusFilter('PAID')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            statusFilter === 'PAID'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Paid
        </button>
      </div>
      
      {/* Help Text */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Payouts</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Payout statements are generated periodically by admin. Once approved, 
                payments are processed and you'll receive the amount via your preferred payment method.
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Payouts Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading payouts...</p>
          </div>
        ) : (
          <PayoutTable
            payouts={payouts}
            isAdmin={false}
          />
        )}
      </div>
    </div>
  );
}
