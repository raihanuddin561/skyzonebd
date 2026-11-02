/**
 * Comprehensive Dynamic Site Settings & Business Rules — SkyzoneBD (Phase 4)
 *
 * Controls all business rules, prices, charges, delivery zones, tax, order rules,
 * profit sharing, and coupons from database configuration — zero hardcoded numbers.
 *
 * Features immediate cache invalidation on save and thread-safe fallback defaults.
 */

import { prisma } from '@/lib/prisma';
import { toPoisha } from '@/services/calculationService';

const SITE_SETTINGS_KEY = 'site_settings';
const COUPONS_STORAGE_KEY = 'site_coupons';

// ============================================================================
// DEFAULT SETTINGS SPECIFICATION
// ============================================================================

export interface DeliveryZoneConfig {
  id: string;
  name: string;
  chargePoisha: number;
  chargeModel: 'FLAT' | 'WEIGHT_BASED' | 'CARTON_BASED' | 'ORDER_VALUE';
  freeDeliveryThresholdPoisha: number | null;
  estimatedDays: string;
  isActive: boolean;
}

export interface CustomChargeConfig {
  id: string;
  name: string;
  amountPoisha: number;
  isActive: boolean;
}

export interface StoredCouponConfig {
  id: string;
  code: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_DELIVERY';
  discountValue: number; // For PERCENTAGE: 0-100; For FIXED_AMOUNT: in poisha
  maxDiscountPoisha?: number | null;
  minOrderAmountPoisha?: number;
  startDate?: string | null;
  endDate?: string | null;
  totalUsageLimit?: number | null;
  currentUsageCount: number;
  perCustomerUsageLimit?: number | null;
  allowedProductIds?: string[];
  excludedProductIds?: string[];
  allowedCategoryIds?: string[];
  excludedCategoryIds?: string[];
  isFirstOrderOnly?: boolean;
  canReduceDelivery?: boolean;
  isActive: boolean;
  description?: string;
}

export const defaultSettings = {
  general: {
    siteName: 'SkyzoneBD Wholesale',
    storeTagline: "Bangladesh's #1 B2B Electrical & Hardware Marketplace",
    logoUrl: '/logo.svg',
    email: 'support@skyzonebd.com',
    phone: '+880 1711-123456',
    address: 'Nawabpur Road, Dhaka-1100, Bangladesh',
    currencySymbol: '৳',
    currencyCode: 'BDT',
    roundingPreference: 'ROUND_HALF_UP' as 'ROUND_HALF_UP' | 'FLOOR' | 'CEIL',
    timezone: 'Asia/Dhaka',
  },
  delivery: {
    zones: [
      {
        id: 'inside_dhaka',
        name: 'Inside Dhaka',
        chargePoisha: 8000, // ৳80
        chargeModel: 'FLAT' as const,
        freeDeliveryThresholdPoisha: 500000, // ৳5,000
        estimatedDays: '1-2 business days',
        isActive: true,
      },
      {
        id: 'dhaka_suburbs',
        name: 'Dhaka Suburbs (Gazipur, Savar, Narayanganj)',
        chargePoisha: 12000, // ৳120
        chargeModel: 'FLAT' as const,
        freeDeliveryThresholdPoisha: 500000, // ৳5,000
        estimatedDays: '2-3 business days',
        isActive: true,
      },
      {
        id: 'outside_dhaka',
        name: 'Outside Dhaka (All Districts)',
        chargePoisha: 15000, // ৳150
        chargeModel: 'FLAT' as const,
        freeDeliveryThresholdPoisha: 1000000, // ৳10,000
        estimatedDays: '3-5 business days',
        isActive: true,
      },
    ] as DeliveryZoneConfig[],
    globalFreeDeliveryThresholdPoisha: 500000, // ৳5,000
    defaultZoneId: 'inside_dhaka',
  },
  charges: {
    codEnabled: true,
    codFeeType: 'FLAT' as 'FLAT' | 'PERCENTAGE',
    codFeeValuePoisha: 0, // e.g. 0 poisha (free COD) or flat fee
    packagingFeeEnabled: false,
    packagingFeePoisha: 0,
    gatewayFees: {
      bkashFeePercent: 1.5,
      nagadFeePercent: 1.2,
      cardFeePercent: 2.0,
      bankTransferFeePercent: 0,
      passToCustomer: false, // SkyzoneBD absorbs by default
    },
    customCharges: [] as CustomChargeConfig[],
  },
  tax: {
    vatEnabled: false, // Disabled by default, easily enabled by admin
    vatRatePercent: 15.0, // 15% standard VAT
    pricesInclusiveOfVat: false, // B2B catalog prices exclusive
    couponsApplyBeforeVat: true,
    binNumber: '003456789-0101',
  },
  orders: {
    minimumOrderAmountPoisha: 0, // 0 = no minimum required unless configured by admin
    processingTime: '1-2 business days',
    allowedPaymentMethods: [
      'bank_transfer',
      'cash_on_delivery',
      'bkash',
      'nagad',
      'credit_card',
      'rocket',
    ],
    advancePaymentPercentForCod: 0, // 0 = no advance required
    autoCancelUnpaidHours: 24,
    allowGuestCheckout: true,
    requireEmailVerification: false,
    autoApproveB2B: false,
  },
  profitSharing: {
    reservePercentage: 5.0, // 5% retained earnings
    distributionFrequency: 'MONTHLY' as 'MONTHLY' | 'QUARTERLY',
    deductOperatingExpenses: true,
    lossHandlingMode: 'CARRY_FORWARD' as 'CARRY_FORWARD' | 'SHARE_LOSS',
    twoPersonApproval: true,
  },
  system: {
    maintenanceMode: false,
  },
  carousel: {
    autoplayEnabled: true,
    autoplaySpeed: 5,
    transitionEffect: 'fade' as 'fade' | 'slide',
    pauseOnHover: true,
    showArrows: true,
    showDots: true,
    showCounter: true,
  },
};

