'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';

export default function NotificationsPage() {
  const [notifications] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | 'b2b' | 'retail'>('all');

  const handleSend = () => {
    if (!title || !message) {
      toast.error('Please fill in all fields');
      return;
    }
    
    toast.success('Notification sent successfully!');
    setTitle('');
    setMessage('');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Notifications Center</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Send notifications to customers</p>
      </div>

      {/* Send Notification Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Send New Notification</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value as typeof target)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Customers</option>
              <option value="b2b">B2B Customers Only</option>
              <option value="retail">Retail Customers Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[100px]"
            />
          </div>

          <button
            onClick={handleSend}
            className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Send Notification
          </button>
        </div>
      </div>

      {/* Notification History */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8 text-center">
        <div className="text-4xl sm:text-5xl mb-3">🔔</div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Notifications Sent</h3>
        <p className="text-sm sm:text-base text-gray-600">
          Your notification history will appear here.
        </p>
      </div>
    </div>
  );
}
