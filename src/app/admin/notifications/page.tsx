'use client';

import React from 'react';

export default function NotificationsPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications Center</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Send notifications to customers</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 sm:p-8 text-center">
        <div className="text-4xl sm:text-5xl mb-3">🔔</div>
        <h3 className="text-lg sm:text-xl font-semibold text-blue-900 mb-2">Notifications Coming Soon</h3>
        <p className="text-blue-700 text-sm sm:text-base">
          Sending push/email/SMS notifications to customers isn't wired up yet.
          <br />Check back once the notification-delivery backend has been built.
        </p>
      </div>
    </div>
  );
}
