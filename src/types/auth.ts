// types/auth.ts

export type UserType = 'retail' | 'wholesale' | 'guest';
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
}

export interface User {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  phone: string;
  role: UserRole;
  userType: UserType;
  isVerified: boolean;
  isActive: boolean;
  businessInfo?: BusinessInfo;
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

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  role: 'buyer' | 'seller';
  userType: 'retail' | 'wholesale'; // B2C or B2B
  
  // Required for wholesale/B2B
  companyName?: string;
  businessInfo?: {
    companyType?: string;
    registrationNumber?: string;
    taxId?: string;
    website?: string;
    employeeCount?: string;
    annualPurchaseVolume?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isRetailCustomer: boolean;    // Helper: is B2C customer
  isWholesaleCustomer: boolean; // Helper: is B2B customer
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}
