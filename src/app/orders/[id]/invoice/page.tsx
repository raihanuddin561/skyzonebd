'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  amount: number;
  paidAmount: number;
  status: string;
  customer: { name: string; email: string; phone: string | null; companyName: string | null } | null;
  order: {
    orderNumber: string;
    createdAt: string;
    shippingAddress: string;
    billingAddress: string;
    subtotal: number;
    tax: number;
    shipping: number;
    total: number;
    orderItems: Array<{ quantity: number; price: number; total: number; product: { name: string; sku: string | null } }>;
  };
}

export default function InvoicePage() {
  const params = useParams();
  const orderId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [orderId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/invoice`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setInvoice(data.data);
      } else {
        setError(data.error || 'Failed to load invoice');
      }
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-600 mb-4">{error || 'Invoice not found'}</p>
          <Link href={`/orders/${orderId}`} className="text-blue-600 hover:text-blue-700">
            Back to order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden">
        <Header />
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="print:hidden flex justify-end mb-4">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Print / Save as PDF
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 print:shadow-none print:border-none">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-gray-600 mt-1">{invoice.invoiceNumber}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  invoice.status === 'PAID'
                    ? 'bg-green-100 text-green-800'
                    : invoice.status === 'OVERDUE'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}
              >
                {invoice.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase mb-2">Bill To</h2>
              <p className="text-gray-900 font-medium">{invoice.customer?.companyName || invoice.customer?.name}</p>
              <p className="text-gray-600 text-sm">{invoice.customer?.email}</p>
              {invoice.customer?.phone && <p className="text-gray-600 text-sm">{invoice.customer.phone}</p>}
              <p className="text-gray-600 text-sm mt-2 whitespace-pre-line">{invoice.order.billingAddress}</p>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span className="text-gray-500">Order Number:</span>
                <span className="text-gray-900 font-medium">{invoice.order.orderNumber}</span>
                <span className="text-gray-500">Issue Date:</span>
                <span className="text-gray-900 font-medium">{new Date(invoice.issueDate).toLocaleDateString()}</span>
                <span className="text-gray-500">Due Date:</span>
                <span className="text-gray-900 font-medium">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                <span className="text-gray-500">Payment Terms:</span>
                <span className="text-gray-900 font-medium">{invoice.paymentTerms}</span>
              </div>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead className="border-b border-gray-200">
              <tr>
                <th className="text-left py-2 text-sm font-semibold text-gray-500">Item</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-500">Qty</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-500">Price</th>
                <th className="text-right py-2 text-sm font-semibold text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.order.orderItems.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 text-sm text-gray-900">
                    {item.product.name}
                    {item.product.sku && <span className="text-gray-500"> ({item.product.sku})</span>}
                  </td>
                  <td className="py-2 text-sm text-gray-600 text-right">{item.quantity}</td>
                  <td className="py-2 text-sm text-gray-600 text-right">৳{item.price.toFixed(2)}</td>
                  <td className="py-2 text-sm text-gray-900 text-right">৳{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">৳{invoice.order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">৳{invoice.order.shipping.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">৳{invoice.order.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
                <span className="text-gray-900">Total Due</span>
                <span className="text-gray-900">৳{invoice.amount.toFixed(2)}</span>
              </div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Paid</span>
                  <span>৳{invoice.paidAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="print:hidden mt-4 text-center">
          <Link href={`/orders/${orderId}`} className="text-blue-600 hover:text-blue-700 text-sm">
            Back to order
          </Link>
        </div>
      </div>

      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
}
