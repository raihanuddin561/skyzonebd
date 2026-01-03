// types/product.ts - WHOLESALE ONLY

export interface Product {
  id: string | number;
  name: string;
  description: string;
  
  // WHOLESALE PRICING ONLY
  basePrice: number;                // Cost price
  wholesalePrice: number;           // Selling price to wholesale customers
  moq: number;                      // Minimum order quantity (default 10+)
  wholesaleTiers?: WholesaleTier[]; // Volume-based tiered pricing
  
  // Profit Configuration
  platformProfitPercentage: number; // Admin-set platform profit %
  calculatedProfit?: number;        // Auto-calculated profit
  sellerProfit?: number;            // Seller/partner profit share
  
  // Inventory Management
  stockQuantity: number;
  reorderLevel: number;             // Alert when stock reaches this level
  reorderQuantity: number;          // Suggested reorder quantity
  availability: string;             // in_stock, limited, out_of_stock, pre_order
  sku: string;
  batchNumber?: string;             // For batch tracking
  expiryDate?: Date;                // For perishable goods
  
  // Cost Tracking
  costPerUnit?: number;             // Actual cost per unit
  shippingCost?: number;            // Shipping cost per unit
  handlingCost?: number;            // Handling/storage cost per unit
  
  // Seller Information
  sellerId?: string;                // Partner/supplier
  sellerCommissionPercentage?: number; // Partner's commission %
  
  // Product Details
  category: string;
  image: string;
  images: string[];
  unit: string;                     // piece, kg, liter, etc.
  brand: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  specifications: { [key: string]: string };
  tags: string[];
  
  // Wholesale Features
  allowSamples: boolean;            // Allow sample orders
  sampleMOQ: number;                // MOQ for samples
  samplePrice?: number;             // Price per sample unit
  customizationAvailable: boolean;  // Can be customized
  
  // Shipping & Logistics
  shippingInfo: ShippingInfo;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  
  // Policies
  returnPolicy: string;
  warranty: string;
  certifications: string[];
  countryOfOrigin: string;
  
  // Metadata
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Legacy fields for backward compatibility
  price?: number;                   // Maps to wholesalePrice
  minOrderQuantity?: number;        // Maps to moq
  maxOrderQuantity?: number;
  inStock?: boolean;
}

export interface WholesaleTier {
  minQuantity: number;
  maxQuantity: number | null;       // null means unlimited/highest tier
  price: number;
  discount: number;                 // Percentage discount from base wholesale price
  profitMargin?: number;            // Profit margin % at this tier
}

export interface ShippingInfo {
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
  availableRegions: string[];
  bulkShippingDiscount?: boolean;   // Discount for bulk orders
}

export interface Category {
  id: string | number; // Support both string (cuid) and number for compatibility
  name: string;
  description: string;
  image: string;
  productCount: number;
  featured: boolean;
  parentId?: number;
  subcategories?: Category[];
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  rating?: number;
  inStock?: boolean;
  sortBy?: 'price' | 'name' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Review {
  id: string | number;
  userId: string | number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

export interface Company {
  id: string | number;
  name: string;
  type: string;
  verified: boolean;
  description?: string;
  location?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  establishedYear?: number;
  employeeCount?: string;
  certifications?: string[];
  rating?: number;
  reviewCount?: number;
}
