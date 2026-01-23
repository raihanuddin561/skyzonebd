/**
 * Pagination Utilities
 * Helper functions for implementing cursor-based and offset-based pagination
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

/**
 * Parse pagination parameters from URL search params
 */
export function getPaginationParams(searchParams: URLSearchParams): PaginationQuery {
  const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') || '20'), 1),
    100 // Max 100 items per page
  );
  
  const skip = (page - 1) * limit;
  
  return {
    skip,
    take: limit,
    page,
    limit
  };
}

/**
 * Create pagination metadata for response
 */
export function createPaginationResponse(
  total: number,
  page: number,
  limit: number
): PaginationResult {
  const pages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1
  };
}

/**
 * Calculate pagination range (for UI)
 */
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const half = Math.floor(maxVisible / 2);
  let start = currentPage - half;
  let end = currentPage + half;
  
  if (start < 1) {
    start = 1;
    end = maxVisible;
  }
  
  if (end > totalPages) {
    end = totalPages;
    start = totalPages - maxVisible + 1;
  }
  
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Cursor-based pagination (for infinite scroll)
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  prevCursor?: string;
  hasMore: boolean;
}

/**
 * Create cursor from ID
 */
export function createCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

/**
 * Parse cursor to get ID
 */
export function parseCursor(cursor: string): string | null {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    return null;
  }
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(
  page?: number,
  limit?: number
): { valid: boolean; error?: string } {
  if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
    return {
      valid: false,
      error: 'Page must be a positive integer'
    };
  }
  
  if (limit !== undefined && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
    return {
      valid: false,
      error: 'Limit must be between 1 and 100'
    };
  }
  
  return { valid: true };
}
