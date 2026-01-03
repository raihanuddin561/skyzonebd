'use client';

import React, { useState } from 'react';
import { RegisterData } from '@/types/auth';

interface RegistrationFormProps {
  onSubmit: (data: RegisterData) => Promise<void>;
  isLoading?: boolean;
}

export default function RegistrationForm({ onSubmit, isLoading = false }: RegistrationFormProps) {
  const [userType, setUserType] = useState<'RETAIL' | 'WHOLESALE'>('RETAIL');
  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'buyer',
    userType: 'RETAIL',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('businessInfo.')) {
      const field = name.split('.')[1];
      setFormData({
        ...formData,
        businessInfo: {
          ...formData.businessInfo,
          [field]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleUserTypeChange = (type: 'RETAIL' | 'WHOLESALE') => {
    setUserType(type);
    setFormData({
      ...formData,
      userType: type,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Type Selection */}
      <div className="user-type-selection">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          I want to register as:
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleUserTypeChange('retail')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              userType === 'retail'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🛍️</div>
              <div>
                <div className="font-semibold">Retail Customer</div>
                <div className="text-xs text-gray-600">Individual buyer</div>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleUserTypeChange('wholesale')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              userType === 'wholesale'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏢</div>
              <div>
                <div className="font-semibold">Wholesale/Business</div>
                <div className="text-xs text-gray-600">Bulk purchases</div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Personal Information</h3>
        
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number *
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            required
            value={formData.phone}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password *
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            required
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Business Information (only for wholesale) */}
      {userType === 'wholesale' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <span>🏢</span>
            <span>Business Information</span>
          </h3>
          
          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              id="companyName"
              name="companyName"
              required={userType === 'wholesale'}
              value={formData.companyName || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label htmlFor="businessInfo.companyType" className="block text-sm font-medium text-gray-700 mb-1">
              Company Type
            </label>
            <select
              id="businessInfo.companyType"
              name="businessInfo.companyType"
              value={formData.businessInfo?.companyType || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Select type...</option>
              <option value="retailer">Retailer</option>
              <option value="distributor">Distributor</option>
              <option value="manufacturer">Manufacturer</option>
              <option value="wholesaler">Wholesaler</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="businessInfo.registrationNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Business Registration Number
            </label>
            <input
              type="text"
              id="businessInfo.registrationNumber"
              name="businessInfo.registrationNumber"
              value={formData.businessInfo?.registrationNumber || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label htmlFor="businessInfo.taxId" className="block text-sm font-medium text-gray-700 mb-1">
              Tax ID / TIN
            </label>
            <input
              type="text"
              id="businessInfo.taxId"
              name="businessInfo.taxId"
              value={formData.businessInfo?.taxId || ''}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div>
            <label htmlFor="businessInfo.website" className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              id="businessInfo.website"
              name="businessInfo.website"
              value={formData.businessInfo?.website || ''}
              onChange={handleInputChange}
              placeholder="https://"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessInfo.employeeCount" className="block text-sm font-medium text-gray-700 mb-1">
                Number of Employees
              </label>
              <select
                id="businessInfo.employeeCount"
                name="businessInfo.employeeCount"
                value={formData.businessInfo?.employeeCount || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>

            <div>
              <label htmlFor="businessInfo.annualPurchaseVolume" className="block text-sm font-medium text-gray-700 mb-1">
                Annual Purchase Volume
              </label>
              <select
                id="businessInfo.annualPurchaseVolume"
                name="businessInfo.annualPurchaseVolume"
                value={formData.businessInfo?.annualPurchaseVolume || ''}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">Select...</option>
                <option value="< 1M BDT">&lt; 1M BDT</option>
                <option value="1M - 5M BDT">1M - 5M BDT</option>
                <option value="5M - 10M BDT">5M - 10M BDT</option>
                <option value="10M - 50M BDT">10M - 50M BDT</option>
                <option value="> 50M BDT">&gt; 50M BDT</option>
              </select>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded text-sm">
            <p className="font-medium">📝 Note:</p>
            <p className="text-gray-700">
              Your business account will be verified within 2-3 business days. You'll receive wholesale pricing after verification.
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
}
