/**
 * Simple Progress Bar Component
 * For displaying percentages and distributions
 */

import React from 'react';

interface ProgressBarProps {
  label: string;
  value: number;
  total?: number;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  showPercentage?: boolean;
  showValue?: boolean;
}

export default function ProgressBar({
  label,
  value,
  total,
  color = 'blue',
  showPercentage = true,
  showValue = true
}: ProgressBarProps) {
  const percentage = total ? (value / total) * 100 : value;
  
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
    gray: 'bg-gray-500'
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          {showValue && (
            <span className="text-gray-600">
              {value.toLocaleString()}{total && ` / ${total.toLocaleString()}`}
            </span>
          )}
          {showPercentage && (
            <span className="font-medium text-gray-900">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
