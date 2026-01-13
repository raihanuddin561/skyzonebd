'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Closed by default on mobile
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (!mobile) {
        setSidebarOpen(true); // Open by default on desktop
      } else {
        setSidebarOpen(false); // Closed by default on mobile
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [pathname, isMobile]);

  // Close sidebar when clicking outside (mobile only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        isMobile &&
        sidebarOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        const target = event.target as HTMLElement;
        // Don't close if clicking the toggle button or backdrop
        if (!target.closest('[data-sidebar-toggle]') && !target.closest('aside')) {
          setSidebarOpen(false);
        }
      }
    };

    // Use 'click' instead of 'mousedown' to avoid interfering with scrolling
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('touchend', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('touchend', handleClickOutside);
    };
  }, [isMobile, sidebarOpen]);

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

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
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
        { name: 'Units', icon: '⚖️', path: '/admin/units' },
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
        { name: 'Hero Slides', icon: '🎯', path: '/admin/hero-slides' },
        { name: 'Banners', icon: '🖼️', path: '/admin/banners' },
        { name: 'Reviews', icon: '⭐', path: '/admin/reviews' },
        { name: 'Notifications', icon: '🔔', path: '/admin/notifications' },
      ]
    },
    {
      category: 'Settings',
      items: [
        { name: 'Activity Logs', icon: '📜', path: '/admin/activity-logs' },
        { name: 'Site Settings', icon: '⚙️', path: '/admin/settings' },
        { name: 'Payment Methods', icon: '💳', path: '/admin/payments' },
        { name: 'Shipping', icon: '🚚', path: '/admin/shipping' },
        { name: 'Reports', icon: '📊', path: '/admin/reports' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Backdrop Overlay for Mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 fixed w-full z-30">
        <div className="px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                data-sidebar-toggle
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 touch-manipulation"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
                <span className="hidden sm:inline">SkyzoneBD Admin Panel</span>
                <span className="sm:hidden">Admin</span>
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors touch-manipulation">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-gray-200">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{user.name}</div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm sm:text-base flex-shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar - Amazon/Alibaba Style Mobile Menu */}
        <aside
          ref={sidebarRef}
          className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ease-in-out z-50 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isMobile ? 'w-[280px] shadow-2xl' : 'w-64 translate-x-0'}`}
          style={{
            // Ensure proper scrolling on iOS
            WebkitOverflowScrolling: 'touch',
            // Prevent touch events from propagating during scroll
            touchAction: 'pan-y',
          }}
          onTouchStart={(e) => {
            // Stop propagation to prevent closing while scrolling
            e.stopPropagation();
          }}
        >
          <nav className="p-3 sm:p-4 space-y-4 sm:space-y-6">
            {menuItems.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {section.category}
                </h3>
                <ul className="space-y-1">
                  {section.items.map((item, itemIdx) => (
                    <li key={itemIdx}>
                      <Link
                        href={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors touch-manipulation ${
                          pathname === item.path ? 'bg-blue-50 text-blue-600 font-semibold' : ''
                        }`}
                      >
                        <span className="text-xl flex-shrink-0">{item.icon}</span>
                        <span className="font-medium text-sm sm:text-base">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            
            {/* Mobile-only Home Link */}
            {isMobile && (
              <div className="pt-4 border-t border-gray-200">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors touch-manipulation"
                >
                  <span className="text-xl">🏠</span>
                  <span className="font-medium">Back to Store</span>
                </Link>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content - Responsive padding */}
        <main className={`flex-1 transition-none ${isMobile ? 'ml-0' : 'ml-64'} w-full`}>
          <div className="p-3 sm:p-4 lg:p-6 max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
