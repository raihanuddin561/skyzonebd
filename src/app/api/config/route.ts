import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_USE_API: process.env.NEXT_PUBLIC_USE_API,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    USE_API: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_USE_API === 'true'
  });
}
