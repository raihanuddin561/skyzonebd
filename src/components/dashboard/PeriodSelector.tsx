/**
 * Period Selector Component
 * For selecting analytics time period
 */

'use client';

import React from 'react';

interface PeriodSelectorProps {
  value: string;
  onChange: (period: string) => void;
}

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const periods = [
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: '365', label: 'Last year' }
  ];
  
  return (
    <div className="inline-flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1">
      {periods.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            value === period.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}
