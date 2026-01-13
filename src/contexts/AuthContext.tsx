'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthState, User, LoginCredentials, RegisterData, AuthContextType } from '@/types/auth';
import { toast } from 'react-toastify';
import { safeLocalStorage } from '@/utils/localStorage';

// Auth Actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGOUT' };

// Auth Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: action.payload !== null,
        isLoading: false
      };
    
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false
      };
    
    default:
      return state;
  }
}

// Initial state
const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false
};

// Create Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount (only on client-side)
  useEffect(() => {
    const loadUser = () => {
      try {
        // First, cleanup any corrupted data
        safeLocalStorage.cleanupCorruptedData();
        
        const userData = safeLocalStorage.getItem('user');
        const token = safeLocalStorage.getItem('token');
        
        // Check if both exist and userData is not empty/undefined
        if (userData && token && userData !== 'undefined' && userData !== 'null') {
          try {
            // Validate token expiration
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              const now = Date.now() / 1000;
              
              if (payload.exp && payload.exp < now) {
                console.warn('⚠️ Token expired, logging out...');
                safeLocalStorage.removeItem('user');
                safeLocalStorage.removeItem('token');
                dispatch({ type: 'SET_LOADING', payload: false });
                return;
              }
            }
            
            const user = JSON.parse(userData);
            dispatch({ type: 'SET_USER', payload: user });
          } catch (parseError) {
            console.error('Error parsing user data:', parseError);
            // Clear invalid data
            safeLocalStorage.removeItem('user');
            safeLocalStorage.removeItem('token');
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        } else {
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        console.error('Error loading user:', error);
        // Clear localStorage on error
        safeLocalStorage.removeItem('user');
        safeLocalStorage.removeItem('token');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    loadUser();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Simulate API call - replace with actual API endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }
      
      // Store user and token
      safeLocalStorage.setJSON('user', data.user);
      safeLocalStorage.setItem('token', data.token);
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: data.user });
      toast.success('Login successful!');
      
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  // Register function
  const register = async (data: RegisterData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Validation
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Simulate API call - replace with actual API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Registration failed');
      }
      
      // Store user and token
      safeLocalStorage.setJSON('user', responseData.user);
      safeLocalStorage.setItem('token', responseData.token);
      
      dispatch({ type: 'LOGIN_SUCCESS', payload: responseData.user });
      toast.success('Registration successful!');
      
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      toast.error(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    safeLocalStorage.removeItem('user');
    safeLocalStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
    toast.info('Logged out successfully');
  };

  // Refresh user data
  const refreshUser = async () => {
    try {
      const token = safeLocalStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          // Update localStorage and state
          safeLocalStorage.setJSON('user', data.user);
          dispatch({ type: 'SET_USER', payload: data.user });
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value: AuthContextType = {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: state.isAuthenticated,
    isWholesaleCustomer: state.user?.userType === 'WHOLESALE',
    isGuest: state.user?.userType === 'GUEST',
    login,
    register,
    guestCheckout: async () => { /* TODO: Implement guest checkout */ },
    logout,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
