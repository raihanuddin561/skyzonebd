'use client'

interface Distribution {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
}

interface DistributionHistoryProps {
  distributions: Distribution[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('BDT', '৳');
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
    APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
    PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' }
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default function DistributionHistory({ distributions }: DistributionHistoryProps) {
  if (distributions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Profit Distribution History</h2>
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-600">No distribution history yet</p>
          <p className="text-sm text-gray-500 mt-1">Your profit distributions will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Profit Distribution History</h2>
        <span className="text-sm text-gray-600">Last 10 distributions</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Paid Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {distributions.map((distribution) => (
              <tr key={distribution.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {distribution.period}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(distribution.startDate)}
                  </div>
                  <div className="text-xs text-gray-500">
                    to {formatDate(distribution.endDate)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-semibold text-green-600">
                    {formatCurrency(distribution.amount)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(distribution.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {distribution.paidAt ? formatDate(distribution.paidAt) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Row */}
      <div className="mt-6 pt-4 border-t flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Total Shown:</span>
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(distributions.reduce((sum, d) => sum + d.amount, 0))}
        </span>
      </div>
    </div>
  );
}
