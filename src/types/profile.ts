// types/profile.ts - Profile and Address Management Types

/**
 * User Profile Update Data
 */
export interface ProfileUpdateData {
  name: string;
  email: string;
  phone: string;
  companyName?: string | null;
}

/**
 * Password Change Data
 */
export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

/**
 * Address Data
 */
export interface AddressData {
  id?: string;
  name?: string;
  phone: string;
  street: string;
  area: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
  label?: 'Home' | 'Work' | 'Other';
}

/**
 * Address Create/Update Input
 */
export interface AddressInput {
  name?: string;
  phone: string;
  street: string;
  area: string;
  city: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
  label?: 'Home' | 'Work' | 'Other';
}

/**
 * Business Information Data
 */
export interface BusinessInfoData {
  companyType?: 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'WHOLESALER' | 'SERVICE_PROVIDER' | 'OTHER' | null;
  registrationNumber?: string | null;
  taxId?: string | null;
  tradeLicenseUrl?: string | null;
  website?: string | null;
  description?: string | null;
  yearEstablished?: number | null;
  numberOfEmployees?: number | null;
  annualRevenue?: number | null;
}

/**
 * Complete User Profile with Relations
 */
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string | null;
  role: string;
  userType: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  businessInfo?: BusinessInfoData | null;
  addresses: AddressData[];
}

/**
 * Profile API Response
 */
export interface ProfileResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

/**
 * Address API Response
 */
export interface AddressResponse {
  success: boolean;
  address?: AddressData;
  addresses?: AddressData[];
  message?: string;
  error?: string;
}

/**
 * Business Info API Response
 */
export interface BusinessInfoResponse {
  success: boolean;
  businessInfo?: BusinessInfoData | null;
  message?: string;
  error?: string;
}

/**
 * Profile Completion Status
 */
export interface ProfileCompletionStatus {
  overall: number; // Percentage 0-100
  sections: {
    basicInfo: boolean; // name, email, phone
    address: boolean; // At least one address
    businessInfo: boolean; // Optional business details
  };
}
