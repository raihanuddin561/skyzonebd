/**
 * Error State Component
 * Consistent error displays with actionable CTAs and retry logic
 */

import React from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | string;
  onRetry?: () => void;
  onGoBack?: () => void;
  showDetails?: boolean;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onGoBack,
  showDetails = false
}: ErrorStateProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <div className="text-center py-12 px-4">
      {/* Error Icon */}
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
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      {/* Message */}
      {(message || errorMessage) && (
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          {message || errorMessage}
        </p>
      )}

      {/* Error Details (collapsible) */}
      {showDetails && error && typeof error !== 'string' && (
        <details className="mb-6 max-w-lg mx-auto text-left">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            View technical details
          </summary>
          <pre className="mt-2 p-4 bg-gray-50 border rounded text-xs overflow-x-auto text-left">
            {error.stack || error.toString()}
          </pre>
        </details>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Again
          </button>
        )}

        {onGoBack && (
          <button
            onClick={onGoBack}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </button>
        )}

        {!onRetry && !onGoBack && (
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
          >
            Go to Home
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Network Error State
 */
export function NetworkErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      onGoBack={() => window.history.back()}
    />
  );
}

/**
 * Not Found Error State
 */
export function NotFoundErrorState({ resourceName = 'Page' }: { resourceName?: string }) {
  return (
    <ErrorState
      title={`${resourceName} Not Found`}
      message={`The ${resourceName.toLowerCase()} you're looking for doesn't exist or has been removed.`}
      onGoBack={() => window.history.back()}
    />
  );
}

/**
 * Permission Error State
 */
export function PermissionErrorState() {
  return (
    <ErrorState
      title="Permission Denied"
      message="You don't have permission to access this resource. Please contact support if you think this is an error."
      onGoBack={() => window.history.back()}
    />
  );
}

/**
 * Server Error State
 */
export function ServerErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorState
      title="Server Error"
      message="Something went wrong on our end. We've been notified and are working to fix it. Please try again in a few moments."
      onRetry={onRetry}
      onGoBack={() => window.history.back()}
    />
  );
}

/**
 * Validation Error State
 */
export function ValidationErrorState({
  errors,
  onClose
}: {
  errors: string[];
  onClose?: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <svg
          className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-800 mb-2">
            Please correct the following errors:
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-sm text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-3 text-red-600 hover:text-red-800 focus:outline-none"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Inline Error (for form fields)
 */
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center mt-1 text-sm text-red-600">
      <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

/**
 * Toast-style Error Banner
 */
export function ErrorBanner({
  message,
  onClose,
  autoClose = false,
  duration = 5000
}: {
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoClose && visible) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in-right">
      <div className="bg-red-50 border-l-4 border-red-600 rounded-lg shadow-lg p-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-red-600 mt-0.5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">{message}</p>
          </div>
          {onClose && (
            <button
              onClick={() => {
                setVisible(false);
                onClose();
              }}
              className="ml-3 text-red-600 hover:text-red-800 focus:outline-none"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
