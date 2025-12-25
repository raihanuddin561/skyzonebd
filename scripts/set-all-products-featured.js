const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Setting all active products as featured...\n');
  
  const result = await prisma.product.updateMany({
    where: {
      isActive: true,
      isFeatured: false
    },
    data: {
      isFeatured: true
    }
  });

  console.log(`✅ Updated ${result.count} products to featured status`);
  
  // Verify
  const featuredCount = await prisma.product.count({
    where: {
      isActive: true,
      isFeatured: true
    }
  });
  
  const totalCount = await prisma.product.count({
    where: {
      isActive: true
    }
  });
  
  console.log(`\n📊 Result: ${featuredCount} out of ${totalCount} active products are now featured`);
  console.log('✨ All active products will now appear on the homepage!');
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
