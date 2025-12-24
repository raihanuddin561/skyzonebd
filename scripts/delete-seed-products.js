// Script to delete seeded sample products from database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteSeedProducts() {
  try {
    console.log('🗑️  Starting deletion of seeded sample products...');

    // Delete products with seed SKU patterns
    const result = await prisma.product.deleteMany({
      where: {
        OR: [
          { sku: { startsWith: 'ELEC-' } },
          { sku: { startsWith: 'BABY-' } },
          { sku: { startsWith: 'HOME-' } },
          { sku: { startsWith: 'FASH-' } },
          { sku: { startsWith: 'SPRT-' } },
          { sku: { startsWith: 'AUTO-' } },
          // Also delete by common seeded product names
          { name: { contains: 'Wireless Bluetooth' } },
          { name: { contains: 'Baby Stroller' } },
          { name: { contains: 'Coffee Maker' } },
          { name: { contains: 'Yoga Mat' } },
        ]
      }
    });

    console.log(`✅ Deleted ${result.count} seeded sample products`);

    // Show remaining products
    const remaining = await prisma.product.count();
    console.log(`📦 Remaining products in database: ${remaining}`);

    // Show featured products
    const featured = await prisma.product.count({
      where: { isFeatured: true }
    });
    console.log(`⭐ Featured products remaining: ${featured}`);

  } catch (error) {
    console.error('❌ Error deleting products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteSeedProducts();