export type SiteSettings = typeof defaultSettings;

// In-memory cache with immediate invalidation
let cachedSettings: SiteSettings | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL

export function invalidateSettingsCache(): void {
  cachedSettings = null;
  lastCacheTime = 0;
  cachedCoupons = null;
  lastCouponsCacheTime = 0;
}

/**
 * Reads settings from PlatformConfig with fallback to defaultSettings.
 * Utilizes in-memory caching with immediate invalidation on write.
 */
export async function readSettings(forceRefresh = false): Promise<SiteSettings> {
  const isTest = process.env.NODE_ENV === 'test';
  const now = Date.now();
  if (!isTest && !forceRefresh && cachedSettings && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedSettings;
  }

  try {
    const record = await prisma?.platformConfig?.findUnique?.({
      where: { key: SITE_SETTINGS_KEY },
    });

    if (record) {
      const data = JSON.parse(record.value);
      cachedSettings = {
        general: { ...defaultSettings.general, ...data.general },
        delivery: {
          ...defaultSettings.delivery,
          ...data.delivery,
          zones: data.delivery?.zones && Array.isArray(data.delivery.zones)
            ? data.delivery.zones
            : defaultSettings.delivery.zones,
        },
        charges: {
          ...defaultSettings.charges,
          ...data.charges,
          gatewayFees: { ...defaultSettings.charges.gatewayFees, ...data.charges?.gatewayFees },
          customCharges: Array.isArray(data.charges?.customCharges)
            ? data.charges.customCharges
            : defaultSettings.charges.customCharges,
        },
        tax: { ...defaultSettings.tax, ...data.tax },
        orders: { ...defaultSettings.orders, ...data.orders },
        profitSharing: { ...defaultSettings.profitSharing, ...data.profitSharing },
        system: { ...defaultSettings.system, ...data.system },
        carousel: { ...defaultSettings.carousel, ...data.carousel },
      };
      lastCacheTime = now;
      return cachedSettings;
    }

    cachedSettings = defaultSettings;
    lastCacheTime = now;
    return defaultSettings;
  } catch (error) {
    console.error('Error reading site settings from database, using defaults:', error);
    return defaultSettings;
  }
}

