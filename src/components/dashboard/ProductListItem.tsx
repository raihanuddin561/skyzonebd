/**
 * Product List Item Component
 * For displaying products in top/low stock lists
 */

import React from 'react';
import Image from 'next/image';

interface ProductListItemProps {
  product: {
    productId?: string;
    id?: string;
    name: string;
    imageUrl?: string | null;
    price?: number;
    stockQuantity?: number;
    unitsSold?: number;
    revenue?: number;
    orders?: number;
    rating?: number;
    reviewCount?: number;
  };
  showRevenue?: boolean;
  showStock?: boolean;
  showRating?: boolean;
  rank?: number;
}

export default function ProductListItem({
  product,
  showRevenue = true,
  showStock = false,
  showRating = false,
  rank
}: ProductListItemProps) {
  const productId = product.productId || product.id;
  
  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {rank && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-bold flex items-center justify-center">
          #{rank}
        </div>
      )}
      
      {product.imageUrl && (
        <div className="flex-shrink-0 w-16 h-16 relative rounded overflow-hidden bg-gray-50 flex items-center justify-center">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-1"
          />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-gray-900 truncate">{product.name}</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
          {product.price !== undefined && (
            <span className="font-medium">৳{product.price.toLocaleString()}</span>
          )}
          {product.unitsSold !== undefined && (
            <span>{product.unitsSold} sold</span>
          )}
          {showStock && product.stockQuantity !== undefined && (
            <span className={product.stockQuantity <= 5 ? 'text-red-600 font-medium' : ''}>
              Stock: {product.stockQuantity}
            </span>
          )}
          {showRating && product.rating !== undefined && product.rating > 0 && (
            <span className="flex items-center gap-1">
              <span className="text-yellow-500">★</span>
              {product.rating.toFixed(1)}
              {product.reviewCount && ` (${product.reviewCount})`}
            </span>
          )}
        </div>
      </div>
      
      {showRevenue && product.revenue !== undefined && (
        <div className="text-right">
          <p className="text-lg font-bold text-gray-900">
            ৳{product.revenue.toLocaleString()}
          </p>
          {product.orders && (
            <p className="text-sm text-gray-600">{product.orders} orders</p>
          )}
        </div>
      )}
    </div>
  );
}
