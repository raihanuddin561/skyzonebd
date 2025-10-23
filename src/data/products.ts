// data/products.ts
import { Product } from '@/types/cart';

export const categories = [
  { id: 'electronics', name: 'Electronics', icon: '📱' },
  { id: 'baby-items', name: 'Baby Items', icon: '👶' },
  { id: 'clothing', name: 'Clothing & Apparel', icon: '👗' },
  { id: 'home-garden', name: 'Home & Garden', icon: '🏠' },
  { id: 'sports', name: 'Sports & Recreation', icon: '⚽' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'industrial', name: 'Industrial Equipment', icon: '🏭' },
  { id: 'office', name: 'Office Supplies', icon: '🏢' },
];

export const allProducts: Product[] = [
  // Electronics
  {
    id: 1,
    name: "JR-OH1 Bluetooth Headphone",
    price: 2500.00,
    minOrderQuantity: 10,
    companyName: "S Tech Electronics",
    imageUrl: "/images/products/electronics/headphones/JR-OH1-Bluetooth-Headphone.webp",
    description: "Professional wireless Bluetooth headphones with superior sound quality and long battery life. Perfect for retail and wholesale distribution.",
    category: "electronics",
    subcategory: "headphones",
    images: [
      "/images/products/electronics/headphones/JR-OH1-Bluetooth-Headphone.webp",
    ],
    specifications: {
      "Battery Life": "20 hours",
      "Charging Time": "2 hours",
      "Bluetooth Version": "5.0",
      "Range": "10 meters",
      "Weight": "250g",
      "Frequency Response": "20Hz-20kHz"
    },
    stock: 500,
    availability: "in_stock",
    brand: "JR Audio",
    rating: 4.5,
    reviews: 128,
    tags: ["wireless", "bluetooth", "headphones", "audio"],
    companyId: "stech001",
    companyLogo: "/images/companies/stech-logo.png",
    companyLocation: "Dhaka, Bangladesh",
    companyVerified: true,
    discount: 5,
    bulkPricing: [
      { quantity: 10, price: 2500 },
      { quantity: 50, price: 2350 },
      { quantity: 100, price: 2200 },
      { quantity: 500, price: 2000 }
    ],
    leadTime: "3-5 business days",
    shippingInfo: "Free shipping on orders over ৳50,000",
    returnPolicy: "30 days return policy",
    warranty: "1 year manufacturer warranty",
    certifications: ["CE", "FCC", "RoHS"],
    createdAt: "2024-01-15",
    updatedAt: "2024-07-10"
  },
  
  // Baby Items - Clothing
  {
    id: 2,
    name: "Baby Frock - Cotton Dress",
    price: 390.00,
    minOrderQuantity: 5,
    companyName: "Kuttush Baby Shop",
    imageUrl: "/images/products/baby-items/dress/baby-frock-1.jpg",
    description: "Soft cotton baby frock with beautiful designs. Perfect for daily wear and special occasions. Available in multiple colors and sizes.",
    category: "baby-items",
    subcategory: "clothing",
    images: [
      "/images/products/baby-items/dress/baby-frock-1.jpg",
    ],
    specifications: {
      "Material": "100% Cotton",
      "Sizes Available": "3-6M, 6-12M, 12-18M, 18-24M",
      "Colors": "Pink, Blue, Yellow, White",
      "Care Instructions": "Machine washable",
      "Origin": "Bangladesh"
    },
    stock: 200,
    availability: "in_stock",
    brand: "SkyzoneBD",
    rating: 4.8,
    reviews: 85,
    tags: ["baby", "clothing", "cotton", "dress", "frock"],
    companyId: "skyzonebd001",
    companyLogo: "/images/companies/skyzonebd-logo.png",
    companyLocation: "Chittagong, Bangladesh",
    companyVerified: true,
    discount: 10,
    bulkPricing: [
      { quantity: 5, price: 390 },
      { quantity: 20, price: 370 },
      { quantity: 50, price: 350 },
      { quantity: 100, price: 320 }
    ],
    leadTime: "2-3 business days",
    shippingInfo: "Free shipping on orders over ৳10,000",
    returnPolicy: "15 days return policy",
    warranty: "Quality guarantee",
    certifications: ["OEKO-TEX", "GOTS"],
    createdAt: "2024-02-20",
    updatedAt: "2024-07-12"
  },
  
  {
    id: 3,
    name: "Sleeveless Korean Style Baby Dress",
    price: 1380.00,
    minOrderQuantity: 1,
    companyName: "Kuttush Baby Shop",
    imageUrl: "/images/products/baby-items/dress/sleeveless-baby-dress.jpg",
    description: "Trendy Korean-style sleeveless baby dress made from premium materials. Perfect for summer seasons and special occasions.",
    category: "baby-items",
    subcategory: "clothing",
    images: [
      "/images/products/baby-items/dress/sleeveless-baby-dress.jpg",
    ],
    specifications: {
      "Material": "Cotton Blend",
      "Sizes Available": "6-12M, 12-18M, 18-24M, 2-3Y",
      "Colors": "Pink, White, Mint Green",
      "Style": "Korean Fashion",
      "Season": "Summer",
      "Care Instructions": "Hand wash recommended"
    },
    stock: 50,
    availability: "limited",
    brand: "SkyzoneBD Premium",
    rating: 4.9,
    reviews: 42,
    tags: ["baby", "dress", "korean", "summer", "premium"],
    companyId: "skyzonebd001",
    companyLogo: "/images/companies/skyzonebd-logo.png",
    companyLocation: "Chittagong, Bangladesh",
    companyVerified: true,
    discount: 15,
    bulkPricing: [
      { quantity: 1, price: 1380 },
      { quantity: 5, price: 1300 },
      { quantity: 10, price: 1250 },
      { quantity: 25, price: 1200 }
    ],
    leadTime: "1-2 business days",
    shippingInfo: "Express delivery available",
    returnPolicy: "7 days return policy",
    warranty: "Quality guarantee",
    certifications: ["OEKO-TEX"],
    createdAt: "2024-03-10",
    updatedAt: "2024-07-15"
  },
  
  // Baby Items - Toys
  {
    id: 4,
    name: "Educational Puzzle Game for Kids",
    price: 780.00,
    minOrderQuantity: 2,
    companyName: "Kuttush Baby Shop",
    imageUrl: "/images/products/baby-items/toys/puzzle-game.webp",
    description: "Educational puzzle game designed to enhance cognitive development in children. Safe, colorful, and engaging for kids aged 3-8 years.",
    category: "baby-items",
    subcategory: "toys",
    images: [
      "/images/products/baby-items/toys/puzzle-game.webp",
    ],
    specifications: {
      "Age Range": "3-8 years",
      "Material": "Non-toxic ABS Plastic",
      "Dimensions": "25cm x 20cm x 3cm",
      "Pieces": "48 pieces",
      "Educational Value": "Problem solving, motor skills",
      "Safety Standards": "CE certified"
    },
    stock: 150,
    availability: "in_stock",
    brand: "EduPlay",
    rating: 4.7,
    reviews: 67,
    tags: ["educational", "puzzle", "kids", "toy", "learning"],
    companyId: "kuttush001",
    companyLogo: "/images/companies/kuttush-logo.png",
    companyLocation: "Chittagong, Bangladesh",
    companyVerified: true,
    discount: 8,
    bulkPricing: [
      { quantity: 2, price: 780 },
      { quantity: 10, price: 750 },
      { quantity: 25, price: 720 },
      { quantity: 50, price: 680 }
    ],
    leadTime: "2-4 business days",
    shippingInfo: "Standard shipping",
    returnPolicy: "30 days return policy",
    warranty: "6 months warranty",
    certifications: ["CE", "ASTM", "CPSIA"],
    createdAt: "2024-01-25",
    updatedAt: "2024-07-08"
  },
  
  // Additional Electronics Products
  {
    id: 5,
    name: "Wireless Gaming Mouse",
    price: 1800.00,
    minOrderQuantity: 12,
    companyName: "TechPro Solutions",
    imageUrl: "/images/products/electronics/mouse/gaming-mouse.jpg",
    description: "High-performance wireless gaming mouse with RGB lighting and programmable buttons. Perfect for gaming enthusiasts and professional use.",
    category: "electronics",
    subcategory: "computer-accessories",
    images: [
      "/images/products/electronics/mouse/gaming-mouse.jpg",
    ],
    specifications: {
      "DPI": "Up to 16,000",
      "Buttons": "8 programmable buttons",
      "Battery Life": "70 hours",
      "Connectivity": "2.4GHz wireless + USB-C",
      "Weight": "85g",
      "Sensor": "Optical sensor"
    },
    stock: 300,
    availability: "in_stock",
    brand: "GamePro",
    rating: 4.6,
    reviews: 156,
    tags: ["gaming", "mouse", "wireless", "rgb", "computer"],
    companyId: "techpro001",
    companyLogo: "/images/companies/techpro-logo.png",
    companyLocation: "Dhaka, Bangladesh",
    companyVerified: true,
    discount: 12,
    bulkPricing: [
      { quantity: 12, price: 1800 },
      { quantity: 50, price: 1650 },
      { quantity: 100, price: 1500 },
      { quantity: 250, price: 1350 }
    ],
    leadTime: "3-5 business days",
    shippingInfo: "Free shipping on orders over ৳30,000",
    returnPolicy: "15 days return policy",
    warranty: "2 years warranty",
    certifications: ["CE", "FCC"],
    createdAt: "2024-04-05",
    updatedAt: "2024-07-14"
  },
  
  // Clothing Products
  {
    id: 6,
    name: "Men's Business Formal Shirt",
    price: 1200.00,
    minOrderQuantity: 20,
    companyName: "Fashion House BD",
    imageUrl: "/images/products/clothing/shirts/formal-shirt.jpg",
    description: "Premium quality men's formal shirt perfect for business and professional settings. Available in multiple colors and sizes.",
    category: "clothing",
    subcategory: "shirts",
    images: [
      "/images/products/clothing/shirts/formal-shirt.jpg",
    ],
    specifications: {
      "Material": "100% Cotton",
      "Sizes": "S, M, L, XL, XXL",
      "Colors": "White, Blue, Black, Grey",
      "Fit": "Regular fit",
      "Collar": "Spread collar",
      "Cuff": "Barrel cuff"
    },
    stock: 500,
    availability: "in_stock",
    brand: "Executive",
    rating: 4.4,
    reviews: 89,
    tags: ["formal", "shirt", "business", "cotton", "men"],
    companyId: "fashion001",
    companyLogo: "/images/companies/fashion-logo.png",
    companyLocation: "Dhaka, Bangladesh",
    companyVerified: true,
    discount: 20,
    bulkPricing: [
      { quantity: 20, price: 1200 },
      { quantity: 50, price: 1100 },
      { quantity: 100, price: 1000 },
      { quantity: 200, price: 900 }
    ],
    leadTime: "5-7 business days",
    shippingInfo: "Free shipping on orders over ৳25,000",
    returnPolicy: "30 days return policy",
    warranty: "Quality guarantee",
    certifications: ["OEKO-TEX"],
    createdAt: "2024-03-15",
    updatedAt: "2024-07-11"
  },
  
  // Home & Garden
  {
    id: 7,
    name: "LED Desk Lamp with USB Charging",
    price: 2200.00,
    minOrderQuantity: 8,
    companyName: "Home Essentials",
    imageUrl: "/images/products/home-garden/lighting/desk-lamp.jpg",
    description: "Modern LED desk lamp with adjustable brightness, USB charging port, and touch controls. Perfect for office and home use.",
    category: "home-garden",
    subcategory: "lighting",
    images: [
      "/images/products/home-garden/lighting/desk-lamp.jpg",
    ],
    specifications: {
      "Light Source": "LED",
      "Power": "12W",
      "Brightness": "3 levels adjustable",
      "USB Ports": "2 USB charging ports",
      "Material": "Aluminum alloy",
      "Color Temperature": "3000K-6500K"
    },
    stock: 120,
    availability: "in_stock",
    brand: "LightPro",
    rating: 4.7,
    reviews: 94,
    tags: ["led", "desk", "lamp", "usb", "office", "home"],
    companyId: "home001",
    companyLogo: "/images/companies/home-logo.png",
    companyLocation: "Chittagong, Bangladesh",
    companyVerified: true,
    discount: 15,
    bulkPricing: [
      { quantity: 8, price: 2200 },
      { quantity: 20, price: 2000 },
      { quantity: 50, price: 1850 },
      { quantity: 100, price: 1700 }
    ],
    leadTime: "4-6 business days",
    shippingInfo: "Standard shipping",
    returnPolicy: "25 days return policy",
    warranty: "1 year warranty",
    certifications: ["CE", "RoHS"],
    createdAt: "2024-05-20",
    updatedAt: "2024-07-13"
  },
  
  // Industrial Equipment
  {
    id: 8,
    name: "Digital Weighing Scale - 500kg Capacity",
    price: 18500.00,
    minOrderQuantity: 2,
    companyName: "Industrial Solutions Ltd",
    imageUrl: "/images/products/industrial/scales/weighing-scale.jpg",
    description: "Heavy-duty digital weighing scale with 500kg capacity. Perfect for industrial and commercial use with high precision measurement.",
    category: "industrial",
    subcategory: "weighing-equipment",
    images: [
      "/images/products/industrial/scales/weighing-scale.jpg",
    ],
    specifications: {
      "Capacity": "500kg",
      "Accuracy": "±50g",
      "Platform Size": "60cm x 80cm",
      "Display": "LED digital display",
      "Power": "AC/DC adapter",
      "Calibration": "External calibration"
    },
    stock: 25,
    availability: "in_stock",
    brand: "PrecisionTech",
    rating: 4.8,
    reviews: 34,
    tags: ["industrial", "weighing", "scale", "heavy-duty", "precision"],
    companyId: "industrial001",
    companyLogo: "/images/companies/industrial-logo.png",
    companyLocation: "Dhaka, Bangladesh",
    companyVerified: true,
    discount: 5,
    bulkPricing: [
      { quantity: 2, price: 18500 },
      { quantity: 5, price: 17500 },
      { quantity: 10, price: 16500 },
      { quantity: 20, price: 15500 }
    ],
    leadTime: "7-10 business days",
    shippingInfo: "Free installation and setup",
    returnPolicy: "45 days return policy",
    warranty: "2 years warranty",
    certifications: ["ISO", "CE", "OIML"],
    createdAt: "2024-06-01",
    updatedAt: "2024-07-16"
  }
];

export const featuredProducts = allProducts.slice(0, 4);

export const getProductsByCategory = (category: string) => {
  return allProducts.filter(product => product.category === category);
};

export const getProductById = (id: number) => {
  return allProducts.find(product => product.id === id);
};

export const searchProducts = (query: string) => {
  const lowercaseQuery = query.toLowerCase();
  return allProducts.filter(product => 
    product.name.toLowerCase().includes(lowercaseQuery) ||
    product.description?.toLowerCase().includes(lowercaseQuery) ||
    product.category?.toLowerCase().includes(lowercaseQuery) ||
    product.companyName.toLowerCase().includes(lowercaseQuery) ||
    product.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};
