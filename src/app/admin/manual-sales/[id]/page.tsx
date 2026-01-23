'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ManualSaleItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  costPerUnit: number;
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  notes: string;
  product?: {
    name: string;
    imageUrl: string;
  };
}

interface ManualSale {
  id: string;
  saleDate: string;
  referenceNumber: string;
  saleType: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
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
  notes: string;
  items: ManualSaleItem[];
  customer?: {
    name: string;
    email: string;
  };
  enteredBy?: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ManualSaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sale, setSale] = useState<ManualSale | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch sale details
  useEffect(() => {
    fetchSaleDetails();
  }, [params.id]);

  const fetchSaleDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/manual-sales/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const result = await response.json();
        setSale(result.data);
      } else {
        toast.error('Failed to fetch sale details');
        router.push('/admin/manual-sales');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch sale details');
    } finally {
      setLoading(false);
    }
  };

  // Delete sale
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this sale? This will restore inventory if it was adjusted.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/manual-sales/${params.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Sale deleted successfully');
        setTimeout(() => {
          router.push('/admin/manual-sales');
        }, 1500);
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `৳${amount.toFixed(2)}`;
  };

  // Get sale type label
  const getSaleTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading sale details...</span>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Sale not found</p>
          <Link href="/admin/manual-sales" className="text-blue-600 hover:text-blue-700 mt-2 inline-block">
            Back to Sales List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/admin/manual-sales"
            className="text-blue-600 hover:text-blue-700 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Sales List
          </Link>
          
          <div className="flex items-start justify-between mt-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sale Details</h1>
              {sale.referenceNumber && (
                <p className="text-gray-600 mt-1">Reference: {sale.referenceNumber}</p>
              )}
            </div>
            
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Delete Sale
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sale Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sale Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Sale Date</p>
                  <p className="font-medium text-gray-900">{formatDate(sale.saleDate)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Sale Type</p>
                  <p className="font-medium text-gray-900">{getSaleTypeLabel(sale.saleType)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Created At</p>
                  <p className="font-medium text-gray-900">{formatDate(sale.createdAt)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Entered By</p>
                  <p className="font-medium text-gray-900">{sale.enteredBy?.name || 'Unknown'}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Inventory Status</p>
                  <p className="font-medium text-gray-900">
                    {sale.inventoryAdjusted ? (
                      <span className="text-green-600">✓ Adjusted</span>
                    ) : (
                      <span className="text-gray-500">Not Adjusted</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{sale.customerName}</p>
                </div>
                
                {sale.customerEmail && (
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{sale.customerEmail}</p>
                  </div>
                )}
                
                {sale.customerPhone && (
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium text-gray-900">{sale.customerPhone}</p>
                  </div>
                )}
                
                {sale.customerCompany && (
                  <div>
                    <p className="text-sm text-gray-600">Company</p>
                    <p className="font-medium text-gray-900">{sale.customerCompany}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Items Sold</h2>
              
              <div className="space-y-4">
                {sale.items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      {item.product?.imageUrl && (
                        <img 
                          src={item.product.imageUrl} 
                          alt={item.productName}
                          className="w-20 h-20 object-cover rounded"
                        />
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{item.productName}</h3>
                        <p className="text-sm text-gray-600">SKU: {item.productSku}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                          <div>
                            <p className="text-xs text-gray-600">Quantity</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-600">Unit Price</p>
                            <p className="font-medium">{formatCurrency(item.unitPrice)}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-600">Cost/Unit</p>
                            <p className="font-medium text-red-600">{formatCurrency(item.costPerUnit)}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-600">Total</p>
                            <p className="font-semibold text-blue-600">{formatCurrency(item.total)}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 mt-2">
                          <div>
                            <p className="text-xs text-gray-600">Profit</p>
                            <p className="font-semibold text-green-600">{formatCurrency(item.profit)}</p>
                          </div>
                          
                          <div>
                            <p className="text-xs text-gray-600">Margin</p>
                            <p className="font-semibold text-green-600">{item.profitMargin.toFixed(2)}%</p>
                          </div>
                        </div>

                        {item.notes && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600">Notes</p>
                            <p className="text-sm text-gray-700">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {sale.notes && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
                <p className="text-gray-700 whitespace-pre-wrap">{sale.notes}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Payment Details */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method</span>
                  <span className="font-medium">{sale.paymentMethod.replace('_', ' ')}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    sale.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                    sale.paymentStatus === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {sale.paymentStatus}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid</span>
                  <span className="font-semibold text-green-600">{formatCurrency(sale.amountPaid)}</span>
                </div>

                {sale.paymentStatus !== 'PAID' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Balance Due</span>
                    <span className="font-semibold text-red-600">{formatCurrency(sale.total - sale.amountPaid)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
                </div>
                
                {sale.discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(sale.discount)}</span>
                  </div>
                )}
                
                {sale.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatCurrency(sale.tax)}</span>
                  </div>
                )}
                
                {sale.shipping > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">{formatCurrency(sale.shipping)}</span>
                  </div>
                )}
                
                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total Sale</span>
                    <span className="font-bold text-lg text-blue-600">{formatCurrency(sale.total)}</span>
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Cost</span>
                    <span className="font-medium text-red-600">{formatCurrency(sale.totalCost)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Profit</span>
                    <span className="font-bold text-green-600">{formatCurrency(sale.totalProfit)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Profit Margin</span>
                    <span className="font-semibold text-green-600">{sale.profitMargin.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
              
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{sale.items.length}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Total Units Sold</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600">Average Item Profit</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(sale.totalProfit / sale.items.length)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
