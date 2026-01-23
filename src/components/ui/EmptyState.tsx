/**
 * Empty State Component
 * Consistent empty state displays with actionable CTAs
 */

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      {/* Icon */}
      {icon || (
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {/* Primary action */}
        {(actionLabel && (actionHref || onAction)) && (
          <>
            {actionHref ? (
              <Link
                href={actionHref}
                className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                onClick={onAction}
                className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
              >
                {actionLabel}
              </button>
            )}
          </>
        )}

        {/* Secondary action */}
        {(secondaryActionLabel && (secondaryActionHref || onSecondaryAction)) && (
          <>
            {secondaryActionHref ? (
              <Link
                href={secondaryActionHref}
                className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                {secondaryActionLabel}
              </Link>
            ) : (
              <button
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer"
              >
                {secondaryActionLabel}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Empty Cart State
 */
export function EmptyCartState() {
  return (
    <EmptyState
      icon={
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
      }
      title="Your cart is empty"
      description="Add some products to get started with your wholesale order."
      actionLabel="Browse Products"
      actionHref="/products"
      secondaryActionLabel="View Featured"
      secondaryActionHref="/"
    />
  );
}

/**
 * Empty Orders State
 */
export function EmptyOrdersState() {
  return (
    <EmptyState
      icon={
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
      }
      title="No orders yet"
      description="You haven't placed any orders yet. Start shopping to see your order history here."
      actionLabel="Start Shopping"
      actionHref="/products"
    />
  );
}

/**
 * Empty Search Results State
 */
export function EmptySearchState({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
      title={query ? `No results for "${query}"` : 'No results found'}
      description="Try adjusting your search or filters to find what you're looking for."
      actionLabel="Clear Filters"
      onAction={() => window.location.href = '/products'}
      secondaryActionLabel="Browse All"
      secondaryActionHref="/products"
    />
  );
}

/**
 * Empty Wishlist State
 */
export function EmptyWishlistState() {
  return (
    <EmptyState
      icon={
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </div>
      }
      title="Your wishlist is empty"
      description="Save products you like to your wishlist to easily find them later."
      actionLabel="Browse Products"
      actionHref="/products"
    />
  );
}

/**
 * No Notifications State
 */
export function EmptyNotificationsState() {
  return (
    <EmptyState
      icon={
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
      }
      title="No notifications"
      description="You're all caught up! We'll notify you when there's something new."
      actionLabel="Go to Dashboard"
      actionHref="/dashboard"
    />
  );
}

/**
 * Access Denied State
 */
export function AccessDeniedState() {
  return (
    <EmptyState
      icon={
        <div className="mb-4">
          <svg
            className="mx-auto h-24 w-24 text-red-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
      }
      title="Access Denied"
      description="You don't have permission to view this page. Please contact support if you think this is an error."
      actionLabel="Go Back"
      onAction={() => window.history.back()}
      secondaryActionLabel="Go Home"
      secondaryActionHref="/"
    />
  );
}
