'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  const menuItems = [
    {
      category: 'Overview',
      items: [
        { name: 'Dashboard', icon: '📊', path: '/admin' },
        { name: 'Analytics', icon: '📈', path: '/admin/analytics' },
      ]
    },
    {
      category: 'E-Commerce',
      items: [
        { name: 'Products', icon: '📦', path: '/admin/products' },
        { name: 'Categories', icon: '🏷️', path: '/admin/categories' },
        { name: 'Orders', icon: '🛒', path: '/admin/orders' },
        { name: 'Inventory', icon: '📋', path: '/admin/inventory' },
      ]
    },
    {
      category: 'Customer Management',
      items: [
        { name: 'Users', icon: '👥', path: '/admin/users' },
        { name: 'B2B Verification', icon: '✓', path: '/admin/verification' },
        { name: 'RFQ Requests', icon: '📝', path: '/admin/rfq' },
      ]
    },
    {
      category: 'Content',
      items: [
        { name: 'Banners', icon: '🖼️', path: '/admin/banners' },
        { name: 'Reviews', icon: '⭐', path: '/admin/reviews' },
        { name: 'Notifications', icon: '🔔', path: '/admin/notifications' },
      ]
    },
    {
      category: 'Settings',
      items: [
        { name: 'Site Settings', icon: '⚙️', path: '/admin/settings' },
        { name: 'Payment Methods', icon: '💳', path: '/admin/payments' },
        { name: 'Shipping', icon: '🚚', path: '/admin/shipping' },
        { name: 'Reports', icon: '📊', path: '/admin/reports' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full z-30">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-900">SkyzoneBD Admin Panel</h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0'
        }`}>
          <nav className="p-4 space-y-6">
            {menuItems.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {section.category}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <Link
                        href={item.path}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
