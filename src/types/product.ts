// types/product.ts

export interface Product {
  id: number;
  name: string;
  description: string;
  
  // B2C Pricing
  price: number;                    // Same as retailPrice (for backward compatibility)
  retailPrice: number;              // Standard retail price
  salePrice?: number;               // Sale/promotional price for retail
  retailMOQ: number;                // Minimum order quantity for retail (usually 1)
  
  // B2B Pricing
  wholesaleEnabled: boolean;        // Is wholesale purchasing available?
  wholesaleMOQ?: number;            // Minimum order quantity for wholesale
  baseWholesalePrice?: number;      // Base wholesale price
  wholesaleTiers?: WholesaleTier[]; // Tiered pricing for bulk orders
  
  // Legacy field
  originalPrice?: number;
  bulkPricing?: BulkPricing[];      // Deprecated, use wholesaleTiers
  
  category: string;
  image: string;
  images: string[];
  inStock: boolean;
  stockQuantity: number;
  minOrderQuantity: number;         // Default MOQ
  maxOrderQuantity: number;
  unit: string;
  sku: string;
  brand: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  specifications: { [key: string]: string };
  tags: string[];
  shippingInfo: ShippingInfo;
  returnPolicy: string;
  warranty: string;
  certifications: string[];
  countryOfOrigin: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WholesaleTier {
  minQuantity: number;
  maxQuantity: number | null;       // null means unlimited
  price: number;
  discount: number;                 // Percentage discount from retail
}

export interface BulkPricing {
  minQuantity: number;
  maxQuantity: number;
  price: number;
  discount: number;
}

export interface ShippingInfo {
  freeShipping: boolean;
  shippingCost: number;
  estimatedDelivery: string;
  availableRegions: string[];
}

export interface Category {
  id: number;
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
  id: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
  verified: boolean;
}

export interface Company {
  id: number;
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
