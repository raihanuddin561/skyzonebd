/**
 * Payout Status Badge Component
 * Displays visual badge for payout status
 */

import React from 'react';

type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

interface PayoutStatusBadgeProps {
  status: PayoutStatus;
  className?: string;
}

const statusConfig: Record<PayoutStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  },
  APPROVED: {
    label: 'Approved',
    className: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  PAID: {
    label: 'Paid',
    className: 'bg-green-100 text-green-800 border-green-300'
  },
  REJECTED: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-300'
  }
};

export default function PayoutStatusBadge({ status, className = '' }: PayoutStatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
