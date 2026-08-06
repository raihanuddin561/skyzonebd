import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'site-settings.json');

export const defaultSettings = {
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
  carousel: {
    autoplayEnabled: true,
    autoplaySpeed: 5, // seconds between slides
    transitionEffect: 'fade' as 'fade' | 'slide',
    pauseOnHover: true,
    showArrows: true,
    showDots: true,
    showCounter: true,
  },
};

export type SiteSettings = typeof defaultSettings;

function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Read settings from file, merged with defaults so a settings file saved
// before a new category existed still returns that category's defaults
// instead of `undefined`.
export function readSettings(): SiteSettings {
  try {
    ensureDataDir();
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      return {
        general: { ...defaultSettings.general, ...data.general },
        orders: { ...defaultSettings.orders, ...data.orders },
        system: { ...defaultSettings.system, ...data.system },
        carousel: { ...defaultSettings.carousel, ...data.carousel },
      };
    }
    return defaultSettings;
  } catch (error) {
    console.error('Error reading settings:', error);
    return defaultSettings;
  }
}

export function writeSettings(settings: SiteSettings): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing settings:', error);
    return false;
  }
}
