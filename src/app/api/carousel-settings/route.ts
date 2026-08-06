import { NextResponse } from 'next/server';
import { readSettings } from '@/lib/siteSettings';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// GET /api/carousel-settings — public, read-only. The homepage hero carousel
// needs these settings before a visitor has ever authenticated, so this
// intentionally does not require auth (unlike /api/admin/settings, which
// owns writing them). Only the `carousel` category is exposed here.
export async function GET() {
  try {
    const settings = readSettings();
    return NextResponse.json({ success: true, data: settings.carousel });
  } catch (error) {
    console.error('Error fetching carousel settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch carousel settings' },
      { status: 500 }
    );
  }
}
