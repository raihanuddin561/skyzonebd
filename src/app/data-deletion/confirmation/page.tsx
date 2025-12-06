'use client'

import { useEffect } from 'react';
import Header from '../../components/Header';
import Link from 'next/link';

export default function DeletionConfirmationPage() {
  useEffect(() => {
    // Clear any form data from session storage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('deletionRequestData');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Request Submitted Successfully</h1>
          <p className="text-gray-600 mb-8">
            Your data deletion request has been received and is being processed.
          </p>

          {/* What Happens Next */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What Happens Next?</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Immediate Confirmation</h3>
                  <p className="text-gray-600 text-sm">You will receive an email confirmation within a few minutes</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Identity Verification</h3>
                  <p className="text-gray-600 text-sm">Our team will verify your identity within 2-3 business days</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-blue-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Data Deletion</h3>
                  <p className="text-gray-600 text-sm">Complete data removal within 7 business days</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-green-600 font-bold text-sm">✓</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Final Confirmation</h3>
                  <p className="text-gray-600 text-sm">You will receive a final email when deletion is complete</p>
                </div>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-yellow-50 rounded-lg p-6 mb-8 text-left border-l-4 border-yellow-500">
            <h3 className="font-semibold text-yellow-800 mb-3">Important Notes:</h3>
            <ul className="list-disc pl-5 text-sm text-yellow-800 space-y-2">
              <li>Check your email (including spam folder) for confirmation</li>
              <li>Your account will remain active until verification is complete</li>
              <li>You can still use your account during the verification period</li>
              <li>To cancel this request, contact us immediately at privacy@skyzonebd.com</li>
            </ul>
          </div>

          {/* Request ID */}
          <div className="bg-gray-100 rounded-lg p-4 mb-8">
            <p className="text-sm text-gray-600 mb-1">Request Reference</p>
            <p className="text-lg font-mono text-gray-800">REQ-{Date.now()}</p>
            <p className="text-xs text-gray-500 mt-2">Save this reference for your records</p>
          </div>

          {/* Contact Support */}
          <div className="mb-8">
            <p className="text-gray-700 mb-4">Questions or need to cancel this request?</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="mailto:privacy@skyzonebd.com"
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact Privacy Team
              </a>
              <a 
                href="tel:+8801700000000"
                className="inline-flex items-center justify-center px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call Support
              </a>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t">
            <Link 
              href="/"
              className="inline-block px-8 py-3 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
