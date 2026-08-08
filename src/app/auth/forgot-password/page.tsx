'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (result.success) {
        setSubmitted(true);
        toast.success('Password reset instructions sent to your email');
      } else {
        toast.error(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-gray-50 relative overflow-hidden">
        <Header />
        <div className="relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="card-hover bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-4 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
                <p className="text-gray-600 mb-6">
                  We&apos;ve sent password reset instructions to <strong>{email}</strong>
                </p>
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Didn&apos;t receive the email? Check your spam folder or try again.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm cursor-pointer"
                  >
                    Try different email
                  </button>
                </div>
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <Link
                    href="/auth/login"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to Login
                  </Link>
                </div>
              </div>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Password Recovery
            </span>
            <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">
              Reset your password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </p>
          </div>

          <form className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Send Reset Instructions
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <Link
                href="/auth/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                ← Back to Login
              </Link>
            </div>

            <div className="text-center border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-600">
                Don&apos;t have an account?{' '}
                <Link href="/auth/register" className="font-medium text-blue-600 hover:text-blue-500">
                  Sign up
                </Link>
              </p>
            </div>
          </form>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Security Notice</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    For your security, the reset link will expire in 1 hour. If you didn&apos;t request this, you can safely ignore this email.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
