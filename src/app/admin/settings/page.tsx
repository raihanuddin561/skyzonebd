'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import AdminIcon from '@/app/admin/components/AdminIcons';
import Link from 'next/link';

interface DeliveryZoneConfig {
  id: string;
  name: string;
  chargePoisha: number;
  chargeModel: 'FLAT' | 'TIERED_WEIGHT' | 'FREE_THRESHOLD';
  freeDeliveryThresholdPoisha?: number;
  estimatedDays: string;
  isActive: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    general: {
      siteName: 'SkyzoneBD Wholesale',
      storeTagline: 'Bangladesh’s Premier Wholesale E-Commerce Platform',
      email: 'info@skyzonebd.com',
      phone: '+880 1711-123456',
      address: 'Nawabpur Road, Dhaka-1100, Bangladesh',
      currencySymbol: '৳',
      currencyCode: 'BDT',
      roundingPreference: 'ROUND_HALF_UP',
      timezone: 'Asia/Dhaka',
    },
    delivery: {
      zones: [
        {
          id: 'inside_dhaka',
          name: 'Inside Dhaka',
          chargePoisha: 6000,
          chargeModel: 'FLAT',
          freeDeliveryThresholdPoisha: 500000,
          estimatedDays: '1-2 business days',
          isActive: true,
        },
        {
          id: 'dhaka_suburbs',
          name: 'Dhaka Suburbs (Gazipur, Savar, Narayanganj)',
          chargePoisha: 12000,
          chargeModel: 'FLAT',
          freeDeliveryThresholdPoisha: 500000,
          estimatedDays: '2-3 business days',
          isActive: true,
        },
        {
          id: 'outside_dhaka',
          name: 'Outside Dhaka (All Districts)',
          chargePoisha: 15000,
          chargeModel: 'FLAT',
          freeDeliveryThresholdPoisha: 1000000,
          estimatedDays: '3-5 business days',
          isActive: true,
        },
      ] as DeliveryZoneConfig[],
      globalFreeDeliveryThresholdPoisha: 500000,
      defaultZoneId: 'inside_dhaka',
    },
    tax: {
      vatEnabled: false,
      vatRatePercent: 15.0,
      pricesInclusiveOfVat: false,
      couponsApplyBeforeVat: true,
      binNumber: '003456789-0101',
    },
    charges: {
      codEnabled: true,
      codFeeType: 'FLAT',
      codFeeValuePoisha: 0,
      packagingFeeEnabled: false,
      packagingFeePoisha: 0,
      gatewayFees: {
        bkashFeePercent: 1.5,
        nagadFeePercent: 1.2,
        cardFeePercent: 2.0,
        bankTransferFeePercent: 0,
        passToCustomer: false,
      },
    },
    profitSharing: {
      reservePercentage: 5.0,
      distributionFrequency: 'MONTHLY',
      deductOperatingExpenses: true,
      lossHandlingMode: 'CARRY_FORWARD',
      twoPersonApproval: true,
    },
    orders: {
      minimumOrderAmountPoisha: 0,
      processingTime: '1-2 business days',
      allowGuestCheckout: true,
      autoCancelUnpaidHours: 24,
      minimumOrderAmount: 0,
      freeShippingThreshold: 5000,
      taxRate: 0,
    },
    system: {
      maintenanceMode: false,
      allowGuestCheckout: true,
      requireEmailVerification: false,
      autoApproveB2B: false,
    },
    carousel: {
      autoplayEnabled: true,
      autoplaySpeed: 5,
      transitionEffect: 'fade' as 'fade' | 'slide',
      pauseOnHover: true,
      showArrows: true,
      showDots: true,
      showCounter: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'delivery' | 'tax' | 'charges' | 'profit' | 'orders' | 'carousel' | 'system'>('general');

  // ── DB Migration state ────────────────────────────────────────────────
  const [migrationStatus, setMigrationStatus] = useState<{
    status: 'pending' | 'already_applied' | 'loading' | 'unknown';
    message: string;
    affectedCount?: number;
    appliedAt?: string;
    details?: Record<string, unknown>;
  }>({ status: 'loading', message: 'Checking...' });
  const [runningMigration, setRunningMigration] = useState(false);

  const fetchMigrationStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/migrate-image-urls', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMigrationStatus({
        status: data.status ?? 'unknown',
        message: data.message ?? '',
        affectedCount: data.affectedCount,
        appliedAt: data.appliedAt,
        details: data.details,
      });
    } catch {
      setMigrationStatus({ status: 'unknown', message: 'Could not reach migration API.' });
    }
  }, []);

  const handleRunMigration = async () => {
    if (
      !confirm(
        'Run the one-time imageUrls backfill migration?\n\nThis copies the primary imageUrl into the imageUrls gallery array for legacy products that have an empty gallery. Safe to run — it will only run once.'
      )
    ) return;
    setRunningMigration(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/migrate-image-urls', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.status === 409) { toast.info('Migration was already applied — nothing to do.'); }
      else if (data.success) { toast.success(data.message); }
      else { toast.error(data.error || 'Migration failed'); }
      await fetchMigrationStatus();
    } catch { toast.error('Failed to run migration'); }
    finally { setRunningMigration(false); }
  };
  // ── End DB Migration state ────────────────────────────────────────────

  useEffect(() => {
    fetchSettings();
    fetchMigrationStatus();
  }, [fetchMigrationStatus]);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success && result.data) {
        setSettings((prev: any) => ({
          ...prev,
          ...result.data,
          orders: {
            ...prev.orders,
            ...(result.data.orders || {}),
            minimumOrderAmount: result.data.orders?.minimumOrderAmountPoisha ? result.data.orders.minimumOrderAmountPoisha / 100 : 0,
            freeShippingThreshold: result.data.delivery?.globalFreeDeliveryThresholdPoisha ? result.data.delivery.globalFreeDeliveryThresholdPoisha / 100 : 5000,
            taxRate: result.data.tax?.vatRatePercent || 0,
          },
          system: {
            ...prev.system,
            ...(result.data.system || {}),
            allowGuestCheckout: result.data.orders?.allowGuestCheckout ?? true,
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...settings,
        orders: {
          ...settings.orders,
          minimumOrderAmountPoisha: Math.round((Number(settings.orders.minimumOrderAmount) || 0) * 100),
        },
        delivery: {
          ...settings.delivery,
          globalFreeDeliveryThresholdPoisha: Math.round((Number(settings.delivery.globalFreeDeliveryThresholdPoisha / 100) || 5000) * 100),
        },
      };

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Site settings saved successfully!');
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateZoneField = (zoneIndex: number, field: string, value: any) => {
    const updatedZones = [...settings.delivery.zones];
    updatedZones[zoneIndex] = {
      ...updatedZones[zoneIndex],
      [field]: value,
    };
    setSettings({
      ...settings,
      delivery: {
        ...settings.delivery,
        zones: updatedZones,
      },
    });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Platform Settings</h1>
          <p className="text-sm text-gray-600 mt-1">Configure global delivery zones, charges, tax VAT, profit sharing, and business rules</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/coupons"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-blue-200 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
          >
            Manage Coupons →
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200 gap-2">
        {[
          { id: 'general', label: 'Store Info' },
          { id: 'delivery', label: 'Delivery Zones' },
          { id: 'tax', label: 'Tax & VAT' },
          { id: 'charges', label: 'Charges & Fees' },
          { id: 'profit', label: 'Profit Sharing' },
          { id: 'orders', label: 'Orders & Rules' },
          { id: 'carousel', label: 'Carousel' },
          { id: 'system', label: 'System & DB' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: General Info */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Store Profile & Branding</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Store / Site Name</label>
              <input
                type="text"
                value={settings.general.siteName}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, siteName: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Tagline</label>
              <input
                type="text"
                value={settings.general.storeTagline || ''}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, storeTagline: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Official Email</label>
              <input
                type="email"
                value={settings.general.email}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, email: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Support Phone</label>
              <input
                type="tel"
                value={settings.general.phone}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, phone: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.general.currencySymbol || '৳'}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, currencySymbol: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Currency Code</label>
              <input
                type="text"
                value={settings.general.currencyCode || 'BDT'}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, currencyCode: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Business Address</label>
              <textarea
                rows={2}
                value={settings.general.address}
                onChange={(e) => setSettings({ ...settings, general: { ...settings.general, address: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Delivery Zones */}
      {activeTab === 'delivery' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Courier Delivery Zones & Shipping Charges</h3>
            <p className="text-xs text-gray-500 mb-4">Control dynamic courier charges and free delivery thresholds for each zone.</p>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-sm text-blue-900">Global Free Delivery Threshold (৳):</span>
                <p className="text-xs text-blue-700">Orders above this cart subtotal automatically receive free courier delivery across Bangladesh.</p>
              </div>
              <input
                type="number"
                value={settings.delivery.globalFreeDeliveryThresholdPoisha / 100}
                onChange={(e) => setSettings({
                  ...settings,
                  delivery: {
                    ...settings.delivery,
                    globalFreeDeliveryThresholdPoisha: Math.round(parseFloat(e.target.value || '0') * 100),
                  }
                })}
                className="w-36 px-3 py-1.5 border border-blue-300 bg-white rounded-lg text-sm font-semibold"
              />
            </div>

            <div className="space-y-3">
              {settings.delivery.zones?.map((zone: DeliveryZoneConfig, idx: number) => (
                <div key={zone.id} className="p-4 border border-gray-200 rounded-xl bg-gray-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="font-bold text-sm text-gray-900">{zone.name}</span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={zone.isActive}
                        onChange={(e) => updateZoneField(idx, 'isActive', e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      Active Zone
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Courier Charge (৳)</label>
                      <input
                        type="number"
                        value={zone.chargePoisha / 100}
                        onChange={(e) => updateZoneField(idx, 'chargePoisha', Math.round(parseFloat(e.target.value || '0') * 100))}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Free Threshold (৳)</label>
                      <input
                        type="number"
                        value={zone.freeDeliveryThresholdPoisha ? zone.freeDeliveryThresholdPoisha / 100 : ''}
                        onChange={(e) => updateZoneField(idx, 'freeDeliveryThresholdPoisha', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined)}
                        placeholder="e.g. 5000"
                        className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Estimated Arrival</label>
                      <input
                        type="text"
                        value={zone.estimatedDays}
                        onChange={(e) => updateZoneField(idx, 'estimatedDays', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 rounded bg-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Tax & VAT */}
      {activeTab === 'tax' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">VAT & Taxation Policy (Bangladesh NBR)</h3>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <div className="font-semibold text-sm text-gray-900">Enable VAT Calculation</div>
              <div className="text-xs text-gray-500">Apply standard Bangladesh Value Added Tax at checkout</div>
            </div>
            <input
              type="checkbox"
              checked={settings.tax?.vatEnabled || false}
              onChange={(e) => setSettings({ ...settings, tax: { ...settings.tax, vatEnabled: e.target.checked } })}
              className="h-5 w-5 rounded text-blue-600 cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">VAT Rate (%)</label>
              <input
                type="number"
                step="0.1"
                value={settings.tax?.vatRatePercent || 15}
                onChange={(e) => setSettings({ ...settings, tax: { ...settings.tax, vatRatePercent: parseFloat(e.target.value || '0') } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Business BIN Number</label>
              <input
                type="text"
                value={settings.tax?.binNumber || ''}
                onChange={(e) => setSettings({ ...settings, tax: { ...settings.tax, binNumber: e.target.value } })}
                placeholder="003456789-0101"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div>
              <div className="font-semibold text-sm text-gray-900">Catalog Prices Are Inclusive of VAT</div>
              <div className="text-xs text-gray-500">If unchecked, VAT is calculated and added on top of the wholesale price</div>
            </div>
            <input
              type="checkbox"
              checked={settings.tax?.pricesInclusiveOfVat || false}
              onChange={(e) => setSettings({ ...settings, tax: { ...settings.tax, pricesInclusiveOfVat: e.target.checked } })}
              className="h-5 w-5 rounded text-blue-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 4: Charges & Fees */}
      {activeTab === 'charges' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Extra Charges & Payment Gateway Fees</h3>

          <div className="p-4 border border-gray-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-gray-900">Cash on Delivery (COD) Fee</div>
                <div className="text-xs text-gray-500">Enable fee charged to customer when choosing Cash on Delivery</div>
              </div>
              <input
                type="checkbox"
                checked={settings.charges?.codEnabled || false}
                onChange={(e) => setSettings({ ...settings, charges: { ...settings.charges, codEnabled: e.target.checked } })}
                className="h-5 w-5 rounded text-blue-600 cursor-pointer"
              />
            </div>
            {settings.charges?.codEnabled && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">COD Fee Amount (৳)</label>
                <input
                  type="number"
                  value={settings.charges?.codFeeValuePoisha ? settings.charges.codFeeValuePoisha / 100 : 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    charges: {
                      ...settings.charges,
                      codFeeValuePoisha: Math.round(parseFloat(e.target.value || '0') * 100),
                    }
                  })}
                  className="w-48 px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
          </div>

          <div className="p-4 border border-gray-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-gray-900">Packaging / Carton Fee</div>
                <div className="text-xs text-gray-500">Packaging charge for protective wholesale carton packing</div>
              </div>
              <input
                type="checkbox"
                checked={settings.charges?.packagingFeeEnabled || false}
                onChange={(e) => setSettings({ ...settings, charges: { ...settings.charges, packagingFeeEnabled: e.target.checked } })}
                className="h-5 w-5 rounded text-blue-600 cursor-pointer"
              />
            </div>
            {settings.charges?.packagingFeeEnabled && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">Packaging Fee Amount (৳)</label>
                <input
                  type="number"
                  value={settings.charges?.packagingFeePoisha ? settings.charges.packagingFeePoisha / 100 : 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    charges: {
                      ...settings.charges,
                      packagingFeePoisha: Math.round(parseFloat(e.target.value || '0') * 100),
                    }
                  })}
                  className="w-48 px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
            )}
          </div>

          <div className="p-4 border border-gray-200 rounded-xl space-y-3">
            <div className="font-semibold text-sm text-gray-900">Payment Gateway Cost Deduction (%)</div>
            <p className="text-xs text-gray-500">Merchant gateway fees deducted from gross profit during profit calculation</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">bKash Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.charges?.gatewayFees?.bkashFeePercent || 1.5}
                  onChange={(e) => setSettings({
                    ...settings,
                    charges: {
                      ...settings.charges,
                      gatewayFees: { ...settings.charges.gatewayFees, bkashFeePercent: parseFloat(e.target.value || '0') }
                    }
                  })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Nagad Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.charges?.gatewayFees?.nagadFeePercent || 1.2}
                  onChange={(e) => setSettings({
                    ...settings,
                    charges: {
                      ...settings.charges,
                      gatewayFees: { ...settings.charges.gatewayFees, nagadFeePercent: parseFloat(e.target.value || '0') }
                    }
                  })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Card Gateway (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.charges?.gatewayFees?.cardFeePercent || 2.0}
                  onChange={(e) => setSettings({
                    ...settings,
                    charges: {
                      ...settings.charges,
                      gatewayFees: { ...settings.charges.gatewayFees, cardFeePercent: parseFloat(e.target.value || '0') }
                    }
                  })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Bank Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.charges?.gatewayFees?.bankTransferFeePercent || 0}
                  onChange={(e) => setSettings({
                    ...settings,
                    charges: {
                      ...settings.charges,
                      gatewayFees: { ...settings.charges.gatewayFees, bankTransferFeePercent: parseFloat(e.target.value || '0') }
                    }
                  })}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Profit Sharing */}
      {activeTab === 'profit' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profit Sharing & Stakeholder Distribution Policy</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Company Retained Earnings / Reserve (%)
              </label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={50}
                value={settings.profitSharing?.reservePercentage ?? 5}
                onChange={(e) => setSettings({
                  ...settings,
                  profitSharing: {
                    ...settings.profitSharing,
                    reservePercentage: parseFloat(e.target.value || '0')
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Deducted from net profit before stakeholder percentage allocation</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Default Distribution Frequency
              </label>
              <select
                value={settings.profitSharing?.distributionFrequency || 'MONTHLY'}
                onChange={(e: any) => setSettings({
                  ...settings,
                  profitSharing: {
                    ...settings.profitSharing,
                    distributionFrequency: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div>
              <div className="font-semibold text-sm text-gray-900">Loss Handling Mode</div>
              <div className="text-xs text-gray-500">Carry negative period profit forward to offset next profitable period</div>
            </div>
            <select
              value={settings.profitSharing?.lossHandlingMode || 'CARRY_FORWARD'}
              onChange={(e: any) => setSettings({
                ...settings,
                profitSharing: {
                  ...settings.profitSharing,
                  lossHandlingMode: e.target.value
                }
              })}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="CARRY_FORWARD">Carry Forward Loss (Recommended)</option>
              <option value="SHARE_LOSS">Distribute Net Negative</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB 6: Orders & Rules */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Order Rules & Minimum Requirements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Minimum Order Amount (৳) (0 = no minimum)
              </label>
              <input
                type="number"
                value={settings.orders.minimumOrderAmount}
                onChange={(e) => setSettings({
                  ...settings,
                  orders: {
                    ...settings.orders,
                    minimumOrderAmount: parseFloat(e.target.value || '0'),
                    minimumOrderAmountPoisha: Math.round(parseFloat(e.target.value || '0') * 100),
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Prevents checkout if cart subtotal is below this taka threshold</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Standard Order Processing Time
              </label>
              <input
                type="text"
                value={settings.orders.processingTime}
                onChange={(e) => setSettings({
                  ...settings,
                  orders: { ...settings.orders, processingTime: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div>
              <div className="font-semibold text-sm text-gray-900">Allow Guest Checkout</div>
              <div className="text-xs text-gray-500">Allow customers to place orders without creating a password</div>
            </div>
            <input
              type="checkbox"
              checked={settings.orders.allowGuestCheckout ?? settings.system.allowGuestCheckout}
              onChange={(e) => setSettings({
                ...settings,
                orders: { ...settings.orders, allowGuestCheckout: e.target.checked },
                system: { ...settings.system, allowGuestCheckout: e.target.checked },
              })}
              className="h-5 w-5 rounded text-blue-600 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 7: Carousel */}
      {activeTab === 'carousel' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Homepage Carousel Settings</h3>
          <p className="text-xs text-gray-500 mb-4">Control speed, transitions, and navigation controls for hero banners.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Transition Effect</label>
              <select
                value={settings.carousel.transitionEffect}
                onChange={(e) => setSettings({ ...settings, carousel: { ...settings.carousel, transitionEffect: e.target.value } })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="fade">Fade & Zoom</option>
                <option value="slide">Slide</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Autoplay Speed: {settings.carousel.autoplaySpeed}s
              </label>
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={settings.carousel.autoplaySpeed}
                onChange={(e) => setSettings({ ...settings, carousel: { ...settings.carousel, autoplaySpeed: parseInt(e.target.value) } })}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { key: 'autoplayEnabled', label: 'Autoplay' },
              { key: 'pauseOnHover', label: 'Pause on Hover' },
              { key: 'showArrows', label: 'Show Arrow Controls' },
              { key: 'showDots', label: 'Show Dot Indicators' },
              { key: 'showCounter', label: 'Show Slide Counter' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-800">{item.label}</span>
                <input
                  type="checkbox"
                  checked={settings.carousel[item.key]}
                  onChange={(e) => setSettings({ ...settings, carousel: { ...settings.carousel, [item.key]: e.target.checked } })}
                  className="h-4 w-4 rounded text-blue-600 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 8: System & DB Migrations */}
      {activeTab === 'system' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">System Controls</h3>
            <div className="flex items-center justify-between py-3 border-b border-gray-200">
              <div>
                <div className="font-semibold text-sm text-gray-900">Maintenance Mode</div>
                <div className="text-xs text-gray-500">Temporarily show maintenance screen to customers</div>
              </div>
              <input
                type="checkbox"
                checked={settings.system?.maintenanceMode || false}
                onChange={(e) => setSettings({ ...settings, system: { ...settings.system, maintenanceMode: e.target.checked } })}
                className="h-5 w-5 rounded text-blue-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Database Migrations */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Database Migrations</h3>
                <p className="text-xs text-gray-500 mt-1">One-time data migrations for legacy database backfills.</p>
              </div>
              <button
                type="button"
                onClick={fetchMigrationStatus}
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 border border-blue-200 rounded hover:bg-blue-50 cursor-pointer transition-colors"
              >
                Refresh
              </button>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm">Backfill Product Image Gallery</span>
                    {migrationStatus.status === 'already_applied' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <AdminIcon name="verification" className="w-3.5 h-3.5" />
                        Already Applied
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Copies primary imageUrl into imageUrls array for legacy products.</p>
                </div>
                <button
                  type="button"
                  id="btn-run-imageurls-migration"
                  onClick={handleRunMigration}
                  disabled={runningMigration || migrationStatus.status === 'already_applied' || migrationStatus.status === 'loading'}
                  className={migrationStatus.status === 'already_applied'
                    ? 'px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 cursor-pointer'}
                >
                  {runningMigration ? 'Running...' : migrationStatus.status === 'already_applied' ? 'Already Applied' : 'Run Migration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
