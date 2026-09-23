import { prisma } from '@/lib/prisma';

const SITE_SETTINGS_KEY = 'site_settings';

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

// Read settings from the PlatformConfig table, merged with defaults so a
// settings record saved before a new category existed still returns that
// category's defaults instead of `undefined`.
export async function readSettings(): Promise<SiteSettings> {
  try {
    const record = await prisma.platformConfig.findUnique({
      where: { key: SITE_SETTINGS_KEY },
    });
    if (record) {
      const data = JSON.parse(record.value);
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

export async function writeSettings(settings: SiteSettings): Promise<boolean> {
  try {
    const value = JSON.stringify(settings);
    await prisma.platformConfig.upsert({
      where: { key: SITE_SETTINGS_KEY },
      create: {
        key: SITE_SETTINGS_KEY,
        value,
        category: 'general',
        description: 'Site settings (general/orders/system/carousel config)',
      },
      update: { value },
    });
    return true;
  } catch (error) {
    console.error('Error writing settings:', error);
    return false;
  }
}
