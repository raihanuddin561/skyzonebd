import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Add noindex headers to all API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    return response;
  }

  // Add noindex headers to admin routes
  if (pathname.startsWith('/admin') || 
      pathname.startsWith('/dashboard') || 
      pathname.startsWith('/account') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/wishlist') ||
      pathname.startsWith('/partner')) {
    const response = NextResponse.next();
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
    '/admin/:path*',
    '/dashboard/:path*',
    '/account/:path*',
    '/profile/:path*',
    '/orders/:path*',
    '/wishlist/:path*',
    '/partner/:path*',
  ],
};
