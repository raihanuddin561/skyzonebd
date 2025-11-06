import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'site-settings.json');

// Default settings structure
const defaultSettings = {
  general: {
    siteName: 'Skyzone BD',
    email: 'support@skyzone.com',
    phone: '+880 1234-567890',
    address: 'Dhaka, Bangladesh',
    currency: 'BDT',
    timezone: 'Asia/Dhaka',
  },
  orders: {
    minimumOrderAmount: 500,
    freeShippingThreshold: 2000,
    taxRate: 0,
    processingTime: '1-2 business days',
  },
  system: {
    maintenanceMode: false,
    allowGuestCheckout: true,
    requireEmailVerification: false,
    autoApproveB2B: false,
  },
};

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read settings from file
function readSettings() {
  try {
    ensureDataDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaultSettings;
  }
}

// Write settings to file
function writeSettings(settings: any) {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing settings:', error);
    return false;
  }
}

// GET settings
export async function GET(request: NextRequest) {
  try {
    const settings = readSettings();
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
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
    const body = await request.json();
    const currentSettings = readSettings();

    // Merge new settings with current settings
    const updatedSettings = {
      general: { ...currentSettings.general, ...body.general },
      orders: { ...currentSettings.orders, ...body.orders },
      system: { ...currentSettings.system, ...body.system },
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
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
