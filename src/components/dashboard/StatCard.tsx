/**
 * Stat Card Component
 * Display key metrics with icons and growth indicators
 */

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
  suffix?: string;
  prefix?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  suffix,
  prefix
}: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-600'
  };
  
  const iconColorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    gray: 'bg-gray-100 text-gray-600'
  };
  
  return (
    <div className={`rounded-lg border-2 p-6 ${colorClasses[color]} bg-white`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {prefix}
            {typeof value === 'number' 
              ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
              : value
            }
            {suffix}
          </p>
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value >= 0 ? (
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              <span className={`text-sm font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-600">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${iconColorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
