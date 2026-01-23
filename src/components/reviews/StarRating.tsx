/**
 * Star Rating Component
 * Display and input star ratings
 */

import React from 'react';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showNumber = true,
  interactive = false,
  onChange
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  const starClass = sizeClasses[size];
  
  const handleClick = (selectedRating: number) => {
    if (interactive && onChange) {
      onChange(selectedRating);
    }
  };
  
  return (
    <div className="flex items-center gap-1">
      {[...Array(maxRating)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= rating;
        const isHalfFilled = starValue - 0.5 <= rating && starValue > rating;
        
        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(starValue)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
          >
            {isFilled ? (
              <svg className={`${starClass} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ) : isHalfFilled ? (
              <svg className={`${starClass} text-yellow-400`} fill="currentColor" viewBox="0 0 20 20">
                <defs>
                  <linearGradient id={`half-${index}`}>
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="#d1d5db" />
                  </linearGradient>
                </defs>
                <path
                  fill={`url(#half-${index})`}
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                />
              </svg>
            ) : (
              <svg className={`${starClass} text-gray-300`} fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </button>
        );
      })}
      {showNumber && (
        <span className="ml-2 text-sm text-gray-600">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
