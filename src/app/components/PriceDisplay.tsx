'use client';

import React from 'react';
import { Product } from '@/types/product';
import { UserType } from '@/types/auth';
import { 
  calculatePrice, 
  getWholesaleTiers, 
  formatPrice, 
  formatDiscount 
} from '@/utils/pricing';

interface PriceDisplayProps {
  product: Product;
  quantity?: number;
  userType?: UserType;
  showWholesaleTiers?: boolean;
  className?: string;
}

export default function PriceDisplay({
  product,
  quantity = 1,
  userType = 'GUEST',
  showWholesaleTiers = false,
  className = '',
}: PriceDisplayProps) {
  const priceInfo = calculatePrice(product, quantity);
  const wholesaleTiers = getWholesaleTiers(product);
  const isWholesale = userType === 'WHOLESALE';

  return (
    <div className={`price-display ${className}`}>
      {/* Main Price Display */}
      <div className="main-price mb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(priceInfo.price)}
          </span>
          
          {priceInfo.originalPrice && (
            <>
              <span className="text-xl text-gray-500 line-through">
                {formatPrice(priceInfo.originalPrice)}
              </span>
              {priceInfo.discount && (
                <span className="px-2 py-1 bg-red-500 text-white text-sm font-semibold rounded">
                  {formatDiscount(priceInfo.discount)}
                </span>
              )}
            </>
          )}
        </div>

        {priceInfo.priceType === 'wholesale' && priceInfo.tier && (
          <div className="mt-2 text-sm text-green-600 font-medium">
            ✓ Wholesale Price Applied
          </div>
        )}

        {priceInfo.savings && priceInfo.savings > 0 && (
          <div className="mt-2 text-sm text-green-600">
            You save: {formatPrice(priceInfo.savings)} on this order
          </div>
        )}
      </div>

      {/* Wholesale Tiers Table - Alibaba Style */}
      {showWholesaleTiers && wholesaleTiers.length > 0 && (
        <div className="wholesale-tiers mt-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>📦</span>
            <span>Bulk Pricing (Buy More, Save More)</span>
          </h3>
          
          {!isWholesale && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>💼 Want wholesale prices?</strong> Register as a business customer to unlock these bulk deals!
            </div>
          )}

          {/* Alibaba-style Price Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {wholesaleTiers.map((tier, index) => {
              const isActive = 
                isWholesale && 
                quantity >= tier.minQuantity && 
                (tier.maxQuantity === null || quantity <= tier.maxQuantity);

              return (
                <div
                  key={index}
                  className={`relative border-2 rounded-lg p-4 transition-all ${
                    isActive 
                      ? 'border-green-500 bg-green-50 shadow-lg scale-105' 
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        ✓ CURRENT PRICE
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center">
                    {/* Quantity Range */}
                    <div className="text-sm font-semibold text-gray-600 mb-2">
                      {tier.minQuantity}
                      {tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'} pieces
                    </div>
                    
                    {/* Price per piece */}
                    <div className="mb-2">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatPrice(tier.price)}
                      </div>
                      <div className="text-xs text-gray-500">per piece</div>
                    </div>
                    
                    {/* Discount Badge */}
                    {tier.discount > 0 && (
                      <div className="inline-block px-3 py-1 bg-red-500 text-white text-sm font-bold rounded">
                        {formatDiscount(tier.discount)}
                      </div>
                    )}
                    
                    {/* Total Price Example */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-xs text-gray-600">
                        {tier.minQuantity} pcs = {formatPrice(tier.price * tier.minQuantity)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Classic Table View (Alternative) */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
              View as Table
            </summary>
            <div className="overflow-x-auto mt-3">
              <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Quantity Range
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Price/Piece
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Savings
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Total Price (Min Qty)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wholesaleTiers.map((tier, index) => {
                    const isActive = 
                      isWholesale && 
                      quantity >= tier.minQuantity && 
                      (tier.maxQuantity === null || quantity <= tier.maxQuantity);

                    return (
                      <tr
                        key={index}
                        className={`border-t ${
                          isActive ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 text-sm">
                          {tier.minQuantity}
                          {tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'} pcs
                        </td>
                        <td className="px-4 py-3 text-sm font-bold">
                          {formatPrice(tier.price)}/pc
                          {isActive && (
                            <span className="ml-2 text-xs text-green-600">✓ Applied</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">
                          {tier.discount > 0 ? formatDiscount(tier.discount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatPrice(tier.price * tier.minQuantity)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      {/* Upgrade Notice for Business Customers */}
      {!isWholesale && !showWholesaleTiers && (
        <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-2xl">💼</div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">
                Want to buy in bulk?
              </h4>
              <p className="text-sm text-gray-600 mb-2">
                Save up to {wholesaleTiers[wholesaleTiers.length - 1]?.discount}% with wholesale pricing!
              </p>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium underline">
                View Wholesale Prices →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
