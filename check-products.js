const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, price: true }
    });
    
    console.log('\n📦 Products in database:', products.length);
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ID: ${p.id}, Name: ${p.name}, Price: ${p.price}`);
    });
    
    if (products.length === 0) {
      console.log('\n⚠️  Database is empty! Run: node prisma/seed.js');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
