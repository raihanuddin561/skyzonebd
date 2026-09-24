'use client';

import React from 'react';
import Link from 'next/link';
import AdminIcon from '../components/AdminIcons';

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Promotional Banners</h1>
        <p className="text-gray-600 mt-1">Manage site banners and promotional content</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <div className="w-14 h-14 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
          <AdminIcon name="banners" className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Banner Management Coming Soon</h3>
        <p className="text-blue-700 text-sm">
          Create and schedule promotional banners for your e-commerce site.
          <br />Currently using Hero Slides for homepage banners.
        </p>
        <div className="mt-4">
          <Link href="/admin/hero-slides" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer">
            Manage Hero Slides
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
