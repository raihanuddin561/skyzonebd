import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (optional - comment out in production)
  await prisma.orderItem.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.rFQItem.deleteMany();
  await prisma.rFQ.deleteMany();
  await prisma.wholesaleTier.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.businessInfo.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned existing data');

  // Create Admin User (Wholesale-only platform)
  const hashedPassword = await hash('11admin22', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@skyzonebd.com',
      name: 'Admin User',
      phone: '+880-1700-000000',
      password: hashedPassword,
      role: 'ADMIN',
      userType: 'WHOLESALE',
      isActive: true,
      isVerified: true,
    },
  });
  console.log('✅ Created admin user');

  // Create Sample Wholesale User (Small Business)
  const retailUser = await prisma.user.create({
    data: {
      email: 'customer@example.com',
      name: 'Small Business Owner',
      phone: '+880-1711-111111',
      companyName: 'ABC Retail Store',
      password: hashedPassword,
      role: 'BUYER',
      userType: 'WHOLESALE',
      isActive: true,
      isVerified: true,
      businessInfo: {
        create: {
          companyType: 'Retailer',
          registrationNumber: 'BD-REG-2024-002',
          taxId: 'TIN-987654321',
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        },
      },
    },
  });

  // Create Sample Wholesale User
  const wholesaleUser = await prisma.user.create({
    data: {
      email: 'wholesale@example.com',
      name: 'Ahmed Khan',
      phone: '+880-1722-222222',
      companyName: 'Khan Trading Co.',
      password: hashedPassword,
      role: 'BUYER',
      userType: 'WHOLESALE',
      isActive: true,
      isVerified: true,
      businessInfo: {
        create: {
          companyType: 'Distributor',
          registrationNumber: 'BD-REG-2024-001',
          taxId: 'TIN-123456789',
          website: 'www.khantrading.com',
          verificationStatus: 'APPROVED',
          verifiedAt: new Date(),
        },
      },
    },
  });
  console.log('✅ Created sample users');

  // Create Categories
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      imageUrl: 'https://placeholder.vercel-storage.com/categories/electronics.jpg',
      isActive: true,
    },
  });

  const babyItemsCategory = await prisma.category.create({
    data: {
      name: 'Baby Items',
      slug: 'baby-items',
      description: 'Products for babies and toddlers',
      imageUrl: 'https://placeholder.vercel-storage.com/categories/baby-items.jpg',
      isActive: true,
    },
  });

  const fashionCategory = await prisma.category.create({
    data: {
      name: 'Fashion',
      slug: 'fashion',
      description: 'Clothing and fashion accessories',
      imageUrl: 'https://placeholder.vercel-storage.com/categories/fashion.jpg',
      isActive: true,
    },
  });

  const homeCategory = await prisma.category.create({
    data: {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home appliances and kitchen essentials',
      imageUrl: 'https://placeholder.vercel-storage.com/categories/home.jpg',
      isActive: true,
    },
  });

  console.log('✅ Created categories');

  // Create Products with Wholesale Tiers
  
  // Electronics Products
  const headphones = await prisma.product.create({
    data: {
      name: 'Wireless Bluetooth Headphones',
      slug: 'wireless-bluetooth-headphones',
      description: 'Premium wireless headphones with noise cancellation, 30-hour battery life, and superior sound quality. Perfect for music lovers and professionals.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/headphones-main.jpg',
      imageUrls: [
        'https://placeholder.vercel-storage.com/products/headphones-1.jpg',
        'https://placeholder.vercel-storage.com/products/headphones-2.jpg',
        'https://placeholder.vercel-storage.com/products/headphones-3.jpg',
      ],
      brand: 'SoundPro',
      tags: ['electronics', 'audio', 'wireless', 'bluetooth'],
      specifications: {
        'Battery Life': '30 hours',
        'Bluetooth Version': '5.0',
        'Weight': '250g',
        'Color': 'Black',
        'Warranty': '1 year',
      },
      basePrice: 2000,
      wholesalePrice: 2500,
      moq: 5,
      stockQuantity: 245,
      availability: 'in_stock',
      sku: 'ELEC-HEAD-001',
      categoryId: electronicsCategory.id,
      isActive: true,
      isFeatured: true,
      rating: 4.5,
      reviewCount: 128,
      wholesaleTiers: {
        create: [
          { minQuantity: 5, maxQuantity: 19, price: 2200, discount: 12 },
          { minQuantity: 20, maxQuantity: 49, price: 2000, discount: 20 },
          { minQuantity: 50, maxQuantity: null, price: 1800, discount: 28 },
        ],
      },
    },
  });

  const smartWatch = await prisma.product.create({
    data: {
      name: 'Smart Watch Pro Series 5',
      slug: 'smart-watch-pro-series-5',
      description: 'Advanced fitness tracker with heart rate monitor, GPS, sleep tracking, and 7-day battery life. Water-resistant and stylish design.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/smartwatch-main.jpg',
      imageUrls: [
        'https://placeholder.vercel-storage.com/products/smartwatch-1.jpg',
        'https://placeholder.vercel-storage.com/products/smartwatch-2.jpg',
      ],
      brand: 'TechFit',
      tags: ['electronics', 'wearable', 'fitness', 'smartwatch'],
      specifications: {
        'Display': '1.4 inch AMOLED',
        'Battery Life': '7 days',
        'Water Resistance': '5ATM',
        'Connectivity': 'Bluetooth 5.0',
        'Compatibility': 'iOS & Android',
      },
      basePrice: 3600,
      wholesalePrice: 4500,
      moq: 10,
      stockQuantity: 78,
      availability: 'in_stock',
      sku: 'ELEC-WATCH-002',
      categoryId: electronicsCategory.id,
      isActive: true,
      isFeatured: true,
      rating: 4.8,
      reviewCount: 256,
      wholesaleTiers: {
        create: [
          { minQuantity: 10, maxQuantity: 29, price: 4000, discount: 11 },
          { minQuantity: 30, maxQuantity: 99, price: 3800, discount: 16 },
          { minQuantity: 100, maxQuantity: null, price: 3500, discount: 22 },
        ],
      },
    },
  });

  const powerBank = await prisma.product.create({
    data: {
      name: '20000mAh Fast Charging Power Bank',
      slug: '20000mah-fast-charging-power-bank',
      description: 'High-capacity portable charger with dual USB ports, LED display, and fast charging support. Compatible with all smartphones and tablets.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/powerbank-main.jpg',
      brand: 'ChargeMax',
      tags: ['electronics', 'accessories', 'charging', 'portable'],
      specifications: {
        'Capacity': '20000mAh',
        'Input': '5V/2A',
        'Output': '5V/2.4A (x2)',
        'Weight': '350g',
        'Material': 'ABS Plastic',
      },
      basePrice: 850,
      wholesalePrice: 1200,
      moq: 10,
      stockQuantity: 450,
      availability: 'in_stock',
      sku: 'ELEC-PWR-003',
      categoryId: electronicsCategory.id,
      isActive: true,
      rating: 4.3,
      reviewCount: 89,
      wholesaleTiers: {
        create: [
          { minQuantity: 10, maxQuantity: 49, price: 1000, discount: 17 },
          { minQuantity: 50, maxQuantity: 199, price: 900, discount: 25 },
          { minQuantity: 200, maxQuantity: null, price: 800, discount: 33 },
        ],
      },
    },
  });

  // Baby Items
  const babyDressPink = await prisma.product.create({
    data: {
      name: 'Baby Girl Cotton Dress - Pink',
      slug: 'baby-girl-cotton-dress-pink',
      description: 'Soft and comfortable 100% cotton dress for baby girls. Perfect for special occasions and everyday wear. Available in multiple sizes.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/baby-dress-pink-main.jpg',
      imageUrls: [
        'https://placeholder.vercel-storage.com/products/baby-dress-pink-1.jpg',
        'https://placeholder.vercel-storage.com/products/baby-dress-pink-2.jpg',
      ],
      brand: 'BabyJoy',
      tags: ['baby', 'clothing', 'dress', 'cotton'],
      specifications: {
        'Material': '100% Cotton',
        'Sizes': '0-3M, 3-6M, 6-12M, 12-18M',
        'Care': 'Machine washable',
        'Color': 'Pink',
      },
      basePrice: 650,
      wholesalePrice: 850,
      moq: 12,
      stockQuantity: 156,
      availability: 'in_stock',
      sku: 'BABY-DRESS-001',
      categoryId: babyItemsCategory.id,
      isActive: true,
      rating: 4.7,
      reviewCount: 145,
      wholesaleTiers: {
        create: [
          { minQuantity: 12, maxQuantity: 35, price: 750, discount: 12 },
          { minQuantity: 36, maxQuantity: 71, price: 650, discount: 24 },
          { minQuantity: 72, maxQuantity: null, price: 600, discount: 29 },
        ],
      },
    },
  });

  const babyToy = await prisma.product.create({
    data: {
      name: 'Educational Baby Toy Set',
      slug: 'educational-baby-toy-set',
      description: 'Colorful and safe educational toy set for babies 6 months and up. Helps develop motor skills, colors recognition, and sensory development.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/baby-toy-main.jpg',
      brand: 'PlaySmart',
      tags: ['baby', 'toys', 'educational', 'development'],
      specifications: {
        'Age Range': '6M+',
        'Material': 'BPA-Free Plastic',
        'Pieces': '12 pieces',
        'Safety': 'CE Certified',
      },
      basePrice: 1100,
      wholesalePrice: 1500,
      moq: 6,
      stockQuantity: 89,
      availability: 'in_stock',
      sku: 'BABY-TOY-002',
      categoryId: babyItemsCategory.id,
      isActive: true,
      rating: 4.9,
      reviewCount: 203,
      wholesaleTiers: {
        create: [
          { minQuantity: 6, maxQuantity: 19, price: 1300, discount: 13 },
          { minQuantity: 20, maxQuantity: 49, price: 1200, discount: 20 },
          { minQuantity: 50, maxQuantity: null, price: 1100, discount: 27 },
        ],
      },
    },
  });

  // Fashion Items
  const mensTshirt = await prisma.product.create({
    data: {
      name: 'Premium Cotton T-Shirt for Men',
      slug: 'premium-cotton-tshirt-men',
      description: 'High-quality premium cotton t-shirt. Comfortable, breathable, and durable. Available in multiple colors and sizes.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/mens-tshirt-main.jpg',
      brand: 'FashionFit',
      tags: ['fashion', 'men', 'tshirt', 'cotton'],
      specifications: {
        'Material': 'Premium Cotton',
        'Fit': 'Regular',
        'Sizes': 'S, M, L, XL, XXL',
        'Colors': 'Black, White, Navy, Gray',
      },
      basePrice: 450,
      wholesalePrice: 650,
      moq: 20,
      stockQuantity: 320,
      availability: 'in_stock',
      sku: 'FASH-TSHIRT-001',
      categoryId: fashionCategory.id,
      isActive: true,
      rating: 4.4,
      reviewCount: 178,
      wholesaleTiers: {
        create: [
          { minQuantity: 20, maxQuantity: 49, price: 550, discount: 15 },
          { minQuantity: 50, maxQuantity: 99, price: 500, discount: 23 },
          { minQuantity: 100, maxQuantity: null, price: 450, discount: 31 },
        ],
      },
    },
  });

  // Home & Kitchen
  const blender = await prisma.product.create({
    data: {
      name: 'Professional Kitchen Blender 1000W',
      slug: 'professional-kitchen-blender-1000w',
      description: 'Powerful 1000W blender with multiple speed settings. Perfect for smoothies, soups, and food processing. Includes 2L glass jar.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/blender-main.jpg',
      brand: 'HomeChef',
      tags: ['home', 'kitchen', 'appliances', 'blender'],
      specifications: {
        'Power': '1000W',
        'Capacity': '2 Liters',
        'Material': 'Stainless Steel & Glass',
        'Speed Settings': '5 speeds + Pulse',
        'Warranty': '2 years',
      },
      basePrice: 2500,
      wholesalePrice: 3200,
      moq: 5,
      stockQuantity: 67,
      availability: 'in_stock',
      sku: 'HOME-BLEND-001',
      categoryId: homeCategory.id,
      isActive: true,
      isFeatured: true,
      rating: 4.6,
      reviewCount: 92,
      wholesaleTiers: {
        create: [
          { minQuantity: 5, maxQuantity: 14, price: 2900, discount: 9 },
          { minQuantity: 15, maxQuantity: 29, price: 2700, discount: 16 },
          { minQuantity: 30, maxQuantity: null, price: 2500, discount: 22 },
        ],
      },
    },
  });

  // Create a limited stock product
  const limitedProduct = await prisma.product.create({
    data: {
      name: 'Limited Edition Gaming Mouse',
      slug: 'limited-edition-gaming-mouse',
      description: 'Special limited edition gaming mouse with RGB lighting, programmable buttons, and precision sensor.',
      imageUrl: 'https://placeholder.vercel-storage.com/products/gaming-mouse-main.jpg',
      brand: 'GamePro',
      tags: ['electronics', 'gaming', 'accessories', 'limited'],
      basePrice: 1400,
      wholesalePrice: 1800,
      moq: 5,
      stockQuantity: 8,
      availability: 'limited',
      sku: 'ELEC-MOUSE-999',
      categoryId: electronicsCategory.id,
      isActive: true,
      rating: 4.9,
      reviewCount: 45,
      wholesaleTiers: {
        create: [
          { minQuantity: 5, maxQuantity: 9, price: 1600, discount: 11 },
          { minQuantity: 10, maxQuantity: null, price: 1500, discount: 17 },
        ],
      },
    },
  });

  // Create an out-of-stock product
  const outOfStockProduct = await prisma.product.create({
    data: {
      name: 'Vintage Camera Lens 50mm',
      slug: 'vintage-camera-lens-50mm',
      description: 'Classic 50mm camera lens. Currently out of stock - restocking soon!',
      imageUrl: 'https://placeholder.vercel-storage.com/products/camera-lens-main.jpg',
      brand: 'PhotoPro',
      tags: ['electronics', 'photography', 'lens'],
      basePrice: 7500,
      wholesalePrice: 8500,
      moq: 1,
      stockQuantity: 0,
      availability: 'out_of_stock',
      sku: 'ELEC-LENS-001',
      categoryId: electronicsCategory.id,
      isActive: true,
      rating: 4.8,
      reviewCount: 67,
    },
  });

  console.log('✅ Created products with wholesale tiers');

  // Create Sample Order
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-${Date.now()}-001`,
      userId: retailUser.id,
      subtotal: 2500,
      tax: 0,
      shipping: 100,
      total: 2600,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      paymentMethod: 'BKASH',
      shippingAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
      billingAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
      orderItems: {
        create: [
          {
            productId: headphones.id,
            quantity: 1,
            price: 2500,
            total: 2500,
          },
        ],
      },
      payments: {
        create: {
          amount: 2600,
          method: 'BKASH',
          status: 'PAID',
          transactionId: 'BKH' + Date.now(),
          gateway: 'bKash',
        },
      },
    },
  });

  console.log('✅ Created sample order');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('📊 Summary:');
  console.log('  - Users: 3 (1 Admin, 1 Retail, 1 Wholesale)');
  console.log('  - Categories: 4');
  console.log('  - Products: 10 (with wholesale tiers)');
  console.log('  - Orders: 1');
  console.log('\n🔑 Admin Credentials:');
  console.log('  Email: admin@skyzone.com');
  console.log('  Password: admin123');
  console.log('\n🔑 Test Accounts:');
  console.log('  Retail: customer@example.com / admin123');
  console.log('  Wholesale: wholesale@example.com / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
