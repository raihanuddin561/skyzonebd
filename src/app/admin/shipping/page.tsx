'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

interface ShippingZone {
  id: string;
  name: string;
  areas: string[];
  rate: number;
  estimatedDays: string;
  enabled: boolean;
}

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>([
    {
      id: '1',
      name: 'Dhaka City',
      areas: ['Dhanmondi', 'Gulshan', 'Banani', 'Mirpur', 'Uttara'],
      rate: 60,
      estimatedDays: '1-2',
      enabled: true
    },
    {
      id: '2',
      name: 'Dhaka Metro',
      areas: ['Gazipur', 'Narayanganj', 'Savar'],
      rate: 100,
      estimatedDays: '2-3',
      enabled: true
    },
    {
      id: '3',
      name: 'Major Cities',
      areas: ['Chittagong', 'Sylhet', 'Rajshahi', 'Khulna'],
      rate: 150,
      estimatedDays: '3-5',
      enabled: true
    },
    {
      id: '4',
      name: 'Other Districts',
      areas: ['All other areas'],
      rate: 120,
      estimatedDays: '4-7',
      enabled: true
    }
  ]);

  const toggleZone = (id: string) => {
    setZones(zones.map(z => z.id === id ? {...z, enabled: !z.enabled} : z));
    toast.success('Shipping zone updated');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configure shipping zones and rates</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm sm:text-base">
          + Add Zone
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Zones</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">{zones.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-green-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Active Zones</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600">
            {zones.filter(z => z.enabled).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Lowest Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            ৳{Math.min(...zones.map(z => z.rate))}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Highest Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            ৳{Math.max(...zones.map(z => z.rate))}
          </div>
        </div>
      </div>

      {/* Shipping Zones */}
      <div className="space-y-4">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className={`bg-white rounded-lg shadow-sm border-2 p-4 sm:p-6 transition-all ${
              zone.enabled ? 'border-green-500' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">{zone.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    zone.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {zone.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Delivery Charge</div>
                    <div className="text-xl font-bold text-blue-600">৳{zone.rate}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Estimated Time</div>
                    <div className="text-base font-semibold text-gray-900">{zone.estimatedDays} days</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Coverage</div>
                    <div className="text-base font-semibold text-gray-900">{zone.areas.length} areas</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-gray-600 mb-1">Covered Areas:</div>
                  <div className="flex flex-wrap gap-1">
                    {zone.areas.map((area, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex sm:flex-col gap-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={zone.enabled}
                    onChange={() => toggleZone(zone.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
                <button className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 whitespace-nowrap">
                  Edit Zone
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partners Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Delivery Partners</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {['Pathao', 'Steadfast', 'eCourier', 'Redx', 'Paperfly'].map((partner) => (
            <div key={partner} className="border border-gray-200 rounded-lg p-3 text-center hover:border-blue-500 transition-colors cursor-pointer">
              <div className="text-2xl mb-1">🚚</div>
              <div className="text-sm font-medium text-gray-900">{partner}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
