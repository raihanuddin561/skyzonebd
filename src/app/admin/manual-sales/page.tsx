'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ManualSaleItem {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  profit: number;
}

interface ManualSale {
  id: string;
  saleDate: string;
  referenceNumber: string;
  saleType: string;
  customerName: string;
  customerPhone: string;
  customerCompany: string;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  paymentMethod: string;
  paymentStatus: string;
  amountPaid: number;
  inventoryAdjusted: boolean;
  items: ManualSaleItem[];
  customer?: {
    name: string;
    email: string;
  };
  enteredBy?: {
    name: string;
  };
  createdAt: string;
}

interface FilterState {
  saleType: string;
  startDate: string;
  endDate: string;
  paymentStatus: string;
  search: string;
}

export default function ManualSalesListPage() {
  const router = useRouter();
  const [sales, setSales] = useState<ManualSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<FilterState>({
    saleType: '',
    startDate: '',
    endDate: '',
    paymentStatus: '',
    search: ''
  });
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    averageMargin: 0
  });

  // Fetch sales
  const fetchSales = async (page: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.saleType && { saleType: filters.saleType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.paymentStatus && { paymentStatus: filters.paymentStatus }),
      });

      const response = await fetch(`/api/admin/manual-sales?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setSales(result.data || []);
        setCurrentPage(result.pagination?.currentPage || 1);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalCount(result.pagination?.totalCount || 0);
        
        // Calculate stats
        const totalSales = result.data.reduce((sum: number, sale: ManualSale) => sum + sale.total, 0);
        const totalProfit = result.data.reduce((sum: number, sale: ManualSale) => sum + sale.totalProfit, 0);
        const averageMargin = result.data.length > 0
          ? result.data.reduce((sum: number, sale: ManualSale) => sum + sale.profitMargin, 0) / result.data.length
          : 0;
        
        setStats({ totalSales, totalProfit, averageMargin });
      } else {
        toast.error('Failed to fetch sales');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(currentPage);
  }, [currentPage]);

  // Apply filters
  const handleApplyFilters = () => {
    setCurrentPage(1);
    fetchSales(1);
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      saleType: '',
      startDate: '',
      endDate: '',
      paymentStatus: '',
      search: ''
    });
    setCurrentPage(1);
    setTimeout(() => fetchSales(1), 0);
  };

  // Delete sale
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sale? This will restore inventory if it was adjusted.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/manual-sales/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Sale deleted successfully');
        fetchSales(currentPage);
      } else {
        toast.error(result.error || 'Failed to delete sale');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete sale');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `৳${amount.toFixed(2)}`;
  };

  // Get sale type badge
  const getSaleTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'OFFLINE': 'bg-purple-100 text-purple-800',
      'PHONE_ORDER': 'bg-blue-100 text-blue-800',
      'WHOLESALE_DIRECT': 'bg-green-100 text-green-800',
      'EXTERNAL_CHANNEL': 'bg-orange-100 text-orange-800',
      'OTHER': 'bg-gray-100 text-gray-800'
    };
    
    return colors[type] || colors['OTHER'];
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'PAID': 'bg-green-100 text-green-800',
      'PARTIAL': 'bg-yellow-100 text-yellow-800',
      'PENDING': 'bg-red-100 text-red-800'
    };
    
    return colors[status] || colors['PENDING'];
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Manual Sales</h1>
            <p className="text-gray-600 mt-1">Track offline and external channel sales</p>
          </div>
          
          <Link
            href="/admin/manual-sales/new"
            className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Record New Sale
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Profit</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(stats.totalProfit)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Profit Margin</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">{stats.averageMargin.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type</label>
              <select
                value={filters.saleType}
                onChange={(e) => setFilters({ ...filters, saleType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Types</option>
                <option value="OFFLINE">Offline Store</option>
                <option value="PHONE_ORDER">Phone Order</option>
                <option value="WHOLESALE_DIRECT">Wholesale Direct</option>
                <option value="EXTERNAL_CHANNEL">External Channel</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial Payment</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-3">
            <button
              onClick={handleApplyFilters}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Sales List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading sales...</span>
            </div>
          </div>
        ) : sales.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No sales found</p>
              <p className="mt-2">Try adjusting your filters or create a new sale entry</p>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Reference
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Items
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Profit
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sales.map(sale => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatDate(sale.saleDate)}</div>
                          {sale.referenceNumber && (
                            <div className="text-xs text-gray-500">{sale.referenceNumber}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div className="text-xs text-gray-500">{sale.customerPhone}</div>
                          )}
                          {sale.customerCompany && (
                            <div className="text-xs text-gray-500">{sale.customerCompany}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSaleTypeBadge(sale.saleType)}`}>
                            {sale.saleType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{sale.items.length} items</div>
                          <div className="text-xs text-gray-500">
                            {sale.items.reduce((sum, item) => sum + item.quantity, 0)} units
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-gray-900">{formatCurrency(sale.total)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="text-sm font-semibold text-green-600">{formatCurrency(sale.totalProfit)}</div>
                          <div className="text-xs text-gray-500">{sale.profitMargin.toFixed(2)}%</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusBadge(sale.paymentStatus)}`}>
                            {sale.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/admin/manual-sales/${sale.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDelete(sale.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing page {currentPage} of {totalPages} ({totalCount} total sales)
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-4 py-2 border rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Previous
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(page)}
                            className={`px-4 py-2 border rounded-lg font-medium ${
                              currentPage === page
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 border rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
