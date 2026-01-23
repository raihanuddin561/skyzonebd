// types/cart.ts

export interface Product {
  id: string | number; // Support both string (cuid) and number for compatibility
  name: string;
  price: number;
  minOrderQuantity?: number; // Optional - admin can choose not to set MOQ
  companyName: string;
  imageUrl: string;
  unit?: string; // Unit of measurement (piece, kg, liter, box, etc.)
  // Enhanced fields for product pages
  description?: string;
  category?: string;
  subcategory?: string;
  images?: string[];
  imageUrls?: string[]; // API returns imageUrls
  specifications?: { [key: string]: string };
  stock?: number;
  availability?: 'in_stock' | 'out_of_stock' | 'limited';
  brand?: string;
  rating?: number;
  reviews?: number;
  tags?: string[];
  companyId?: string;
  companyLogo?: string;
  companyLocation?: string;
  companyVerified?: boolean;
  discount?: number;
  bulkPricing?: { quantity: number; price: number }[];
  leadTime?: string;
  shippingInfo?: string;
  returnPolicy?: string;
  warranty?: string;
  certifications?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  addBulkToCart: (items: { productId: string; quantity: number }[]) => Promise<{ success: boolean; data?: any; error?: string }>;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isLoaded: boolean;
}
