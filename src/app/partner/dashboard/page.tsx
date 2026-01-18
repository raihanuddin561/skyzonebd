'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import DashboardStats from '@/app/partner/dashboard/components/DashboardStats';
import DistributionHistory from '@/app/partner/dashboard/components/DistributionHistory';
import InvestmentSummary from '@/app/partner/dashboard/components/InvestmentSummary';
import ProfitChart from '@/app/partner/dashboard/components/ProfitChart';

interface PartnerInfo {
  id: string;
  name: string;
  profitSharePercentage: number;
  isActive: boolean;
  joinDate: string;
  totalProfitReceived: number;
}

interface DistributionSummary {
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalEarned: number;
  currentMonthProfit: number;
  lifetimeProfit: number;
}

interface Distribution {
  id: string;
  period: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
}

interface DashboardData {
  partner: PartnerInfo;
  summary: DistributionSummary;
  recentDistributions: Distribution[];
  ledgerSummary?: {
    totalCredits: number;
    totalDebits: number;
    netBalance: number;
  };
}

export default function PartnerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if user is a partner
    if (user && user.role !== 'PARTNER') {
      router.push('/dashboard');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/partner/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setDashboardData(data.data);
      } else {
        setError(data.error || 'Failed to load dashboard');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md">
          <div className="text-center">
            <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Partner Portal</h1>
              <p className="text-gray-600 mt-1">
                Welcome back, {dashboardData.partner.name}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Your Share</div>
              <div className="text-2xl font-bold text-green-600">
                {dashboardData.partner.profitSharePercentage}%
              </div>
              <div className={`text-xs mt-1 ${dashboardData.partner.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {dashboardData.partner.isActive ? 'Active' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <DashboardStats 
          summary={dashboardData.summary} 
          profitSharePercentage={dashboardData.partner.profitSharePercentage}
        />

        {/* Charts and Distribution History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ProfitChart distributions={dashboardData.recentDistributions} />
          <InvestmentSummary 
            partner={dashboardData.partner}
            ledgerSummary={dashboardData.ledgerSummary}
          />
        </div>

        {/* Distribution History */}
        <DistributionHistory distributions={dashboardData.recentDistributions} />
      </div>
    </div>
  );
}
