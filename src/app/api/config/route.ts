import { NextResponse } from 'next/server';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_USE_API: process.env.NEXT_PUBLIC_USE_API,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    USE_API: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_USE_API === 'true'
  });
}
