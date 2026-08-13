'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Windowed pagination: shows first/last page, a window around the current
 * page, and "…" gaps between — instead of rendering one button per page.
 * Rendering every page number (the previous approach) overflowed a phone
 * viewport once a catalog had more than ~5 pages, with no scroll wrapper.
 */
function getPageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const page of sorted) {
    if (prev && page - prev > 1) {
      result.push('ellipsis');
    }
    result.push(page);
    prev = page;
  }
  return result;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageWindow(currentPage, totalPages);

  return (
    <div className="flex justify-center">
      <nav className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 max-w-full overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 cursor-pointer'
            }`}
            suppressHydrationWarning
          >
            Previous
          </button>

          {pages.map((page, idx) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 select-none">
                …
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all cursor-pointer ${
                  currentPage === page
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200'
                }`}
                suppressHydrationWarning
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 cursor-pointer'
            }`}
            suppressHydrationWarning
          >
            Next
          </button>
        </div>
      </nav>
    </div>
  );
}
