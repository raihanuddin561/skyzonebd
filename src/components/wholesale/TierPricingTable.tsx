'use client';

import React from 'react';

export interface TierPricingTableProps {
  basePrice: number;
  unit?: string;
  moq?: number;
  tiers?: {
    minQuantity: number;
    maxQuantity: number | null;
    price: number;
    discount?: number;
  }[];
  currentQuantity: number;
  onSelectTierQuantity?: (qty: number) => void;
  className?: string;
}

export default function TierPricingTable({
  basePrice,
  unit = 'unit',
  moq = 1,
  tiers = [],
  currentQuantity,
  onSelectTierQuantity,
  className = '',
}: TierPricingTableProps) {
  // If no wholesale tiers are defined, don't render an empty table
  if (!tiers || tiers.length === 0) {
    return null;
  }

  // Sort tiers by minQuantity ascending
  const sortedTiers = [...tiers].sort((a, b) => a.minQuantity - b.minQuantity);

  // Determine which tier matches currentQuantity
  const activeTierIndex = sortedTiers.findIndex((t) => {
    if (t.maxQuantity === null || t.maxQuantity === undefined) {
      return currentQuantity >= t.minQuantity;
    }
    return currentQuantity >= t.minQuantity && currentQuantity <= t.maxQuantity;
  });

  return (
    <div className={`rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs ${className}`}>
      {/* Header bar */}
      <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span className="text-xs sm:text-sm font-semibold tracking-wide uppercase">Wholesale Volume Pricing (পাইকারি মূল্য)</span>
        </div>
        {moq > 1 && (
          <span className="text-xs bg-amber-500/20 text-amber-300 font-medium px-2 py-0.5 rounded border border-amber-400/30">
            MOQ: {moq} {unit}s
          </span>
        )}
      </div>

      {/* Pricing Matrix */}
      <div className="divide-y divide-slate-100">
        {/* Table header row */}
        <div className="grid grid-cols-12 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3.5 py-2">
          <div className="col-span-5 sm:col-span-4">Volume Tier</div>
          <div className="col-span-4 sm:col-span-4 text-right">Price / {unit}</div>
          <div className="col-span-3 sm:col-span-4 text-right">Savings</div>
        </div>

        {/* Rows */}
        {sortedTiers.map((tier, idx) => {
          const isActive = idx === activeTierIndex;
          const rangeLabel = tier.maxQuantity
            ? `${tier.minQuantity} – ${tier.maxQuantity} ${unit}s`
            : `${tier.minQuantity}+ ${unit}s`;

          // Calculate savings vs base price
          const savingsPerUnit = Math.max(0, basePrice - tier.price);
          const discountPct = tier.discount !== undefined
            ? tier.discount
            : basePrice > 0 ? Math.round((savingsPerUnit / basePrice) * 100) : 0;

          return (
            <div
              key={idx}
              onClick={() => onSelectTierQuantity && onSelectTierQuantity(tier.minQuantity)}
              className={`grid grid-cols-12 items-center px-3.5 py-2.5 text-xs sm:text-sm transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-50/70 border-l-4 border-l-emerald-600 font-medium'
                  : 'hover:bg-slate-50/80 border-l-4 border-l-transparent text-slate-700'
              }`}
              title={`Click to set quantity to ${tier.minQuantity} ${unit}s`}
            >
              <div className="col-span-5 sm:col-span-4 flex items-center gap-1.5">
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
                )}
                <span className={isActive ? 'text-emerald-950 font-bold' : 'text-slate-800'}>
                  {rangeLabel}
                </span>
              </div>

              <div className="col-span-4 sm:col-span-4 text-right">
                <span className={`font-bold ${isActive ? 'text-emerald-700 text-sm sm:text-base' : 'text-slate-900'}`}>
                  ৳{tier.price.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-500 font-normal">/{unit}</span>
              </div>

              <div className="col-span-3 sm:col-span-4 text-right">
                {discountPct > 0 ? (
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    -{discountPct}% OFF
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">Standard</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="px-3.5 py-2 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>Click any tier row to select that order quantity</span>
        {activeTierIndex >= 0 && (
          <span className="text-emerald-700 font-medium flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            Active Tier Applied
          </span>
        )}
      </div>
    </div>
  );
}
