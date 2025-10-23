const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing products (but keep categories and users)
  console.log('Clearing existing products...')
  await prisma.product.deleteMany({})

  // Create or get Categories
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      imageUrl: '/images/categories/electronics.jpg',
    },
  })

  const babyItems = await prisma.category.upsert({
    where: { slug: 'baby-items' },
    update: {},
    create: {
      name: 'Baby Items',
      slug: 'baby-items',
      description: 'Baby clothes, toys, and accessories',
      imageUrl: '/images/categories/baby-items.jpg',
    },
  })

  // Create Products
  await prisma.product.createMany({
    data: [
      {
        name: 'JR-OH1 Bluetooth Headphone',
        slug: 'jr-oh1-bluetooth-headphone',
        description: 'High-quality Bluetooth headphones with excellent sound quality',
        imageUrl: '/images/products/electronics/headphones/JR-OH1-Bluetooth-Headphone.webp',
        price: 2500,
        retailPrice: 2500,
        wholesalePrice: 2000,
        baseWholesalePrice: 2000,
        wholesaleEnabled: true,
        wholesaleMOQ: 10,
        minOrderQuantity: 10,
        stockQuantity: 100,
        sku: 'JR-OH1-001',
        categoryId: electronics.id,
        isFeatured: true,
      },
      {
        name: 'Baby Frock',
        slug: 'baby-frock-1',
        description: 'Comfortable and stylish baby frock for girls',
        imageUrl: '/images/products/baby-items/dress/baby-frock-1.jpg',
        price: 800,
        retailPrice: 800,
        wholesalePrice: 600,
        baseWholesalePrice: 600,
        wholesaleEnabled: true,
        wholesaleMOQ: 20,
        minOrderQuantity: 20,
        stockQuantity: 150,
        sku: 'BF-001',
        categoryId: babyItems.id,
        isFeatured: true,
      },
      {
        name: 'Sleeveless Baby Dress',
        slug: 'sleeveless-baby-dress',
        description: 'Light and comfortable sleeveless dress for babies',
        imageUrl: '/images/products/baby-items/dress/sleeveless-baby-dress.jpg',
        price: 650,
        retailPrice: 650,
        wholesalePrice: 500,
        baseWholesalePrice: 500,
        wholesaleEnabled: true,
        wholesaleMOQ: 25,
        minOrderQuantity: 25,
        stockQuantity: 120,
        sku: 'SBD-001',
        categoryId: babyItems.id,
      },
      {
        name: 'Puzzle Game',
        slug: 'puzzle-game',
        description: 'Educational puzzle game for kids',
        imageUrl: '/images/products/baby-items/toys/puzzle-game.webp',
        price: 450,
        retailPrice: 450,
        wholesalePrice: 350,
        baseWholesalePrice: 350,
        wholesaleEnabled: true,
        wholesaleMOQ: 30,
        minOrderQuantity: 30,
        stockQuantity: 200,
        sku: 'PG-001',
        categoryId: babyItems.id,
      },
    ],
  })

  // Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'admin@skyzonebd.com' },
    update: {},
    create: {
      email: 'admin@skyzonebd.com',
      name: 'Admin User',
      phone: '+880-1711-000000',
      companyName: 'SkyzoneBD Ltd.',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  // Create Test Buyer User
  const hashedBuyerPassword = await bcrypt.hash('buyer123', 12)
  await prisma.user.upsert({
    where: { email: 'buyer@example.com' },
    update: {},
    create: {
      email: 'buyer@example.com',
      name: 'Test Buyer',
      phone: '+880-1711-111111',
      companyName: 'Test Company Ltd.',
      password: hashedBuyerPassword,
      role: 'BUYER',
    },
  })

  console.log('✅ Database seeded successfully!')
  console.log('🔐 Admin credentials: admin@skyzonebd.com / 11admin22')
  console.log('👤 Buyer credentials: buyer@example.com / buyer123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })