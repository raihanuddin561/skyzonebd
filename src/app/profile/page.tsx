'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProtectedRoute from '../components/ProtectedRoute';
import { userService, addressService, businessInfoService } from '@/services/apiService';
import Head from 'next/head';

interface ProfileFormData {
  name: string;
  email: string;
  phone: string;
  companyName: string;
  [key: string]: string; // Index signature for compatibility
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Address {
  id: string;
  type: string;
  street: string;
  city: string;
  state?: string | null;
  postalCode?: string | null;
  country: string;
  isDefault: boolean;
}

interface AddressFormData {
  type: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  [key: string]: string | boolean;
}

const emptyAddressForm: AddressFormData = {
  type: 'SHIPPING',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'Bangladesh',
  isDefault: false,
};

interface BusinessInfo {
  companyType?: string | null;
  registrationNumber?: string | null;
  taxId?: string | null;
  website?: string | null;
  employeeCount?: string | null;
  annualPurchaseVolume?: string | null;
  tradeLicenseUrl?: string | null;
  taxCertificateUrl?: string | null;
  businessAddress?: string | null;
  businessCity?: string | null;
  verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMIT';
}

interface BusinessInfoFormData {
  companyType: string;
  registrationNumber: string;
  taxId: string;
  website: string;
  employeeCount: string;
  annualPurchaseVolume: string;
  tradeLicenseUrl: string;
  taxCertificateUrl: string;
  businessAddress: string;
  businessCity: string;
  [key: string]: string;
}

const emptyBusinessForm: BusinessInfoFormData = {
  companyType: '',
  registrationNumber: '',
  taxId: '',
  website: '',
  employeeCount: '',
  annualPurchaseVolume: '',
  tradeLicenseUrl: '',
  taxCertificateUrl: '',
  businessAddress: '',
  businessCity: '',
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    email: '',
    phone: '',
    companyName: ''
  });

  const [passwordData, setPasswordData] = useState<PasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormData>(emptyAddressForm);
  const [addressLoading, setAddressLoading] = useState(false);

  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [isEditingBusiness, setIsEditingBusiness] = useState(false);
  const [businessForm, setBusinessForm] = useState<BusinessInfoFormData>(emptyBusinessForm);
  const [businessLoading, setBusinessLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const response: any = await addressService.getAddresses();
        if (response.success) {
          setAddresses(response.addresses || []);
        }
      } catch (err) {
        console.error('Failed to load addresses:', err);
      }
    };
    loadAddresses();
  }, []);

  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        const response: any = await businessInfoService.getBusinessInfo();
        if (response.success && response.businessInfo) {
          const info = response.businessInfo;
          setBusinessInfo(info);
          setBusinessForm({
            companyType: info.companyType || '',
            registrationNumber: info.registrationNumber || '',
            taxId: info.taxId || '',
            website: info.website || '',
            employeeCount: info.employeeCount || '',
            annualPurchaseVolume: info.annualPurchaseVolume || '',
            tradeLicenseUrl: info.tradeLicenseUrl || '',
            taxCertificateUrl: info.taxCertificateUrl || '',
            businessAddress: info.businessAddress || '',
            businessCity: info.businessCity || '',
          });
        }
      } catch (err) {
        console.error('Failed to load business info:', err);
      }
    };
    loadBusinessInfo();
  }, []);

  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setAddressForm({
      ...addressForm,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!addressForm.street.trim() || !addressForm.city.trim() || !addressForm.country.trim()) {
      setError('Street, city, and country are required');
      return;
    }

    setAddressLoading(true);
    try {
      const response: any = await addressService.addAddress(addressForm);
      if (response.success) {
        setAddresses([...addresses, response.address]);
        setIsAddingAddress(false);
        setAddressForm(emptyAddressForm);
        setSuccess('Address added successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to add address');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add address');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const response: any = await addressService.setDefaultAddress(id);
      if (response.success) {
        setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
      }
    } catch (err) {
      console.error('Failed to set default address:', err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Delete this address?')) return;
    try {
      const response: any = await addressService.deleteAddress(id);
      if (response.success) {
        setAddresses(addresses.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
  };

  const handleBusinessInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBusinessForm({
      ...businessForm,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveBusinessInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!businessForm.companyType) {
      setError('Please select a company type');
      return;
    }

    setBusinessLoading(true);
    try {
      const response: any = await businessInfoService.saveBusinessInfo(businessForm);
      if (response.success) {
        setBusinessInfo(response.businessInfo);
        setIsEditingBusiness(false);
        setSuccess('Business information submitted for verification!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to save business information');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save business information');
    } finally {
      setBusinessLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setError('Name, email, and phone are required');
        setLoading(false);
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        setLoading(false);
        return;
      }

      const response = await userService.updateProfile(formData);

      if (response.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);
        // Refresh user data in context
        if (refreshUser) {
          await refreshUser();
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate password fields
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setError('All password fields are required');
        setLoading(false);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setError('New passwords do not match');
        setLoading(false);
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setError('New password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const response = await userService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      if (response.success) {
        setSuccess('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.error || 'Failed to change password');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError('');
    // Reset form data to original user values
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || ''
      });
    }
  };

  const handleCancelPasswordChange = () => {
    setIsChangingPassword(false);
    setError('');
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-gray-50">
        <Header />

        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xl font-bold shadow-md flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <span className="section-eyebrow mb-1">My Account</span>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
            </div>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-800">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Profile Information */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
              {!isEditing && !isChangingPassword && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                      Company Name
                    </label>
                    <input
                      type="text"
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:cursor-not-allowed border border-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <p className="text-gray-900">{user?.name}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <p className="text-gray-900">{user?.phone}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <p className="text-gray-900">{user?.companyName || 'Not set'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <p className="text-gray-900 capitalize">{user?.role}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Status
                  </label>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    user?.isVerified
                      ? 'bg-green-100 text-green-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {user?.isVerified ? 'Verified' : 'Pending Verification'}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <p className="text-gray-900">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Password Change Section */}
          {!isEditing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Password & Security</h2>
                {!isChangingPassword && (
                  <button
                    onClick={() => setIsChangingPassword(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  >
                    Change Password
                  </button>
                )}
              </div>

              {isChangingPassword ? (
                <form onSubmit={handleChangePassword}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Current Password *
                      </label>
                      <input
                        type="password"
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        New Password *
                      </label>
                      <input
                        type="password"
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        minLength={6}
                      />
                      <p className="mt-1 text-sm text-gray-500">Minimum 6 characters</p>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm New Password *
                      </label>
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all cursor-pointer"
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelPasswordChange}
                      disabled={loading}
                      className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:cursor-not-allowed border border-gray-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-gray-600">
                  Click the button above to change your password
                </p>
              )}
            </div>
          )}

          {/* Saved Addresses Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Saved Addresses</h2>
              {!isAddingAddress && (
                <button
                  onClick={() => setIsAddingAddress(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                >
                  + Add Address
                </button>
              )}
            </div>

            {isAddingAddress && (
              <form onSubmit={handleAddAddress} className="mb-6 p-4 border border-gray-200 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Type</label>
                    <select
                      name="type"
                      value={addressForm.type}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="SHIPPING">Shipping</option>
                      <option value="BILLING">Billing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street *</label>
                    <input
                      type="text"
                      name="street"
                      value={addressForm.street}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={addressForm.city}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State / Division</label>
                    <input
                      type="text"
                      name="state"
                      value={addressForm.state}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      value={addressForm.postalCode}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                    <input
                      type="text"
                      name="country"
                      value={addressForm.country}
                      onChange={handleAddressInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 mt-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="isDefault"
                    checked={addressForm.isDefault}
                    onChange={handleAddressInputChange}
                    className="rounded border-gray-300"
                  />
                  Set as default address
                </label>
                <div className="flex gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={addressLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {addressLoading ? 'Saving...' : 'Save Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsAddingAddress(false); setAddressForm(emptyAddressForm); }}
                    disabled={addressLoading}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors border border-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 && !isAddingAddress ? (
              <p className="text-gray-500">No saved addresses yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                  <div key={address.id} className="border border-gray-200 rounded-xl p-4 relative">
                    {address.isDefault && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Default
                      </span>
                    )}
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">{address.type}</p>
                    <p className="text-gray-900">{address.street}</p>
                    <p className="text-gray-600 text-sm">
                      {address.city}{address.state ? `, ${address.state}` : ''} {address.postalCode || ''}
                    </p>
                    <p className="text-gray-600 text-sm">{address.country}</p>
                    <div className="flex gap-3 mt-3">
                      {!address.isDefault && (
                        <button
                          onClick={() => handleSetDefaultAddress(address.id)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Set as Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteAddress(address.id)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Business Verification Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Business Verification</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Submit your company details to get verified and unlock full wholesale pricing.
                </p>
              </div>
              {businessInfo?.verificationStatus && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                  businessInfo.verificationStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                  businessInfo.verificationStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                  businessInfo.verificationStatus === 'RESUBMIT' ? 'bg-amber-100 text-amber-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {businessInfo.verificationStatus === 'PENDING' ? 'Pending Review' : businessInfo.verificationStatus}
                </span>
              )}
            </div>

            {!isEditingBusiness && businessInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Type</label>
                  <p className="text-gray-900 capitalize">{businessInfo.companyType || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                  <p className="text-gray-900">{businessInfo.registrationNumber || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / TIN</label>
                  <p className="text-gray-900">{businessInfo.taxId || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <p className="text-gray-900">{businessInfo.website || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                  <p className="text-gray-900">
                    {businessInfo.businessAddress || 'Not set'}{businessInfo.businessCity ? `, ${businessInfo.businessCity}` : ''}
                  </p>
                </div>
              </div>
            )}

            {!isEditingBusiness ? (
              <button
                onClick={() => setIsEditingBusiness(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                {businessInfo ? 'Update Business Information' : 'Submit Business Information'}
              </button>
            ) : (
              <form onSubmit={handleSaveBusinessInfo}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Type *</label>
                    <select
                      name="companyType"
                      value={businessForm.companyType}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select type</option>
                      <option value="retailer">Retailer</option>
                      <option value="distributor">Distributor</option>
                      <option value="manufacturer">Manufacturer</option>
                      <option value="wholesaler">Wholesaler</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Registration Number</label>
                    <input
                      type="text"
                      name="registrationNumber"
                      value={businessForm.registrationNumber}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / TIN</label>
                    <input
                      type="text"
                      name="taxId"
                      value={businessForm.taxId}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                    <input
                      type="text"
                      name="website"
                      value={businessForm.website}
                      onChange={handleBusinessInputChange}
                      placeholder="www.example.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of Employees</label>
                    <select
                      name="employeeCount"
                      value={businessForm.employeeCount}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select range</option>
                      <option value="1-10">1-10</option>
                      <option value="11-50">11-50</option>
                      <option value="51-200">51-200</option>
                      <option value="201-500">201-500</option>
                      <option value="500+">500+</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Annual Purchase Volume (BDT)</label>
                    <select
                      name="annualPurchaseVolume"
                      value={businessForm.annualPurchaseVolume}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select range</option>
                      <option value="<1M">Less than 1M</option>
                      <option value="1M-5M">1M - 5M</option>
                      <option value="5M-10M">5M - 10M</option>
                      <option value="10M-50M">10M - 50M</option>
                      <option value=">50M">More than 50M</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                    <input
                      type="text"
                      name="businessAddress"
                      value={businessForm.businessAddress}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business City</label>
                    <input
                      type="text"
                      name="businessCity"
                      value={businessForm.businessCity}
                      onChange={handleBusinessInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Trade License URL</label>
                    <input
                      type="text"
                      name="tradeLicenseUrl"
                      value={businessForm.tradeLicenseUrl}
                      onChange={handleBusinessInputChange}
                      placeholder="Link to a hosted copy of your trade license"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax Certificate URL</label>
                    <input
                      type="text"
                      name="taxCertificateUrl"
                      value={businessForm.taxCertificateUrl}
                      onChange={handleBusinessInputChange}
                      placeholder="Link to a hosted copy of your tax certificate"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-500">
                  Your business account will be reviewed by our team after submission. You'll be notified once it's approved.
                </p>

                <div className="flex gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={businessLoading}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-2 rounded-xl font-semibold shadow-md hover:shadow-lg disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {businessLoading ? 'Submitting...' : 'Submit for Verification'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingBusiness(false)}
                    disabled={businessLoading}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors border border-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <Footer />
      </main>
    </ProtectedRoute>
  );
}
