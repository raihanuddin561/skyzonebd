'use client'

import { useState, useEffect } from 'react';

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function QuantityInput({
  value,
  onChange,
  min = 1,
  max,
  label,
  showLabel = true,
  disabled = false,
  className = ''
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string>('');

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const validateAndUpdate = (newValue: string) => {
    // Allow empty input temporarily
    if (newValue === '') {
      setInputValue('');
      return;
    }

    // Remove non-numeric characters
    const numericValue = newValue.replace(/[^0-9]/g, '');
    
    if (numericValue === '') {
      setInputValue('');
      return;
    }

    const parsedValue = parseInt(numericValue);

    // Validate against min/max
    if (parsedValue < min) {
      setError(`Minimum quantity is ${min}`);
      setInputValue(numericValue);
    } else if (max && parsedValue > max) {
      setError(`Maximum quantity is ${max}`);
      setInputValue(numericValue);
    } else {
      setError('');
      setInputValue(numericValue);
      onChange(parsedValue);
    }
  };

  const handleBlur = () => {
    // On blur, ensure we have a valid value
    if (inputValue === '' || parseInt(inputValue) < min) {
      setInputValue(min.toString());
      onChange(min);
      setError('');
    } else if (max && parseInt(inputValue) > max) {
      setInputValue(max.toString());
      onChange(max);
      setError('');
    }
  };

  const handleIncrement = () => {
    const newValue = value + 1;
    if (!max || newValue <= max) {
      onChange(newValue);
      setError('');
    } else {
      setError(`Maximum quantity is ${max}`);
    }
  };

  const handleDecrement = () => {
    const newValue = value - 1;
    if (newValue >= min) {
      onChange(newValue);
      setError('');
    } else {
      setError(`Minimum quantity is ${min}`);
    }
  };

  return (
    <div className={className}>
      {showLabel && label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        {/* Decrement Button */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-600 border-2 border-gray-300 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-700"
          aria-label="Decrease quantity"
        >
          <svg 
            className="w-5 h-5 sm:w-6 sm:h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
          </svg>
        </button>

        {/* Input Field */}
        <div className="relative flex-1">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => validateAndUpdate(e.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
            className={`w-full h-10 sm:h-12 px-3 py-2 text-center border-2 rounded-lg text-base sm:text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
              error 
                ? 'border-red-300 text-red-600 bg-red-50' 
                : 'border-gray-300 text-gray-900 bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label="Quantity"
          />
          {error && (
            <div className="absolute top-full left-0 right-0 mt-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Increment Button */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-gray-50 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-600 border-2 border-gray-300 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-700"
          aria-label="Increase quantity"
        >
          <svg 
            className="w-5 h-5 sm:w-6 sm:h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Helper Text */}
      {!error && showLabel && (
        <div className="mt-2 text-xs text-gray-500">
          {min > 1 && `Min: ${min}`}
          {max && ` • Max: ${max}`}
        </div>
      )}
    </div>
  );
}
