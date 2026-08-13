'use client'

import Link from "next/link";
import SearchBar from "./search/search";
import CartIcon from "./CartIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useState, useEffect } from "react";
import NoSSR from "./NoSSR";

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const { getTotalItems } = useWishlist();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
    };
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Trust strip */}
      <div className="hidden md:block bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-center gap-6 text-xs font-medium">
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verified Wholesale Suppliers
          </span>
          <span className="w-1 h-1 rounded-full bg-blue-300/60" />
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Fast Bulk Delivery Nationwide
          </span>
          <span className="w-1 h-1 rounded-full bg-blue-300/60" />
          <span className="inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 8a6 6 0 00-9.33-5M6 16v1a3 3 0 003 3h6a3 3 0 003-3v-1m-6-8V3m0 5a3 3 0 100 6 3 3 0 000-6z" />
            </svg>
            24/7 Buyer Support
          </span>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 gap-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2 group">
          <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:shadow-lg transition-shadow">
            S
          </span>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight cursor-pointer whitespace-nowrap">
            Skyzone<span className="text-blue-600">BD</span>
          </h1>
        </Link>

        {/* SearchBar */}
        <div className="flex-1 min-w-[200px] max-w-[500px] mx-4">
          <SearchBar />
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-1 text-sm text-gray-700 flex-shrink-0">
        <Link href="/products" className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-colors">Products</Link>
        <Link href="/compare" className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-colors">Compare</Link>

        {/* Wishlist Icon */}
        <Link href="/wishlist" className="relative px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-colors">
          <div className="flex items-center gap-1.5">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="hidden sm:inline">Wishlist</span>
          </div>
          <NoSSR>
            {getTotalItems() > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-amber-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
                {getTotalItems()}
              </span>
            )}
          </NoSSR>
        </Link>

        <CartIcon />

        <NoSSR>
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline">{user?.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  {user?.role?.toLowerCase() === 'admin' && (
                    <Link
                      href="/admin"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 cursor-pointer font-medium"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Dashboard
                    </Link>
                  )}
                  {['seller', 'partner'].includes(user?.role?.toLowerCase() || '') && (
                    <Link
                      href="/partner/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 cursor-pointer font-medium"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Partner Dashboard
                    </Link>
                  )}
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/orders"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setShowUserMenu(false)}
                  >
                    My Orders
                  </Link>
                  <Link
                    href="/rfq"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                    onClick={() => setShowUserMenu(false)}
                  >
                    My Quote Requests
                  </Link>
                  <Link
                    href="/data-deletion"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer border-t"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Delete My Data
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-gray-100 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 font-medium cursor-pointer transition-colors">Login</Link>
              <Link href="/auth/register" className="ml-1 px-4 py-2 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-semibold cursor-pointer shadow-sm hover:shadow-md transition-shadow">Register</Link>
            </>
          )}
        </NoSSR>
      </nav>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-3 gap-3">
          {/* Hamburger Menu */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileMenu ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Logo */}
          <Link href="/" className="flex-1 flex items-center justify-center gap-1.5">
            <span className="w-7 h-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              S
            </span>
            <h1 className="text-xl font-extrabold text-gray-900 tracking-tight cursor-pointer">
              Skyzone<span className="text-blue-600">BD</span>
            </h1>
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-1">
            <Link href="/wishlist" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <NoSSR>
                {getTotalItems() > 0 && (
                  <span className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {getTotalItems()}
                  </span>
                )}
              </NoSSR>
            </Link>
            <CartIcon />
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-3">
          <SearchBar />
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div 
            className="absolute top-full left-0 right-0 bg-white border-b shadow-lg max-h-[calc(100vh-140px)] overflow-y-auto"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: 'pan-y',
            }}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <nav className="py-2">
              <Link
                href="/products"
                className="block px-4 py-3 text-gray-700 hover:bg-gray-100 font-medium"
                onClick={() => setShowMobileMenu(false)}
              >
                Products
              </Link>
              <Link
                href="/compare"
                className="block px-4 py-3 text-gray-700 hover:bg-gray-100 font-medium"
                onClick={() => setShowMobileMenu(false)}
              >
                Compare
              </Link>
              
              <NoSSR>
                {isAuthenticated ? (
                  <>
                    <div className="px-4 py-3 border-t border-b bg-gray-50">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    {user?.role?.toLowerCase() === 'admin' && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-3 text-blue-700 hover:bg-gray-100 font-medium"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </Link>
                    )}
                    {['seller', 'partner'].includes(user?.role?.toLowerCase() || '') && (
                      <Link
                        href="/partner/dashboard"
                        className="flex items-center gap-2 px-4 py-3 text-blue-700 hover:bg-gray-100 font-medium"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Partner Dashboard
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/orders"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      My Orders
                    </Link>
                    <Link
                      href="/rfq"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      My Quote Requests
                    </Link>
                    <Link
                      href="/data-deletion"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100 border-t"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Delete My Data
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-red-700 hover:bg-gray-100 font-medium"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="block px-4 py-3 text-gray-700 hover:bg-gray-100 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      Register
                    </Link>
                  </>
                )}
              </NoSSR>
            </nav>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
