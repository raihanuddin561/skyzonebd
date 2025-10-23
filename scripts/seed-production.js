const { execSync } = require('child_process');

console.log('🌱 Starting production database seeding...');

try {
  // Run the seed script
  console.log('📦 Running seed script...');
  execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  
  console.log('✅ Database seeded successfully!');
} catch (error) {
  console.error('❌ Error seeding database:', error.message);
  process.exit(1);
}
