// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { execSync } = require('child_process');

try {
  console.log('Pushing schema to Vercel Neon database...');
  console.log('Database:', process.env.DATABASE_URL?.substring(0, 50) + '...\n');
  
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('\n✅ Schema pushed successfully to Vercel Neon database!');
} catch (error) {
  console.error('❌ Error pushing schema:', error.message);
  process.exit(1);
}
