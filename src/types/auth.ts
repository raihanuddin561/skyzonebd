// types/auth.ts - Simplified Registration

export type UserType = 'RETAIL' | 'WHOLESALE' | 'SELLER' | 'ADMIN' | 'GUEST';
export type UserRole = 'buyer' | 'seller' | 'admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'resubmit';

export interface BusinessInfo {
  companyType?: string;
  registrationNumber?: string;
  taxId?: string;
  website?: string;
  employeeCount?: string;
  annualPurchaseVolume?: string;
  tradeLicenseUrl?: string;
  taxCertificateUrl?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string;
  businessAddress?: string;
  businessCity?: string;
  businessCountry?: string;
  shippingPreferences?: string;
  paymentTerms?: string;
  creditLimit?: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;  // Optional
  phone: string;  // Required
  role: UserRole;
  userType: UserType;
  isVerified: boolean;
  isActive: boolean;
  profitSharePercentage?: number;  // For profit-sharing partners
  isProfitPartner?: boolean;
  businessInfo?: BusinessInfo;  // Optional - can complete from profile
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Simple registration - only name, email, phone, address required
export interface RegisterData {
  name: string;           // Required
  email: string;          // Required
  password: string;       // Required
  confirmPassword: string;// Required
  phone: string;          // Required (mobile)
  
  // Optional fields - can add later from profile
  role?: 'buyer' | 'seller';
  userType?: 'RETAIL' | 'WHOLESALE' | 'GUEST';
  companyName?: string;
  
  // Business info optional - can complete from profile later
  businessInfo?: {
    companyType?: string;
    registrationNumber?: string;
    taxId?: string;
    tradeLicenseUrl?: string;
    website?: string;
    employeeCount?: string;
    annualPurchaseVolume?: string;
    businessAddress?: string;
    businessCity?: string;
    shippingPreferences?: string;
  };
}

// Guest checkout - only phone and address required
export interface GuestCheckoutData {
  phone: string;          // Required
  name?: string;          // Optional
  email?: string;         // Optional
  shippingAddress: {      // Required
    street: string;
    city: string;
    postalCode?: string;
    country?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isWholesaleCustomer: boolean;
  isGuest: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  guestCheckout: (data: GuestCheckoutData) => Promise<void>;
  logout: () => void;
  refreshUser?: () => Promise<void>;
}
