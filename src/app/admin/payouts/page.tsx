/**
 * Admin Payout Management Page
 * Manage partner payouts - generate, approve, mark as paid
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PayoutTable from '@/components/payouts/PayoutTable';
import GeneratePayoutModal, { PayoutFormData } from '@/components/payouts/GeneratePayoutModal';
import { api } from '@/utils/apiClient';
import AdminIcon from '../components/AdminIcons';

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
  partner: {
    businessName?: string | null;
    name: string;
  };
}

interface Partner {
  id: string;
  name: string;
  businessName?: string | null;
  profitSharePercentage: number;
}

interface PayoutSummary {
  totalPending: number;
  pendingCount: number;
  totalOutstanding: number;
  approvedCount: number;
  totalPaid: number;
  paidCount: number;
}

const EMPTY_SUMMARY: PayoutSummary = {
  totalPending: 0,
  pendingCount: 0,
  totalOutstanding: 0,
  approvedCount: 0,
  totalPaid: 0,
  paidCount: 0,
};

export default function AdminPayoutsPage() {
  const router = useRouter();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch payouts and partners
  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Table data: respects the active tab, but always requests enough
      // rows (limit=100) so results beyond the API's default page size of
      // 20 aren't silently hidden.
      const payoutsUrl = statusFilter === 'all'
        ? '/api/admin/financial/outstanding-payouts?limit=100'
        : `/api/admin/financial/outstanding-payouts?status=${statusFilter}&limit=100`;

      // Summary cards must always reflect true totals across every status,
      // independent of whichever tab is selected for the table below. The
      // API's default (no `status` param) only covers APPROVED+PENDING and
      // never includes PAID, so the only way to get a real PAID total is to
      // query each status explicitly and combine them here.
      const [payoutsRes, partnersRes, pendingRes, approvedRes, paidRes] = await Promise.all([
        api.get(payoutsUrl),
        api.get('/api/admin/partners'),
        api.get('/api/admin/financial/outstanding-payouts?status=PENDING&limit=100'),
        api.get('/api/admin/financial/outstanding-payouts?status=APPROVED&limit=100'),
        api.get('/api/admin/financial/outstanding-payouts?status=PAID&limit=100'),
      ]);

      if (!payoutsRes.ok || !partnersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const payoutsData = await payoutsRes.json();
      const partnersData = await partnersRes.json();
      const pendingData = pendingRes.ok ? await pendingRes.json() : null;
      const approvedData = approvedRes.ok ? await approvedRes.json() : null;
      const paidData = paidRes.ok ? await paidRes.json() : null;

      setPayouts(payoutsData.data?.distributions || []);
      setPartners(partnersData.data?.partners || []);
      setSummary({
        totalPending: pendingData?.data?.summary?.totalOutstanding || 0,
        pendingCount: pendingData?.pagination?.total || 0,
        totalOutstanding: approvedData?.data?.summary?.totalOutstanding || 0,
        approvedCount: approvedData?.pagination?.total || 0,
        totalPaid: paidData?.data?.summary?.totalOutstanding || 0,
        paidCount: paidData?.pagination?.total || 0,
      });
    } catch (err) {
      setError('Failed to load payout data');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGeneratePayout = async (formData: PayoutFormData) => {
    try {
      const response = await api.post('/api/admin/payouts/generate', formData);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate payout');
      }
      
      const data = await response.json();
      
      setSuccessMessage('Payout statement generated successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      throw err; // Let modal handle error display
    }
  };
  
  const handleStatusChange = async (payoutId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to mark this payout as ${newStatus}?`)) {
      return;
    }
    
    try {
      const updateData: any = { status: newStatus };
      
      // If marking as paid, prompt for payment details
      if (newStatus === 'PAID') {
        const paymentMethod = prompt('Payment Method (e.g., Bank Transfer, bKash):');
        const paymentReference = prompt('Payment Reference/Transaction ID:');
        
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (paymentReference) updateData.paymentReference = paymentReference;
      }
      
      const response = await api.patch(`/api/admin/payouts/${payoutId}`, updateData);
      
      if (!response.ok) {
        throw new Error('Failed to update payout status');
      }
      
      setSuccessMessage(`Payout marked as ${newStatus} successfully`);
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Refresh data
      fetchData();
    } catch (err) {
      setError('Failed to update payout status');
      console.error(err);
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
        <h1 className="text-3xl font-bold text-gray-900">Partner Payouts</h1>
        <p className="mt-2 text-gray-600">
          Manage partner profit distributions and payment processing
        </p>
      </div>
      
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Pending Approval</h3>
              <p className="mt-2 text-3xl font-bold text-yellow-900">
                {formatCurrency(summary.totalPending)}
              </p>
              <p className="mt-1 text-sm text-yellow-600">
                {summary.pendingCount} payout(s)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center flex-shrink-0">
              <AdminIcon name="payouts" className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-800">Outstanding (Approved)</h3>
              <p className="mt-2 text-3xl font-bold text-blue-900">
                {formatCurrency(summary.totalOutstanding)}
              </p>
              <p className="mt-1 text-sm text-blue-600">
                {summary.approvedCount} payout(s)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <AdminIcon name="verification" className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-green-800">Total Paid</h3>
              <p className="mt-2 text-3xl font-bold text-green-900">
                {formatCurrency(summary.totalPaid)}
              </p>
              <p className="mt-1 text-sm text-green-600">
                {summary.paidCount} payout(s)
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center flex-shrink-0">
              <AdminIcon name="profit" className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions and Filters */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              statusFilter === 'APPROVED'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('PAID')}
            className={`px-4 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
              statusFilter === 'PAID'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Paid
          </button>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center cursor-pointer"
        >
          <AdminIcon name="plus" className="w-5 h-5 mr-2" />
          Generate Payout
        </button>
      </div>
      
      {/* Payouts Table */}
      <div className="bg-white shadow rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading payouts...</p>
          </div>
        ) : (
          <PayoutTable
            payouts={payouts}
            isAdmin={true}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
      
      {/* Generate Payout Modal */}
      <GeneratePayoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={handleGeneratePayout}
        partners={partners}
      />
    </div>
  );
}
