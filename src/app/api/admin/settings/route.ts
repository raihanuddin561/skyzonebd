import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { readSettings, writeSettings } from '@/lib/siteSettings';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// GET /api/admin/settings — Full settings read for admins
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const settings = await readSettings(true);
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

// PUT /api/admin/settings — Update settings with audit logging
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
    const currentSettings = await readSettings(true);

    // Deep merge updated sections
    const updatedSettings = {
      general: { ...currentSettings.general, ...(body.general || {}) },
      delivery: {
        ...currentSettings.delivery,
        ...(body.delivery || {}),
        zones: body.delivery?.zones && Array.isArray(body.delivery.zones)
          ? body.delivery.zones
          : currentSettings.delivery.zones,
      },
      charges: {
        ...currentSettings.charges,
        ...(body.charges || {}),
        gatewayFees: { ...currentSettings.charges.gatewayFees, ...(body.charges?.gatewayFees || {}) },
        customCharges: Array.isArray(body.charges?.customCharges)
          ? body.charges.customCharges
          : currentSettings.charges.customCharges,
      },
      tax: { ...currentSettings.tax, ...(body.tax || {}) },
      orders: { ...currentSettings.orders, ...(body.orders || {}) },
      profitSharing: { ...currentSettings.profitSharing, ...(body.profitSharing || {}) },
      system: { ...currentSettings.system, ...(body.system || {}) },
      carousel: { ...currentSettings.carousel, ...(body.carousel || {}) },
    };

    const success = await writeSettings(updatedSettings);

    if (success) {
      await logActivity({
        userId: authUser.id,
        userName: authUser.name || 'Admin',
        action: 'UPDATE',
        entityType: 'SiteSettings',
        entityId: 'site_settings',
        entityName: 'Global Site Settings',
        description: `Updated admin site settings (delivery, tax, order rules, charges)`,
        request,
      });

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
