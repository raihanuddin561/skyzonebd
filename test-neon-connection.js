// Quick test to verify Neon DB connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testConnection() {
  try {
    console.log('🔄 Testing Neon DB connection...');
    console.log('📍 DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database successfully!');
    
    // Test a simple query
    const productCount = await prisma.product.count();
    console.log(`✅ Found ${productCount} products in database`);
    
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    const orderCount = await prisma.order.count();
    console.log(`✅ Found ${orderCount} orders in database`);
    
    console.log('\n✅ Database connection test PASSED!');
  } catch (error) {
    console.error('❌ Database connection test FAILED:');
    console.error(error.message);
    if (error.code) console.error('Error code:', error.code);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
