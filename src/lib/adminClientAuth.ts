/**
 * Admin Client Authentication Helper
 * Provides consistent authentication for client-side admin API calls
 */

/**
 * Get the authentication token from localStorage
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem('token');
}

/**
 * Get authentication headers for API requests
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  
  if (!token) {
    return {
      'Content-Type': 'application/json',
    };
  }
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Make an authenticated GET request to an admin endpoint
 */
export async function adminGet<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<AdminApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getAuthHeaders(),
      ...options,
    });
    
    const data = await response.json();
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: data.error || 'Authentication required',
        statusCode: response.status,
        needsAuth: true,
      };
    }
    
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || 'Request failed',
      statusCode: response.status,
      notices: data.notices || [],
    };
  } catch (error) {
    console.error('Admin API GET error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    };
  }
}

/**
 * Make an authenticated POST request to an admin endpoint
 */
export async function adminPost<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<AdminApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    
    const data = await response.json();
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: data.error || 'Authentication required',
        statusCode: response.status,
        needsAuth: true,
      };
    }
    
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || 'Request failed',
      statusCode: response.status,
      notices: data.notices || [],
    };
  } catch (error) {
    console.error('Admin API POST error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    };
  }
}

/**
 * Make an authenticated PUT request to an admin endpoint
 */
export async function adminPut<T = any>(
  endpoint: string,
  body?: any,
  options?: RequestInit
): Promise<AdminApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
    
    const data = await response.json();
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: data.error || 'Authentication required',
        statusCode: response.status,
        needsAuth: true,
      };
    }
    
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || 'Request failed',
      statusCode: response.status,
      notices: data.notices || [],
    };
  } catch (error) {
    console.error('Admin API PUT error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    };
  }
}

/**
 * Make an authenticated DELETE request to an admin endpoint
 */
export async function adminDelete<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<AdminApiResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      ...options,
    });
    
    const data = await response.json();
    
    // Handle authentication errors
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        error: data.error || 'Authentication required',
        statusCode: response.status,
        needsAuth: true,
      };
    }
    
    return {
      success: response.ok,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.error || 'Request failed',
      statusCode: response.status,
      notices: data.notices || [],
    };
  } catch (error) {
    console.error('Admin API DELETE error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    };
  }
}

/**
 * Handle authentication errors by redirecting to login
 */
export function handleAuthError(response: AdminApiResponse<any>) {
  if (response.needsAuth || response.statusCode === 401 || response.statusCode === 403) {
    // Clear invalid token
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
    }
    return true;
  }
  return false;
}

/**
 * Admin API Response Type
 */
export interface AdminApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  statusCode: number;
  notices?: string[];
  needsAuth?: boolean;
}

/**
 * React hook for handling admin API responses with UI feedback
 */
export function useAdminApiResponse() {
  const handleResponse = <T,>(response: AdminApiResponse<T>) => {
    // Handle auth errors
    if (handleAuthError(response)) {
      return null;
    }
    
    // Handle general errors
    if (!response.success) {
      // You can integrate with your toast/notification system here
      console.error('API Error:', response.error);
      return null;
    }
    
    return response.data;
  };
  
  return { handleResponse };
}
