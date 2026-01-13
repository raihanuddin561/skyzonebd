'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Partner {
  id: string;
  name: string;
  profitSharePercentage: number;
  isActive: boolean;
  totalProfitReceived: number;
}

interface DashboardStats {
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  totalOrders: number;
  activePartners: number;
  totalPartnerShare: number;
  remainingProfit: number;
}

export default function ProfitDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    profitSharePercentage: 0,
    partnerType: 'INVESTOR',
    initialInvestment: 0,
    address: '',
    taxId: '',
    bankAccount: '',
    notes: ''
  });

  useEffect(() => {
    fetchDashboardData();
    fetchPartners();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/profit-reports/dashboard');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/admin/partners');
      const data = await response.json();
      
      if (data.success) {
        setPartners(data.data?.partners || data.partners || []);
      }
    } catch (err) {
      console.error('Error fetching partners:', err);
    }
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerForm)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Partner created successfully!');
        setShowPartnerModal(false);
        fetchPartners();
        fetchDashboardData();
        resetForm();
      } else {
        setError(data.error || 'Failed to create partner');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleUpdatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/partners/${editingPartner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnerForm)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Partner updated successfully!');
        setShowPartnerModal(false);
        setEditingPartner(null);
        fetchPartners();
        fetchDashboardData();
        resetForm();
      } else {
        setError(data.error || 'Failed to update partner');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const handleEditPartner = (partner: Partner) => {
    setEditingPartner(partner);
    setPartnerForm({
      name: partner.name || '',
      email: '',
      phone: '',
      profitSharePercentage: partner.profitSharePercentage,
      partnerType: 'INVESTOR',
      initialInvestment: 0,
      address: '',
      taxId: '',
      bankAccount: '',
      notes: ''
    });
    setShowPartnerModal(true);
  };

  const handleTogglePartnerStatus = async (partnerId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Partner status updated!');
        fetchPartners();
        fetchDashboardData();
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch (err) {
      setError('An error occurred');
    }
  };

  const resetForm = () => {
    setPartnerForm({
      name: '',
      email: '',
      phone: '',
      profitSharePercentage: 0,
      partnerType: 'INVESTOR',
      initialInvestment: 0,
      address: '',
      taxId: '',
      bankAccount: '',
      notes: ''
    });
    setEditingPartner(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profit Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor revenue, costs, and partner distributions</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Costs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats?.totalCosts || 0)}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats?.netProfit || 0)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Margin: {stats?.profitMargin?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Partners</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats?.activePartners || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Total Share: {stats?.totalPartnerShare?.toFixed(1) || 0}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Partners Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Partnership Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Remaining profit share available: {(100 - (stats?.totalPartnerShare || 0)).toFixed(1)}%
              </p>
            </div>
            <button
              onClick={() => setShowPartnerModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Partner
            </button>
          </div>

          {partners.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-4 text-gray-600">No partners added yet</p>
              <p className="text-sm text-gray-500">Add partners to manage profit distributions</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit Share
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Received
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {partners.map((partner) => (
                    <tr key={partner.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{partner.profitSharePercentage}%</div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency((stats?.netProfit || 0) * partner.profitSharePercentage / 100)} per period
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(partner.totalProfitReceived)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          partner.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {partner.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleEditPartner(partner)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleTogglePartnerStatus(partner.id, partner.isActive)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {partner.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Profit Distribution Summary */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Profit Distribution Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <span className="text-gray-600">Net Profit</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(stats?.netProfit || 0)}
              </span>
            </div>
            {partners.filter(p => p.isActive).map((partner) => (
              <div key={partner.id} className="flex justify-between items-center">
                <span className="text-gray-600">{partner.name} ({partner.profitSharePercentage}%)</span>
                <span className="text-gray-900">
                  {formatCurrency((stats?.netProfit || 0) * partner.profitSharePercentage / 100)}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t font-semibold">
              <span className="text-gray-900">Remaining Profit</span>
              <span className="text-green-600">
                {formatCurrency(stats?.remainingProfit || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Partner Modal */}
      {showPartnerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingPartner ? 'Edit Partner' : 'Add New Partner'}
              </h3>
              <button
                onClick={() => {
                  setShowPartnerModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={editingPartner ? handleUpdatePartner : handleCreatePartner}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partner Name *
                  </label>
                  <input
                    type="text"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profit Share Percentage * (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={partnerForm.profitSharePercentage}
                    onChange={(e) => setPartnerForm({ ...partnerForm, profitSharePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Available: {(100 - (stats?.totalPartnerShare || 0)).toFixed(1)}%
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partner Type
                  </label>
                  <select
                    value={partnerForm.partnerType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, partnerType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="INVESTOR">Investor</option>
                    <option value="CO_OWNER">Co-Owner</option>
                    <option value="SILENT_PARTNER">Silent Partner</option>
                    <option value="ACTIVE_PARTNER">Active Partner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Initial Investment
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partnerForm.initialInvestment}
                    onChange={(e) => setPartnerForm({ ...partnerForm, initialInvestment: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={partnerForm.taxId}
                    onChange={(e) => setPartnerForm({ ...partnerForm, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={partnerForm.address}
                    onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Account
                  </label>
                  <input
                    type="text"
                    value={partnerForm.bankAccount}
                    onChange={(e) => setPartnerForm({ ...partnerForm, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={partnerForm.notes}
                    onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingPartner ? 'Update Partner' : 'Create Partner'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPartnerModal(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
