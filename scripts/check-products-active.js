// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking all products in database...\n');
  console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...\n');
  
  // Check total count without any filters
  const totalCount = await prisma.product.count();
  console.log(`📊 Total products (including inactive): ${totalCount}\n`);
  
  const allProducts = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Get up to 100 products
  });

  console.log(`Total products fetched: ${allProducts.length}\n`);
  
  const activeProducts = allProducts.filter(p => p.isActive);
  const inactiveProducts = allProducts.filter(p => !p.isActive);
  
  console.log(`✅ Active products: ${activeProducts.length}`);
  console.log(`❌ Inactive products: ${inactiveProducts.length}\n`);
  
  console.log('All products:');
  allProducts.forEach((p, index) => {
    console.log(`${index + 1}. ${p.name} [${p.isActive ? 'ACTIVE' : 'INACTIVE'}] (Created: ${p.createdAt.toLocaleDateString()})`);
  });
  
  if (inactiveProducts.length > 0) {
    console.log('\n⚠️ WARNING: Some products are marked as inactive!');
    console.log('These products will NOT show up on the user pages.');
  }
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
