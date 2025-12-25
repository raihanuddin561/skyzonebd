const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Checking featured status of products...\n');
  
  const allProducts = await prisma.product.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      isFeatured: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Total active products: ${allProducts.length}\n`);
  
  const featuredProducts = allProducts.filter(p => p.isFeatured);
  const nonFeaturedProducts = allProducts.filter(p => !p.isFeatured);
  
  console.log(`Featured products (shown on homepage): ${featuredProducts.length}`);
  console.log(`Non-featured products (not on homepage): ${nonFeaturedProducts.length}\n`);
  
  console.log('All active products:');
  allProducts.forEach(p => {
    console.log(`- ${p.name} [${p.isFeatured ? 'FEATURED ⭐' : 'NOT FEATURED'}]`);
  });
  
  if (nonFeaturedProducts.length > 0) {
    console.log('\n💡 SOLUTION: To show all products on homepage, set isFeatured=true for all products');
    console.log('   Or update homepage to show all products instead of only featured ones.');
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
