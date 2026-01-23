/**
 * Skeleton Loading Components
 * Prevents layout shift and provides visual feedback during data loading
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  count?: number;
}

/**
 * Base skeleton shimmer effect
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] rounded ${className}`}
      style={{
        animation: 'shimmer 2s infinite linear'
      }}
    />
  );
}

/**
 * Product Card Skeleton (for grid view)
 */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      {/* Image skeleton */}
      <Skeleton className="w-full h-48 mb-4" />
      
      {/* Title skeleton */}
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-4" />
      
      {/* Price skeleton */}
      <Skeleton className="h-6 w-1/3 mb-3" />
      
      {/* Button skeleton */}
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * Product Grid Skeleton
 */
export function ProductGridSkeleton({ count = 12 }: SkeletonProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Product Detail Skeleton (for single product page)
 */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image section */}
        <div>
          <Skeleton className="w-full h-96 mb-4" />
          <div className="grid grid-cols-4 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
        
        {/* Details section */}
        <div>
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-4 w-1/2 mb-6" />
          
          <Skeleton className="h-10 w-1/3 mb-6" />
          
          <div className="space-y-3 mb-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          
          <Skeleton className="h-12 w-full mb-4" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Cart Item Skeleton
 */
export function CartItemSkeleton() {
  return (
    <div className="bg-white border rounded-lg p-3 sm:p-4 shadow-sm">
      <div className="flex gap-4">
        <Skeleton className="w-24 h-24 flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2 mb-3" />
          <Skeleton className="h-6 w-1/3 mb-3" />
          <div className="flex gap-4">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cart Page Skeleton
 */
export function CartPageSkeleton({ count = 3 }: SkeletonProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-8" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: count }).map((_, index) => (
            <CartItemSkeleton key={index} />
          ))}
        </div>
        
        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 shadow-sm sticky top-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Checkout Page Skeleton
 */
export function CheckoutPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-8" />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border rounded-lg p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          
          <div className="bg-white border rounded-lg p-6">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
        
        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-6 shadow-sm sticky top-4">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-3 mb-6">
              <CartItemSkeleton />
              <CartItemSkeleton />
            </div>
            <div className="space-y-2 mb-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Order List Item Skeleton
 */
export function OrderListItemSkeleton() {
  return (
    <div className="bg-white border rounded-lg p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48 mb-3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

/**
 * Order List Skeleton
 */
export function OrderListSkeleton({ count = 5 }: SkeletonProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6" />
      
      {/* Filter tabs */}
      <div className="bg-white rounded-lg shadow-sm border p-2 mb-6">
        <div className="flex gap-1">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Orders list */}
      <div className="space-y-4">
        {Array.from({ length: count }).map((_, index) => (
          <OrderListItemSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Order Detail Skeleton
 */
export function OrderDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6" />
      
      {/* Order info */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        
        {/* Status badges */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
        
        {/* Timeline */}
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
      
      {/* Order items */}
      <div className="bg-white border rounded-lg p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          <CartItemSkeleton />
          <CartItemSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * Table Row Skeleton (for admin tables)
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table Skeleton
 */
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRowSkeleton key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Add shimmer animation to global CSS
export const skeletonStyles = `
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
`;
