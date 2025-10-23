// utils/localStorage.ts

/**
 * Safe localStorage operations that handle SSR/hydration issues
 */

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },

  removeItem: (key: string): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },

  // Clean up corrupted data
  cleanupCorruptedData: (): void => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      const keysToCheck = ['user', 'token', 'cart', 'wishlist'];
      keysToCheck.forEach(key => {
        const value = localStorage.getItem(key);
        if (value === 'undefined' || value === 'null') {
          localStorage.removeItem(key);
          console.log(`Cleaned up corrupted data for key: ${key}`);
        }
      });
    } catch (error) {
      console.error('Error cleaning up localStorage:', error);
    }
  },

  getJSON: <T>(key: string): T | null => {
    const item = safeLocalStorage.getItem(key);
    // Check for null, undefined, or invalid string values
    if (!item || item === 'undefined' || item === 'null') {
      return null;
    }
    
    try {
      return JSON.parse(item);
    } catch (error) {
      console.error('Error parsing JSON from localStorage:', error);
      // Remove corrupted data
      safeLocalStorage.removeItem(key);
      return null;
    }
  },

  setJSON: <T>(key: string, value: T): void => {
    try {
      const jsonString = JSON.stringify(value);
      safeLocalStorage.setItem(key, jsonString);
    } catch (error) {
      console.error('Error stringifying JSON for localStorage:', error);
    }
  }
};

export default safeLocalStorage;
