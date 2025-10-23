// types/cart.ts

export interface Product {
  id: number;
  name: string;
  price: number;
  minOrderQuantity: number;
  companyName: string;
  imageUrl: string;
  // Enhanced fields for product pages
  description?: string;
  category?: string;
  subcategory?: string;
  images?: string[];
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
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  isLoaded: boolean;
}
