'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      const result = await response.json();

      if (result.success) {
        setDone(true);
        toast.success('Password reset successfully');
        setTimeout(() => router.push('/auth/login'), 2000);
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="card-hover bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Reset Link</h2>
              <p className="text-gray-600 mb-6">
                This password reset link is missing its token. Please request a new one.
              </p>
              <Link
                href="/auth/forgot-password"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Request a new reset link
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="card-hover bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-md">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Reset</h2>
              <p className="text-gray-600">Redirecting you to login&hellip;</p>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Header />

      {/* Subtle branded dot-pattern accent */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(37,99,235,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6">
          <div>
            <span className="section-eyebrow mx-auto flex w-fit">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 10-8 0v4h8z" />
              </svg>
              Secure Access
            </span>
            <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
              Set a new password
            </h2>
          </div>

          <form className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New password
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Re-enter your new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all cursor-pointer"
            >
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>

            <div className="text-center">
              <Link href="/auth/login" className="font-medium text-blue-600 hover:text-blue-500 text-sm">
                ← Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
