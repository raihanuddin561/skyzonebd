'use client'

import { useMemo } from 'react';

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

interface ProfitChartProps {
  distributions: Distribution[];
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `৳${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `৳${(amount / 1000).toFixed(0)}K`;
  }
  return `৳${amount.toFixed(0)}`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export default function ProfitChart({ distributions }: ProfitChartProps) {
  // Sort by date and take last 6 distributions
  const chartData = useMemo(() => {
    return [...distributions]
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(-6);
  }, [distributions]);

  const maxAmount = useMemo(() => {
    return Math.max(...chartData.map(d => d.amount), 1);
  }, [chartData]);

  const totalAmount = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.amount, 0);
  }, [chartData]);

  const avgAmount = useMemo(() => {
    return chartData.length > 0 ? totalAmount / chartData.length : 0;
  }, [chartData, totalAmount]);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Profit History</h2>
          <p className="text-sm text-gray-500 mt-1">Last 6 distributions</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">Average</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatCurrency(avgAmount)}
          </div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-gray-600">No distribution data available</p>
        </div>
      ) : (
        <>
          {/* Bar Chart */}
          <div className="relative h-64 mb-6">
            <div className="flex items-end justify-around h-full border-b border-gray-200 pb-2">
              {chartData.map((distribution, index) => {
                const heightPercentage = (distribution.amount / maxAmount) * 100;
                const isPaid = distribution.status === 'PAID';
                const isApproved = distribution.status === 'APPROVED';
                const isPending = distribution.status === 'PENDING';

                return (
                  <div key={distribution.id} className="flex flex-col items-center flex-1 mx-1">
                    <div className="relative w-full flex flex-col justify-end h-full group">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                          <div className="font-semibold">{formatCurrency(distribution.amount)}</div>
                          <div className="text-gray-300">{distribution.period}</div>
                          <div className="text-gray-400">{formatDate(distribution.startDate)}</div>
                        </div>
                        <div className="w-2 h-2 bg-gray-900 transform rotate-45 absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                      </div>

                      {/* Bar */}
                      <div
                        className={`w-full rounded-t transition-all duration-300 hover:opacity-80 ${
                          isPaid ? 'bg-green-500' :
                          isApproved ? 'bg-blue-500' :
                          isPending ? 'bg-yellow-500' :
                          'bg-gray-400'
                        }`}
                        style={{ height: `${Math.max(heightPercentage, 5)}%` }}
                      />
                    </div>

                    {/* Label */}
                    <div className="text-xs text-gray-600 mt-2 text-center">
                      <div className="font-medium">{formatDate(distribution.startDate)}</div>
                      <div className="text-gray-500 truncate max-w-[60px]">{distribution.period}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-xs text-gray-600">Paid</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
              <span className="text-xs text-gray-600">Approved</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded mr-2"></div>
              <span className="text-xs text-gray-600">Pending</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Total Shown</div>
              <div className="text-lg font-bold text-gray-900">{formatCurrency(totalAmount)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-1">Distributions</div>
              <div className="text-lg font-bold text-gray-900">{chartData.length}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
