'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    general: {
      siteName: 'SkyzoneBD',
      email: 'info@skyzonebd.com',
      phone: '+880 1XXX-XXXXXX',
      address: 'Dhaka, Bangladesh',
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
    },
    orders: {
      minimumOrderAmount: 500,
      freeShippingThreshold: 2000,
      taxRate: 0,
      processingTime: '1-2 business days',
    },
    system: {
      maintenanceMode: false,
      allowGuestCheckout: true,
      requireEmailVerification: false,
      autoApproveB2B: false,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const result = await response.json();
      if (result.success) {
        setSettings(result.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading settings...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Site Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Configure your e-commerce store</p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">General Information</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
            <input
              type="text"
              value={settings.general.siteName}
              onChange={(e) => setSettings({...settings, general: {...settings.general, siteName: e.target.value}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
            <input
              type="email"
              value={settings.general.email}
              onChange={(e) => setSettings({...settings, general: {...settings.general, email: e.target.value}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
            <input
              type="tel"
              value={settings.general.phone}
              onChange={(e) => setSettings({...settings, general: {...settings.general, phone: e.target.value}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
            <select
              value={settings.general.currency}
              onChange={(e) => setSettings({...settings, general: {...settings.general, currency: e.target.value}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="BDT">BDT (৳)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea
              value={settings.general.address}
              onChange={(e) => setSettings({...settings, general: {...settings.general, address: e.target.value}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Order Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Order Settings</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Order Amount (৳)</label>
            <input
              type="number"
              value={settings.orders.minimumOrderAmount}
              onChange={(e) => setSettings({...settings, orders: {...settings.orders, minimumOrderAmount: parseFloat(e.target.value)}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Free Shipping Threshold (৳)</label>
            <input
              type="number"
              value={settings.orders.freeShippingThreshold}
              onChange={(e) => setSettings({...settings, orders: {...settings.orders, freeShippingThreshold: parseFloat(e.target.value)}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
            <input
              type="number"
              value={settings.orders.taxRate}
              onChange={(e) => setSettings({...settings, orders: {...settings.orders, taxRate: parseFloat(e.target.value)}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">System Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <div className="font-medium text-gray-900">Maintenance Mode</div>
              <div className="text-sm text-gray-600">Temporarily disable the site for maintenance</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.system.maintenanceMode}
                onChange={(e) => setSettings({...settings, system: {...settings.system, maintenanceMode: e.target.checked}})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-medium text-gray-900">Guest Checkout</div>
              <div className="text-sm text-gray-600">Allow customers to checkout without creating an account</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.system.allowGuestCheckout}
                onChange={(e) => setSettings({...settings, system: {...settings.system, allowGuestCheckout: e.target.checked}})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Save Settings
        </button>
      </div>
    </div>
  );
}
