import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { readSettings, writeSettings } from '@/lib/siteSettings';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// GET settings
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const settings = readSettings();
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT/PATCH - Update settings
export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const currentSettings = readSettings();

    // Merge new settings with current settings
    const updatedSettings = {
      general: { ...currentSettings.general, ...body.general },
      orders: { ...currentSettings.orders, ...body.orders },
      system: { ...currentSettings.system, ...body.system },
      carousel: { ...currentSettings.carousel, ...body.carousel },
    };

    const success = writeSettings(updatedSettings);

    if (success) {
      return NextResponse.json({
        success: true,
        data: updatedSettings,
        message: 'Settings updated successfully',
      });
    } else {
      throw new Error('Failed to write settings');
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
