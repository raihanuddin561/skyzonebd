const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Testing what products API should return...\n');
  
  // Simulate what the API does
  const where = {
    isActive: true,
  };
  
  const products = await prisma.product.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`Total active products found: ${products.length}\n`);
  
  products.forEach(p => {
    console.log(`✓ ${p.name}`);
    console.log(`  - Category: ${p.category.name}`);
    console.log(`  - Active: ${p.isActive}`);
    console.log(`  - Created: ${p.createdAt.toLocaleDateString()}`);
    console.log('');
  });
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
