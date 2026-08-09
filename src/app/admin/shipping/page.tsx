'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface ShippingZone {
  id: string;
  name: string;
  areas: string[];
  rate: number;
  deliveryTime: string;
  enabled: boolean;
}

interface DeliveryPartner {
  id: string;
  name: string;
  enabled: boolean;
  coverage: string[];
}

export default function ShippingPage() {
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/shipping', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const result = await response.json();

      if (result.success) {
        setZones(result.data.zones);
        setPartners(result.data.partners);
      } else {
        toast.error(result.error || 'Failed to load shipping configuration');
      }
    } catch (error) {
      console.error('Error fetching shipping config:', error);
      toast.error('Failed to load shipping configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleZone = async (id: string) => {
    const zone = zones.find(z => z.id === id);
    if (!zone) return;

    setSavingId(id);
    const nextEnabled = !zone.enabled;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/shipping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ type: 'zone', id, enabled: nextEnabled }),
      });
      const result = await response.json();

      if (result.success) {
        setZones(zones.map(z => (z.id === id ? { ...z, enabled: nextEnabled } : z)));
        toast.success('Shipping zone updated');
      } else {
        toast.error(result.error || 'Failed to update shipping zone');
      }
    } catch (error) {
      console.error('Error updating shipping zone:', error);
      toast.error('Failed to update shipping zone');
    } finally {
      setSavingId(null);
    }
  };

  const togglePartner = async (id: string) => {
    const partner = partners.find(p => p.id === id);
    if (!partner) return;

    setSavingId(id);
    const nextEnabled = !partner.enabled;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/shipping', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ type: 'partner', id, enabled: nextEnabled }),
      });
      const result = await response.json();

      if (result.success) {
        setPartners(partners.map(p => (p.id === id ? { ...p, enabled: nextEnabled } : p)));
        toast.success(`${partner.name} ${nextEnabled ? 'enabled' : 'disabled'}`);
      } else {
        toast.error(result.error || 'Failed to update delivery partner');
      }
    } catch (error) {
      console.error('Error updating delivery partner:', error);
      toast.error('Failed to update delivery partner');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shipping Management</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Configure shipping zones and rates</p>
        </div>
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
            {zones.length > 0 ? `৳${Math.min(...zones.map(z => z.rate))}` : '—'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Highest Rate</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900">
            {zones.length > 0 ? `৳${Math.max(...zones.map(z => z.rate))}` : '—'}
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
                    <div className="text-base font-semibold text-gray-900">{zone.deliveryTime}</div>
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
                    disabled={savingId === zone.id}
                    onChange={() => toggleZone(zone.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partners Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Delivery Partners</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {partners.map((partner) => (
            <button
              key={partner.id}
              onClick={() => togglePartner(partner.id)}
              disabled={savingId === partner.id}
              className={`border rounded-lg p-3 text-center transition-colors cursor-pointer disabled:opacity-50 ${
                partner.enabled
                  ? 'border-green-500 bg-green-50 hover:border-green-600'
                  : 'border-gray-200 hover:border-blue-500'
              }`}
            >
              <div className="text-2xl mb-1">🚚</div>
              <div className="text-sm font-medium text-gray-900">{partner.name}</div>
              <div className={`text-xs mt-1 ${partner.enabled ? 'text-green-700' : 'text-gray-400'}`}>
                {partner.enabled ? 'Active' : 'Inactive'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
