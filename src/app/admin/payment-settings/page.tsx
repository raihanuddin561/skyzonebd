'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface PaymentConfig {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  priority: number;
  accountNumber?: string;
  accountName?: string;
  accountType?: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  instructions?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentConfigPage() {
  const { user } = useAuth();
  const [configs, setConfigs] = useState<PaymentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<PaymentConfig | null>(null);
  const [formData, setFormData] = useState({
    type: 'BKASH',
    name: '',
    isActive: true,
    priority: 0,
    accountNumber: '',
    accountName: '',
    accountType: '',
    bankName: '',
    branchName: '',
    routingNumber: '',
    instructions: ''
  });

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      fetchConfigs();
    }
  }, [user]);

  const fetchConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/payment-config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result.success) {
        setConfigs(result.data);
      }
    } catch (error) {
      console.error('Error fetching configs:', error);
      toast.error('Failed to load payment configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingConfig 
        ? `/api/admin/payment-config/${editingConfig.id}`
        : '/api/admin/payment-config';
      
      const response = await fetch(url, {
        method: editingConfig ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        setShowModal(false);
        setEditingConfig(null);
        resetForm();
        fetchConfigs();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    }
  };

  const handleEdit = (config: PaymentConfig) => {
    setEditingConfig(config);
    setFormData({
      type: config.type,
      name: config.name,
      isActive: config.isActive,
      priority: config.priority,
      accountNumber: config.accountNumber || '',
      accountName: config.accountName || '',
      accountType: config.accountType || '',
      bankName: config.bankName || '',
      branchName: config.branchName || '',
      routingNumber: config.routingNumber || '',
      instructions: config.instructions || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete payment configuration "${name}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/payment-config/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        fetchConfigs();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'BKASH',
      name: '',
      isActive: true,
      priority: 0,
      accountNumber: '',
      accountName: '',
      accountType: '',
      bankName: '',
      branchName: '',
      routingNumber: '',
      instructions: ''
    });
  };

  const getTypeIcon = (type: string) => {
    const icons: { [key: string]: string } = {
      'BKASH': '📱',
      'NAGAD': '📱',
      'ROCKET': '🚀',
      'BANK_TRANSFER': '🏦',
      'CREDIT_CARD': '💳'
    };
    return icons[type] || '💰';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Settings</h1>
          <p className="text-gray-600 mt-1">Configure payment methods for customers</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingConfig(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>➕</span>
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Payment Configs List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {configs.map((config) => (
          <div
            key={config.id}
            className={`bg-white rounded-lg shadow-sm border-2 ${
              config.isActive ? 'border-green-200' : 'border-gray-200'
            } p-6`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getTypeIcon(config.type)}</span>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{config.name}</h3>
                  <span className="text-xs text-gray-500">{config.type}</span>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                config.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {config.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Details */}
            <div className="space-y-2 mb-4 text-sm">
              {config.accountNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Account:</span>
                  <span className="font-mono font-medium">{config.accountNumber}</span>
                </div>
              )}
              {config.accountName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium">{config.accountName}</span>
                </div>
              )}
              {config.bankName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Bank:</span>
                  <span className="font-medium">{config.bankName}</span>
                </div>
              )}
              {config.routingNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Routing:</span>
                  <span className="font-mono">{config.routingNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Priority:</span>
                <span className="font-medium">{config.priority}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(config)}
                className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => handleDelete(config.id, config.name)}
                className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm font-medium"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}

        {configs.length === 0 && (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg mb-4">No payment methods configured</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Your First Payment Method
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingConfig ? 'Edit Payment Method' : 'Add Payment Method'}
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingConfig(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Payment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={!!editingConfig}
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="ROCKET">Rocket</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., bKash Merchant Account"
                    required
                  />
                </div>

                {/* Mobile Banking Fields */}
                {['BKASH', 'NAGAD', 'ROCKET'].includes(formData.type) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="01712-345678"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name *
                      </label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="SkyzoneBD"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type
                      </label>
                      <select
                        value={formData.accountType}
                        onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Type</option>
                        <option value="Personal">Personal</option>
                        <option value="Merchant">Merchant</option>
                        <option value="Agent">Agent</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Bank Transfer Fields */}
                {formData.type === 'BANK_TRANSFER' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Dutch Bangla Bank"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name *
                      </label>
                      <input
                        type="text"
                        value={formData.accountName}
                        onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="SkyzoneBD Ltd."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={formData.accountNumber}
                        onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="1234567890"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Routing Number
                      </label>
                      <input
                        type="text"
                        value={formData.routingNumber}
                        onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="090260724"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Branch Name
                      </label>
                      <input
                        type="text"
                        value={formData.branchName}
                        onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Gulshan, Dhaka"
                      />
                    </div>
                  </>
                )}

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Instructions
                  </label>
                  <textarea
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional instructions for customers..."
                  />
                </div>

                {/* Priority & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Priority
                    </label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Active (visible to customers)</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingConfig(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingConfig ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
