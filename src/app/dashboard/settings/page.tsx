'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import Header from "../../components/Header";

interface ChargeSettings {
  // Global Settings
  globalDeliveryCharge: number;
  globalVATPercentage: number;
  
  // Item-wise VAT
  itemWiseVAT: {
    productId: number;
    productName: string;
    vatPercentage: number;
  }[];
  
  // Item-wise Delivery
  itemWiseDelivery: {
    productId: number;
    productName: string;
    deliveryCharge: number;
  }[];
  
  // Category-wise Delivery
  categoryWiseDelivery: {
    categoryId: number;
    categoryName: string;
    deliveryCharge: number;
  }[];
  
  // Location-based Delivery
  locationBasedDelivery: {
    location: string;
    deliveryCharge: number;
    minOrderForFree?: number;
  }[];
  
  // Settings
  enableGlobalDelivery: boolean;
  enableGlobalVAT: boolean;
  enableItemWiseVAT: boolean;
  enableItemWiseDelivery: boolean;
  enableCategoryWiseDelivery: boolean;
  enableLocationBasedDelivery: boolean;
  
  // Free delivery threshold
  freeDeliveryThreshold: number;
  enableFreeDeliveryThreshold: boolean;
}

function ChargesSettings() {
  const [settings, setSettings] = useState<ChargeSettings>({
    globalDeliveryCharge: 0,
    globalVATPercentage: 0,
    itemWiseVAT: [],
    itemWiseDelivery: [],
    categoryWiseDelivery: [],
    locationBasedDelivery: [
      { location: 'Dhaka City', deliveryCharge: 60, minOrderForFree: 1000 },
      { location: 'Outside Dhaka', deliveryCharge: 120, minOrderForFree: 2000 },
    ],
    enableGlobalDelivery: false,
    enableGlobalVAT: false,
    enableItemWiseVAT: false,
    enableItemWiseDelivery: false,
    enableCategoryWiseDelivery: false,
    enableLocationBasedDelivery: false,
    freeDeliveryThreshold: 0,
    enableFreeDeliveryThreshold: false,
  });

  const [activeTab, setActiveTab] = useState<'delivery' | 'vat' | 'discounts'>('delivery');
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalType, setModalType] = useState<'itemVAT' | 'itemDelivery' | 'categoryDelivery' | 'locationDelivery'>('itemVAT');
  
  const [newEntry, setNewEntry] = useState({
    productId: 0,
    productName: '',
    categoryId: 0,
    categoryName: '',
    location: '',
    value: 0,
    minOrderForFree: 0,
  });

  const handleSave = () => {
    // TODO: Save to API
    alert('Settings saved successfully!');
  };

  const handleAddEntry = () => {
    if (modalType === 'itemVAT') {
      setSettings({
        ...settings,
        itemWiseVAT: [...settings.itemWiseVAT, {
          productId: newEntry.productId,
          productName: newEntry.productName,
          vatPercentage: newEntry.value
        }]
      });
    } else if (modalType === 'itemDelivery') {
      setSettings({
        ...settings,
        itemWiseDelivery: [...settings.itemWiseDelivery, {
          productId: newEntry.productId,
          productName: newEntry.productName,
          deliveryCharge: newEntry.value
        }]
      });
    } else if (modalType === 'categoryDelivery') {
      setSettings({
        ...settings,
        categoryWiseDelivery: [...settings.categoryWiseDelivery, {
          categoryId: newEntry.categoryId,
          categoryName: newEntry.categoryName,
          deliveryCharge: newEntry.value
        }]
      });
    } else if (modalType === 'locationDelivery') {
      setSettings({
        ...settings,
        locationBasedDelivery: [...settings.locationBasedDelivery, {
          location: newEntry.location,
          deliveryCharge: newEntry.value,
          minOrderForFree: newEntry.minOrderForFree
        }]
      });
    }
    
    setShowAddModal(false);
    setNewEntry({ productId: 0, productName: '', categoryId: 0, categoryName: '', location: '', value: 0, minOrderForFree: 0 });
  };

  const handleRemoveEntry = (type: string, index: number) => {
    if (type === 'itemVAT') {
      setSettings({
        ...settings,
        itemWiseVAT: settings.itemWiseVAT.filter((_, i) => i !== index)
      });
    } else if (type === 'itemDelivery') {
      setSettings({
        ...settings,
        itemWiseDelivery: settings.itemWiseDelivery.filter((_, i) => i !== index)
      });
    } else if (type === 'categoryDelivery') {
      setSettings({
        ...settings,
        categoryWiseDelivery: settings.categoryWiseDelivery.filter((_, i) => i !== index)
      });
    } else if (type === 'locationDelivery') {
      setSettings({
        ...settings,
        locationBasedDelivery: settings.locationBasedDelivery.filter((_, i) => i !== index)
      });
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Charges & Tax Settings</h1>
              <p className="text-gray-600 mt-1">Configure delivery charges, VAT, and discounts</p>
            </div>
            <button
              onClick={handleSave}
              className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex border-b overflow-x-auto">
              <button
                onClick={() => setActiveTab('delivery')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'delivery'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🚚 Delivery Charges
              </button>
              <button
                onClick={() => setActiveTab('vat')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'vat'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                💰 VAT & Tax
              </button>
              <button
                onClick={() => setActiveTab('discounts')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'discounts'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🎁 Discounts & Offers
              </button>
            </div>

            {/* Delivery Charges Tab */}
            {activeTab === 'delivery' && (
              <div className="p-6 space-y-6">
                {/* Global Delivery Charge */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Global Delivery Charge</h3>
                      <p className="text-sm text-gray-600">Apply same delivery charge to all orders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableGlobalDelivery}
                        onChange={(e) => setSettings({ ...settings, enableGlobalDelivery: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {settings.enableGlobalDelivery && (
                    <div className="flex items-center gap-4">
                      <label className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Delivery Charge (৳)</span>
                        <input
                          type="number"
                          value={settings.globalDeliveryCharge}
                          onChange={(e) => setSettings({ ...settings, globalDeliveryCharge: parseFloat(e.target.value) || 0 })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Free Delivery Threshold */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Free Delivery Threshold</h3>
                      <p className="text-sm text-gray-600">Free delivery for orders above a certain amount</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableFreeDeliveryThreshold}
                        onChange={(e) => setSettings({ ...settings, enableFreeDeliveryThreshold: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {settings.enableFreeDeliveryThreshold && (
                    <div className="flex items-center gap-4">
                      <label className="flex-1">
                        <span className="text-sm font-medium text-gray-700">Minimum Order Amount (৳)</span>
                        <input
                          type="number"
                          value={settings.freeDeliveryThreshold}
                          onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Location-Based Delivery */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Location-Based Delivery</h3>
                      <p className="text-sm text-gray-600">Different charges based on delivery location</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableLocationBasedDelivery}
                          onChange={(e) => setSettings({ ...settings, enableLocationBasedDelivery: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      {settings.enableLocationBasedDelivery && (
                        <button
                          onClick={() => {
                            setModalType('locationDelivery');
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          + Add Location
                        </button>
                      )}
                    </div>
                  </div>
                  {settings.enableLocationBasedDelivery && settings.locationBasedDelivery.length > 0 && (
                    <div className="space-y-2">
                      {settings.locationBasedDelivery.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{item.location}</span>
                            <div className="text-sm text-gray-600">
                              Charge: ৳{item.deliveryCharge}
                              {item.minOrderForFree && ` | Free above ৳${item.minOrderForFree}`}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveEntry('locationDelivery', index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Category-Wise Delivery */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Category-Wise Delivery</h3>
                      <p className="text-sm text-gray-600">Different charges for different product categories</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableCategoryWiseDelivery}
                          onChange={(e) => setSettings({ ...settings, enableCategoryWiseDelivery: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      {settings.enableCategoryWiseDelivery && (
                        <button
                          onClick={() => {
                            setModalType('categoryDelivery');
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          + Add Category
                        </button>
                      )}
                    </div>
                  </div>
                  {settings.enableCategoryWiseDelivery && settings.categoryWiseDelivery.length > 0 && (
                    <div className="space-y-2">
                      {settings.categoryWiseDelivery.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{item.categoryName}</span>
                            <span className="text-sm text-gray-600 ml-2">৳{item.deliveryCharge}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveEntry('categoryDelivery', index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Item-Wise Delivery */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Item-Wise Delivery</h3>
                      <p className="text-sm text-gray-600">Specific delivery charge for individual products</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableItemWiseDelivery}
                          onChange={(e) => setSettings({ ...settings, enableItemWiseDelivery: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      {settings.enableItemWiseDelivery && (
                        <button
                          onClick={() => {
                            setModalType('itemDelivery');
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          + Add Item
                        </button>
                      )}
                    </div>
                  </div>
                  {settings.enableItemWiseDelivery && settings.itemWiseDelivery.length > 0 && (
                    <div className="space-y-2">
                      {settings.itemWiseDelivery.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{item.productName}</span>
                            <span className="text-sm text-gray-600 ml-2">৳{item.deliveryCharge}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveEntry('itemDelivery', index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VAT Tab */}
            {activeTab === 'vat' && (
              <div className="p-6 space-y-6">
                {/* Global VAT */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Global VAT</h3>
                      <p className="text-sm text-gray-600">Apply same VAT percentage to all orders</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableGlobalVAT}
                        onChange={(e) => setSettings({ ...settings, enableGlobalVAT: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  {settings.enableGlobalVAT && (
                    <div className="flex items-center gap-4">
                      <label className="flex-1">
                        <span className="text-sm font-medium text-gray-700">VAT Percentage (%)</span>
                        <input
                          type="number"
                          value={settings.globalVATPercentage}
                          onChange={(e) => setSettings({ ...settings, globalVATPercentage: parseFloat(e.target.value) || 0 })}
                          className="mt-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          step="0.1"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Item-Wise VAT */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Item-Wise VAT</h3>
                      <p className="text-sm text-gray-600">Different VAT for specific products</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enableItemWiseVAT}
                          onChange={(e) => setSettings({ ...settings, enableItemWiseVAT: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      {settings.enableItemWiseVAT && (
                        <button
                          onClick={() => {
                            setModalType('itemVAT');
                            setShowAddModal(true);
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                          + Add Item
                        </button>
                      )}
                    </div>
                  </div>
                  {settings.enableItemWiseVAT && settings.itemWiseVAT.length > 0 && (
                    <div className="space-y-2">
                      {settings.itemWiseVAT.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                          <div>
                            <span className="font-medium text-gray-900">{item.productName}</span>
                            <span className="text-sm text-gray-600 ml-2">{item.vatPercentage}%</span>
                          </div>
                          <button
                            onClick={() => handleRemoveEntry('itemVAT', index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Discounts Tab */}
            {activeTab === 'discounts' && (
              <div className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-lg font-medium">Discount & Offers Management</p>
                  <p className="text-sm mt-2">Coming Soon - Configure coupons, bulk discounts, and special offers</p>
                </div>
              </div>
            )}
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {modalType === 'itemVAT' && 'Add Item VAT'}
              {modalType === 'itemDelivery' && 'Add Item Delivery Charge'}
              {modalType === 'categoryDelivery' && 'Add Category Delivery Charge'}
              {modalType === 'locationDelivery' && 'Add Location Delivery Charge'}
            </h2>
            
            <div className="space-y-4">
              {(modalType === 'itemVAT' || modalType === 'itemDelivery') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product ID</label>
                    <input
                      type="number"
                      value={newEntry.productId}
                      onChange={(e) => setNewEntry({ ...newEntry, productId: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Name</label>
                    <input
                      type="text"
                      value={newEntry.productName}
                      onChange={(e) => setNewEntry({ ...newEntry, productName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Wireless Headphones"
                    />
                  </div>
                </>
              )}

              {modalType === 'categoryDelivery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category ID</label>
                    <input
                      type="number"
                      value={newEntry.categoryId}
                      onChange={(e) => setNewEntry({ ...newEntry, categoryId: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category Name</label>
                    <input
                      type="text"
                      value={newEntry.categoryName}
                      onChange={(e) => setNewEntry({ ...newEntry, categoryName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Electronics"
                    />
                  </div>
                </>
              )}

              {modalType === 'locationDelivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={newEntry.location}
                    onChange={(e) => setNewEntry({ ...newEntry, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g., Chittagong"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modalType === 'itemVAT' ? 'VAT Percentage (%)' : 'Delivery Charge (৳)'}
                </label>
                <input
                  type="number"
                  value={newEntry.value}
                  onChange={(e) => setNewEntry({ ...newEntry, value: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  step={modalType === 'itemVAT' ? '0.1' : '1'}
                />
              </div>

              {modalType === 'locationDelivery' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Free Delivery Above (৳) - Optional
                  </label>
                  <input
                    type="number"
                    value={newEntry.minOrderForFree}
                    onChange={(e) => setNewEntry({ ...newEntry, minOrderForFree: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewEntry({ productId: 0, productName: '', categoryId: 0, categoryName: '', location: '', value: 0, minOrderForFree: 0 });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddEntry}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ChargesSettingsPage() {
  return (
    <ProtectedRoute requireAuth={true} requiredRole="admin">
      <ChargesSettings />
    </ProtectedRoute>
  );
}