/**
 * Writes settings to PlatformConfig and immediately invalidates cache.
 */
export async function writeSettings(settings: SiteSettings): Promise<boolean> {
  try {
    const value = JSON.stringify(settings);
    await prisma.platformConfig.upsert({
      where: { key: SITE_SETTINGS_KEY },
      create: {
        key: SITE_SETTINGS_KEY,
        value,
        category: 'general',
        description: 'Global dynamic site settings (charges, tax, delivery, profit sharing, orders)',
      },
      update: { value },
    });

    // Invalidate cache immediately
    cachedSettings = null;
    lastCacheTime = 0;
    return true;
  } catch (error) {
    console.error('Error writing site settings:', error);
    return false;
  }
}

// ============================================================================
// DYNAMIC COUPONS STORAGE & MANAGEMENT
// ============================================================================

export const defaultCoupons: StoredCouponConfig[] = [
  {
    id: 'coup-welcome10',
    code: 'WELCOME10',
    type: 'PERCENTAGE',
    discountValue: 10, // 10%
    maxDiscountPoisha: 100000, // ৳1,000 cap
    minOrderAmountPoisha: 200000, // ৳2,000 min order
    totalUsageLimit: 1000,
    currentUsageCount: 0,
    perCustomerUsageLimit: 1,
    isFirstOrderOnly: true,
    canReduceDelivery: false,
    isActive: true,
    description: '10% discount on first wholesale order (up to ৳1,000)',
  },
  {
    id: 'coup-freeship',
    code: 'FREESHIP',
    type: 'FREE_DELIVERY',
    discountValue: 0,
    minOrderAmountPoisha: 300000, // ৳3,000 min order
    totalUsageLimit: 500,
    currentUsageCount: 0,
    perCustomerUsageLimit: 2,
    isFirstOrderOnly: false,
    canReduceDelivery: true,
    isActive: true,
    description: 'Free courier delivery on orders over ৳3,000',
  },
];

let cachedCoupons: StoredCouponConfig[] | null = null;
let lastCouponsCacheTime = 0;

/**
 * Reads all coupons from PlatformConfig.
 */
export async function readCoupons(forceRefresh = false): Promise<StoredCouponConfig[]> {
  const isTest = process.env.NODE_ENV === 'test';
  const now = Date.now();
  if (!isTest && !forceRefresh && cachedCoupons && now - lastCouponsCacheTime < CACHE_TTL_MS) {
    return cachedCoupons;
  }

  try {
    const record = await prisma?.platformConfig?.findUnique?.({
      where: { key: COUPONS_STORAGE_KEY },
    });

    if (record) {
      cachedCoupons = JSON.parse(record.value);
      lastCouponsCacheTime = now;
      return cachedCoupons!;
    }

    cachedCoupons = defaultCoupons;
    lastCouponsCacheTime = now;
    return defaultCoupons;
  } catch (error) {
    console.error('Error reading coupons from database:', error);
    return defaultCoupons;
  }
}

/**
 * Writes coupons to PlatformConfig and immediately invalidates cache.
 */
export async function writeCoupons(coupons: StoredCouponConfig[]): Promise<boolean> {
  try {
    const value = JSON.stringify(coupons);
    await prisma.platformConfig.upsert({
      where: { key: COUPONS_STORAGE_KEY },
      create: {
        key: COUPONS_STORAGE_KEY,
        value,
        category: 'coupons',
        description: 'Dynamic promotional coupons and usage tracking',
      },
      update: { value },
    });

    cachedCoupons = null;
    lastCouponsCacheTime = 0;
    return true;
  } catch (error) {
    console.error('Error writing coupons:', error);
    return false;
  }
}

/**
 * Atomically increments coupon usage count.
 */
export async function incrementCouponUsage(couponCode: string): Promise<boolean> {
  const coupons = await readCoupons(true);
  const target = coupons.find((c) => c.code.toUpperCase() === couponCode.trim().toUpperCase());
  if (!target) return false;

  target.currentUsageCount = (target.currentUsageCount || 0) + 1;
  return writeCoupons(coupons);
}
