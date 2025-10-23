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
    <header className="bg-slate-100 border-b shadow-sm sticky top-0 z-50">
      {/* Desktop Header */}
      <div className="hidden lg:flex items-center justify-between p-4 gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-blue-800 cursor-pointer whitespace-nowrap">SkyzoneBD</h1>
        </Link>

        {/* SearchBar */}
        <div className="flex-1 min-w-[200px] max-w-[500px] mx-4">
          <SearchBar />
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-3 text-sm text-gray-700 flex-shrink-0">
        <Link href="/products" className="hover:text-blue-700 font-medium cursor-pointer">Products</Link>
        <Link href="/compare" className="hover:text-blue-700 font-medium cursor-pointer">Compare</Link>
        
        {/* Wishlist Icon */}
        <Link href="/wishlist" className="relative hover:text-blue-700 font-medium cursor-pointer">
          <div className="flex items-center gap-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="hidden sm:inline">Wishlist</span>
          </div>
          <NoSSR>
            {getTotalItems() > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
                className="flex items-center gap-2 hover:text-blue-700 font-medium cursor-pointer"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user?.name}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  <div className="px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  {user?.role?.toLowerCase() === 'admin' && (
                    <Link
                      href="/dashboard"
                      className="block px-4 py-2 text-sm text-blue-700 hover:bg-gray-100 cursor-pointer font-medium"
                      onClick={() => setShowUserMenu(false)}
                    >
                      🏠 Dashboard
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
              <Link href="/auth/login" className="hover:text-blue-700 font-medium cursor-pointer">Login</Link>
              <Link href="/auth/register" className="hover:text-blue-700 font-medium cursor-pointer">Register</Link>
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
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
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
          <Link href="/" className="flex-1 text-center">
            <h1 className="text-xl md:text-2xl font-bold text-blue-800 cursor-pointer">SkyzoneBD</h1>
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-2">
            <Link href="/wishlist" className="relative p-2 hover:bg-gray-200 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <NoSSR>
                {getTotalItems() > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
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
          <div className="absolute top-full left-0 right-0 bg-white border-b shadow-lg max-h-[calc(100vh-140px)] overflow-y-auto">
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
                        href="/dashboard"
                        className="block px-4 py-3 text-blue-700 hover:bg-gray-100 font-medium"
                        onClick={() => setShowMobileMenu(false)}
                      >
                        🏠 Dashboard
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
    </header>
  );
}
