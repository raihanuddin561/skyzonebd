'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

export default function PaymentsPage() {
  const [methods, setMethods] = useState([
    { id: '1', name: 'bKash', enabled: true, icon: '📱', type: 'mobile' },
    { id: '2', name: 'Nagad', enabled: true, icon: '💸', type: 'mobile' },
    { id: '3', name: 'Rocket', enabled: false, icon: '🚀', type: 'mobile' },
    { id: '4', name: 'Bank Transfer', enabled: true, icon: '🏦', type: 'bank' },
    { id: '5', name: 'Cash on Delivery', enabled: true, icon: '💵', type: 'cod' },
    { id: '6', name: 'Credit/Debit Card', enabled: false, icon: '💳', type: 'card' },
  ]);

  const toggleMethod = (id: string) => {
    setMethods(methods.map(m => m.id === id ? {...m, enabled: !m.enabled} : m));
    toast.success('Payment method updated');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Methods</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Configure payment options for customers</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Methods</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{methods.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Active</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {methods.filter(m => m.enabled).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 col-span-2 lg:col-span-1">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Inactive</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {methods.filter(m => !m.enabled).length}
          </div>
        </div>
      </div>

      {/* Payment Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map((method) => (
          <div
            key={method.id}
            className={`bg-white rounded-lg shadow-sm border-2 p-4 sm:p-6 transition-all ${
              method.enabled ? 'border-green-500' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl sm:text-4xl">{method.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{method.name}</h3>
                  <span className="text-xs text-gray-600 capitalize">{method.type}</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={method.enabled}
                  onChange={() => toggleMethod(method.id)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            
            <div className={`text-xs sm:text-sm font-medium mb-2 ${method.enabled ? 'text-green-600' : 'text-gray-500'}`}>
              {method.enabled ? '✓ Active' : '○ Inactive'}
            </div>
            
            <button
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Configure
            </button>
          </div>
        ))}
      </div>

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Payment Gateway Integration</h3>
        <p className="text-sm text-blue-700">
          To fully enable online payments (bKash, Nagad, Cards), you'll need to integrate with payment gateway APIs.
          Contact your payment provider for API credentials and setup instructions.
        </p>
      </div>
    </div>
  );
}
