/**
 * Payout Table Component
 * Reusable table for displaying payout statements
 */

import React from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import PayoutStatusBadge from './PayoutStatusBadge';

interface Payout {
  id: string;
  periodType: string;
  startDate: string | Date;
  endDate: string | Date;
  totalRevenue: number;
  netProfit: number;
  distributionAmount: number;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  approvedAt?: string | Date | null;
  paidAt?: string | Date | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  partner?: {
    businessName?: string | null;
    name: string;
  };
}

interface PayoutTableProps {
  payouts: Payout[];
  isAdmin?: boolean;
  onStatusChange?: (payoutId: string, newStatus: string) => void;
}

export default function PayoutTable({ payouts, isAdmin = false, onStatusChange }: PayoutTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    return format(new Date(date), 'MMM dd, yyyy');
  };
  
  if (payouts.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No payouts</h3>
        <p className="mt-1 text-sm text-gray-500">
          {isAdmin ? 'Generate a payout statement to get started.' : 'No payout statements available yet.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Period
            </th>
            {isAdmin && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Partner
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Revenue
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Net Profit
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payout Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment Info
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {payout.periodType}
                </div>
                <div className="text-sm text-gray-500">
                  {formatDate(payout.startDate)} - {formatDate(payout.endDate)}
                </div>
              </td>
              {isAdmin && payout.partner && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {payout.partner.businessName || payout.partner.name}
                  </div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(payout.totalRevenue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(payout.netProfit)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-semibold text-gray-900">
                  {formatCurrency(payout.distributionAmount)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <PayoutStatusBadge status={payout.status} />
              </td>
              <td className="px-6 py-4">
                {payout.paidAt ? (
                  <div className="text-sm">
                    <div className="text-gray-900 font-medium">
                      Paid: {formatDate(payout.paidAt)}
                    </div>
                    {payout.paymentMethod && (
                      <div className="text-gray-500">
                        {payout.paymentMethod}
                      </div>
                    )}
                    {payout.paymentReference && (
                      <div className="text-gray-500 font-mono text-xs">
                        Ref: {payout.paymentReference}
                      </div>
                    )}
                  </div>
                ) : payout.approvedAt ? (
                  <div className="text-sm text-gray-500">
                    Approved: {formatDate(payout.approvedAt)}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400">
                    Awaiting approval
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <Link
                  href={isAdmin ? `/admin/payouts/${payout.id}` : `/partner/payouts/${payout.id}`}
                  className="text-blue-600 hover:text-blue-900"
                >
                  View Details
                </Link>
                {isAdmin && payout.status !== 'PAID' && (
                  <button
                    onClick={() => onStatusChange?.(payout.id, 'PAID')}
                    className="ml-4 text-green-600 hover:text-green-900"
                  >
                    Mark Paid
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
