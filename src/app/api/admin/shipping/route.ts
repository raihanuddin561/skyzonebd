import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

const SHIPPING_CONFIG_KEY = 'shipping_config';

// Default shipping zones for Bangladesh
const defaultShippingZones = [
  {
    id: 'dhaka-city',
    name: 'Dhaka City',
    areas: ['Gulshan', 'Banani', 'Dhanmondi', 'Mohammadpur', 'Mirpur', 'Uttara'],
    rate: 60,
    deliveryTime: '1-2 days',
    enabled: true,
  },
  {
    id: 'dhaka-metro',
    name: 'Dhaka Metro',
    areas: ['Gazipur', 'Narayanganj', 'Savar', 'Keraniganj', 'Tongi'],
    rate: 100,
    deliveryTime: '2-3 days',
    enabled: true,
  },
  {
    id: 'major-cities',
    name: 'Major Cities',
    areas: ['Chittagong', 'Sylhet', 'Rajshahi', 'Khulna', 'Barisal', 'Rangpur'],
    rate: 150,
    deliveryTime: '3-5 days',
    enabled: true,
  },
  {
    id: 'other-areas',
    name: 'Other Areas',
    areas: ['All other districts and upazilas'],
    rate: 200,
    deliveryTime: '5-7 days',
    enabled: true,
  },
];

const deliveryPartners = [
  {
    id: 'pathao',
    name: 'Pathao',
    enabled: true,
    coverage: ['dhaka-city', 'dhaka-metro', 'major-cities'],
  },
  {
    id: 'steadfast',
    name: 'Steadfast',
    enabled: true,
    coverage: ['dhaka-city', 'dhaka-metro', 'major-cities', 'other-areas'],
  },
  {
    id: 'redx',
    name: 'RedX',
    enabled: true,
    coverage: ['dhaka-city', 'dhaka-metro'],
  },
  {
    id: 'sundarban',
    name: 'Sundarban Courier',
    enabled: false,
    coverage: ['major-cities', 'other-areas'],
  },
];

// Read shipping config from the PlatformConfig table
async function readShippingConfig() {
  try {
    const record = await prisma.platformConfig.findUnique({
      where: { key: SHIPPING_CONFIG_KEY },
    });
    if (record) {
      return JSON.parse(record.value);
    }
    return {
      zones: defaultShippingZones,
      partners: deliveryPartners,
    };
  } catch (error) {
    console.error('Error reading shipping config:', error);
    return {
      zones: defaultShippingZones,
      partners: deliveryPartners,
    };
  }
}

// Write shipping config to the PlatformConfig table
async function writeShippingConfig(config: any) {
  try {
    const value = JSON.stringify(config);
    await prisma.platformConfig.upsert({
      where: { key: SHIPPING_CONFIG_KEY },
      create: {
        key: SHIPPING_CONFIG_KEY,
        value,
        category: 'general',
        description: 'Shipping zones and delivery partners config',
      },
      update: { value },
    });
    return true;
  } catch (error) {
    console.error('Error writing shipping config:', error);
    return false;
  }
}

// GET shipping zones and partners
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const config = await readShippingConfig();

    return NextResponse.json({
      success: true,
      data: {
        zones: config.zones,
        partners: config.partners,
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching shipping config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch shipping configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update shipping zone
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
    const { type, id, ...updates } = body; // type: 'zone' or 'partner'

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    const config = await readShippingConfig();

    if (type === 'zone') {
      const zoneIndex = config.zones.findIndex((z: any) => z.id === id);
      if (zoneIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Shipping zone not found' },
          { status: 404 }
        );
      }
      config.zones[zoneIndex] = {
        ...config.zones[zoneIndex],
        ...updates,
      };
    } else if (type === 'partner') {
      const partnerIndex = config.partners.findIndex((p: any) => p.id === id);
      if (partnerIndex === -1) {
        return NextResponse.json(
          { success: false, error: 'Delivery partner not found' },
          { status: 404 }
        );
      }
      config.partners[partnerIndex] = {
        ...config.partners[partnerIndex],
        ...updates,
      };
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be "zone" or "partner"' },
        { status: 400 }
      );
    }

    const success = await writeShippingConfig(config);

    if (success) {
      return NextResponse.json({
        success: true,
        data: config,
        message: 'Shipping configuration updated successfully',
      });
    } else {
      throw new Error('Failed to write shipping config');
    }
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating shipping config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update shipping configuration' },
      { status: 500 }
    );
  }
}
