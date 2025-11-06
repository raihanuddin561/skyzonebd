'use client';

import React from 'react';
import { toast } from 'react-toastify';

export default function BannersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Promotional Banners</h1>
        <p className="text-gray-600 mt-1">Manage site banners and promotional content</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-3">🖼️</div>
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Banner Management Coming Soon</h3>
        <p className="text-blue-700 text-sm">
          Create and schedule promotional banners for your e-commerce site.
          <br />Currently using Hero Slides for homepage banners.
        </p>
        <div className="mt-4">
          <a href="/admin/hero-slides" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
            Manage Hero Slides →
          </a>
        </div>
      </div>
    </div>
  );
}
