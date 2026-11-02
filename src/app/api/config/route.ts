import { NextResponse } from 'next/server';
import { readSettings } from '@/lib/siteSettings';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET() {
  try {
    const settings = await readSettings();

    // Expose only safe, client-needed business configuration
    const publicConfig = {
      siteName: settings.general.siteName,
      storeTagline: settings.general.storeTagline,
      currencySymbol: settings.general.currencySymbol,
      currencyCode: settings.general.currencyCode,
      contact: {
        email: settings.general.email,
        phone: settings.general.phone,
        address: settings.general.address,
      },
      delivery: {
        zones: settings.delivery.zones.filter((z) => z.isActive),
        defaultZoneId: settings.delivery.defaultZoneId,
        freeDeliveryThresholdPoisha: settings.delivery.globalFreeDeliveryThresholdPoisha,
      },
      tax: {
        vatEnabled: settings.tax.vatEnabled,
        vatRatePercent: settings.tax.vatRatePercent,
        pricesInclusiveOfVat: settings.tax.pricesInclusiveOfVat,
      },
      orders: {
        minimumOrderAmountPoisha: settings.orders.minimumOrderAmountPoisha,
        allowedPaymentMethods: settings.orders.allowedPaymentMethods,
        allowGuestCheckout: settings.orders.allowGuestCheckout,
      },
      system: {
        maintenanceMode: settings.system.maintenanceMode,
      },
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_USE_API: process.env.NEXT_PUBLIC_USE_API,
      NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
      USE_API: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_USE_API === 'true',
    };

    return NextResponse.json(
      { success: true, data: publicConfig },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  } catch (error) {
    console.error('Config API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
