'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

      {/* Carousel Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Homepage Carousel</h3>
        <p className="text-sm text-gray-500 mb-4">Control how the hero carousel behaves and looks. Slide content itself is managed under Hero Slides.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Transition Effect</label>
            <select
              value={settings.carousel.transitionEffect}
              onChange={(e) => setSettings({...settings, carousel: {...settings.carousel, transitionEffect: e.target.value as 'fade' | 'slide'}})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="fade">Fade &amp; Zoom</option>
              <option value="slide">Slide</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Autoplay Speed: {settings.carousel.autoplaySpeed}s per slide
            </label>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={settings.carousel.autoplaySpeed}
              onChange={(e) => setSettings({...settings, carousel: {...settings.carousel, autoplaySpeed: parseInt(e.target.value)}})}
              disabled={!settings.carousel.autoplayEnabled}
              className="w-full disabled:opacity-50"
            />
          </div>
        </div>

        <div className="space-y-4">
          {[
            { key: 'autoplayEnabled' as const, label: 'Autoplay', desc: 'Automatically advance to the next slide' },
            { key: 'pauseOnHover' as const, label: 'Pause on Hover', desc: 'Stop autoplay while a visitor is looking at the carousel' },
            { key: 'showArrows' as const, label: 'Navigation Arrows', desc: 'Show previous/next arrow buttons' },
            { key: 'showDots' as const, label: 'Slide Indicators', desc: 'Show the dot indicators below the carousel' },
            { key: 'showCounter' as const, label: 'Slide Counter', desc: 'Show the "1 / 4" counter badge' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-sm text-gray-600">{item.desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.carousel[item.key]}
                  onChange={(e) => setSettings({...settings, carousel: {...settings.carousel, [item.key]: e.target.checked}})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Database Migrations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Database Migrations</h3>
            <p className="text-sm text-gray-500 mt-1">One-time data migrations that fix legacy data. Each migration runs exactly once and cannot be repeated.</p>
          </div>
          <button type="button" onClick={fetchMigrationStatus} className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 border border-blue-200 rounded">
            &#8635; Refresh
          </button>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 text-sm">Backfill Product Image Gallery</span>
                {migrationStatus.status === 'loading' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Checking...</span>
                )}
                {migrationStatus.status === 'already_applied' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">&#10003; Already Applied</span>
                )}
                {migrationStatus.status === 'pending' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">&#9888; Pending</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-1">Copies the primary <code className="bg-gray-100 px-1 rounded">imageUrl</code> into the <code className="bg-gray-100 px-1 rounded">imageUrls</code> gallery array for legacy products that have an empty gallery.</p>
              {migrationStatus.status === 'pending' && migrationStatus.affectedCount !== undefined && (
                <p className="text-xs text-amber-700 font-medium">{migrationStatus.affectedCount} product(s) will be updated.</p>
              )}
              {migrationStatus.status === 'already_applied' && migrationStatus.appliedAt && (
                <p className="text-xs text-green-700">Ran {new Date(migrationStatus.appliedAt).toLocaleString()}.</p>
              )}
            </div>
            <button
              type="button"
              id="btn-run-imageurls-migration"
              onClick={handleRunMigration}
              disabled={runningMigration || migrationStatus.status === 'already_applied' || migrationStatus.status === 'loading'}
              className={migrationStatus.status === 'already_applied'
                ? 'shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed'}
            >
              {runningMigration ? 'Running...' : migrationStatus.status === 'already_applied' ? 'Already Applied' : 'Run Migration'}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Migrations are idempotent — clicking &quot;Run Migration&quot; when already applied is safe and changes nothing.</p>
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
