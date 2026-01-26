import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


const SHIPPING_FILE = path.join(process.cwd(), 'data', 'shipping-zones.json');

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

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read shipping config from file
function readShippingConfig() {
  try {
    ensureDataDir();
    if (fs.existsSync(SHIPPING_FILE)) {
      const data = fs.readFileSync(SHIPPING_FILE, 'utf8');
      return JSON.parse(data);
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

// Write shipping config to file
function writeShippingConfig(config: any) {
  try {
    ensureDataDir();
    fs.writeFileSync(SHIPPING_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing shipping config:', error);
    return false;
  }
}

// GET shipping zones and partners
export async function GET(request: NextRequest) {
  try {
    const config = readShippingConfig();
    
    return NextResponse.json({
      success: true,
      data: {
        zones: config.zones,
        partners: config.partners,
      },
    });
  } catch (error) {
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
    const body = await request.json();
    const { type, id, ...updates } = body; // type: 'zone' or 'partner'

    if (!type || !id) {
      return NextResponse.json(
        { success: false, error: 'Type and ID are required' },
        { status: 400 }
      );
    }

    const config = readShippingConfig();

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

    const success = writeShippingConfig(config);

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
    console.error('Error updating shipping config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update shipping configuration' },
      { status: 500 }
    );
  }
}
