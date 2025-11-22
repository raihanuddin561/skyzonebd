/**
 * API Client Utility with automatic token handling and 401 error interception
 */

interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * Enhanced fetch wrapper that handles authentication and token expiration
 */
export async function apiClient(url: string, options: ApiRequestOptions = {}) {
  const { requireAuth = true, headers = {}, ...restOptions } = options;

  // Add auth token if required
  if (requireAuth) {
    const token = localStorage.getItem('token');
    
    if (token) {
      // Check token expiration before making request
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Date.now() / 1000;
          
          if (payload.exp && payload.exp < now) {
            console.warn('⚠️ Token expired, logging out...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            throw new Error('Token expired');
          }
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
      
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    } else if (requireAuth) {
      // Redirect to login if auth required but no token
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
  }

  // Add default content type
  if (!headers.hasOwnProperty('Content-Type')) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }

  // Make request
  const response = await fetch(url, {
    ...restOptions,
    headers
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    console.warn('⚠️ 401 Unauthorized - Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return response;
}

/**
 * Convenience methods
 */
export const api = {
  get: (url: string, options?: ApiRequestOptions) => 
    apiClient(url, { ...options, method: 'GET' }),
  
  post: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiClient(url, { 
      ...options, 
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  patch: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiClient(url, { 
      ...options, 
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  put: (url: string, data?: any, options?: ApiRequestOptions) => 
    apiClient(url, { 
      ...options, 
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    }),
  
  delete: (url: string, options?: ApiRequestOptions) => 
    apiClient(url, { ...options, method: 'DELETE' })
};
