'use client'

import { useEffect } from 'react';

interface ImageZoomLightboxProps {
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  alt?: string;
}

export default function ImageZoomLightbox({ 
  images, 
  currentIndex, 
  onClose, 
  onNext, 
  onPrevious,
  alt = 'Product image'
}: ImageZoomLightboxProps) {
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrevious();
      if (e.key === 'ArrowRight') onNext();
    };

    window.addEventListener('keydown', handleKeyPress);
    
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      document.body.style.overflow = 'unset';
    };
  }, [onClose, onNext, onPrevious]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-3 rounded-full transition-all duration-200 hover:scale-110"
        aria-label="Close lightbox"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Image Counter */}
      {images.length > 1 && (
        <div className="absolute top-4 left-4 z-50 bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-semibold">
          {currentIndex + 1} / {images.length}
        </div>
      )}

      {/* Previous Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-4 rounded-full transition-all duration-200 hover:scale-110"
          aria-label="Previous image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next Button */}
      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-4 rounded-full transition-all duration-200 hover:scale-110"
          aria-label="Next image"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Image */}
      <div 
        className="relative max-w-7xl max-h-[90vh] w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={images[currentIndex]}
          alt={`${alt} - ${currentIndex + 1}`}
          className="w-full h-full object-contain max-h-[90vh]"
        />
      </div>

      {/* Thumbnail Navigation (for multiple images) */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-4xl w-full px-4">
          <div className="flex gap-2 justify-center overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  const diff = index - currentIndex;
                  if (diff > 0) {
                    for (let i = 0; i < diff; i++) onNext();
                  } else if (diff < 0) {
                    for (let i = 0; i < Math.abs(diff); i++) onPrevious();
                  }
                }}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-white ring-4 ring-white/50 scale-110' 
                    : 'border-white/50 hover:border-white opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/60 text-sm text-center hidden sm:block">
        <p>Use arrow keys or swipe to navigate • Press ESC to close</p>
      </div>
    </div>
  );
}
