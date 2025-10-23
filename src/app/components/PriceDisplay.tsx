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
  userType = 'guest',
  showWholesaleTiers = false,
  className = '',
}: PriceDisplayProps) {
  const priceInfo = calculatePrice(product, quantity, userType);
  const wholesaleTiers = getWholesaleTiers(product);
  const isWholesale = userType === 'wholesale';

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

      {/* Wholesale Tiers Table */}
      {showWholesaleTiers && wholesaleTiers.length > 0 && (
        <div className="wholesale-tiers mt-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span>📦</span>
            <span>Wholesale Pricing</span>
          </h3>
          
          {!isWholesale && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
              <strong>Want wholesale prices?</strong> Register as a business customer to unlock these deals!
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Discount
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
                        {tier.maxQuantity ? ` - ${tier.maxQuantity}` : '+'} units
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {formatPrice(tier.price)}
                        {isActive && (
                          <span className="ml-2 text-xs text-green-600">✓ Current</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-green-600">
                        {formatDiscount(tier.discount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {product.wholesaleMOQ && (
            <div className="mt-3 text-sm text-gray-600">
              <strong>Minimum Order:</strong> {product.wholesaleMOQ} units for wholesale pricing
            </div>
          )}
        </div>
      )}

      {/* Upgrade Notice for Retail Customers */}
      {!isWholesale && product.wholesaleEnabled && !showWholesaleTiers && (
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
