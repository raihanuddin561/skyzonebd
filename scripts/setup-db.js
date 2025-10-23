#!/usr/bin/env node

/**
 * Database Setup Script for B2B Ecommerce Frontend
 * This script helps set up the PostgreSQL database 'sagor_db'
 */

const { execSync } = require('child_process');

console.log('🚀 Setting up PostgreSQL database: sagor_db');
console.log('==========================================');

// Function to run command and handle errors
function runCommand(command, description) {
  try {
    console.log(`\n📋 ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'inherit' });
    console.log(`✅ ${description} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Main setup function
async function setupDatabase() {
  console.log('\n1. Prerequisites Check:');
  console.log('   - Make sure PostgreSQL is installed and running');
  console.log('   - Ensure you have created database "sagor_db"');
  console.log('   - Update .env file with correct database credentials');
  
  console.log('\n2. To create the database manually, run:');
  console.log('   psql -U postgres -c "CREATE DATABASE sagor_db;"');
  
  console.log('\n3. Running Prisma setup...');
  
  // Generate Prisma Client
  if (!runCommand('npx prisma generate', 'Generating Prisma Client')) {
    process.exit(1);
  }
  
  // Run database migration
  if (!runCommand('npx prisma migrate dev --name init', 'Running database migrations')) {
    console.log('\n⚠️  Migration failed. Please check:');
    console.log('   - PostgreSQL is running');
    console.log('   - Database "sagor_db" exists');
    console.log('   - Database credentials in .env are correct');
    process.exit(1);
  }
  
  // Seed database (if seed file exists)
  try {
    await import('./seed.js');
    if (!runCommand('npx prisma db seed', 'Seeding database with initial data')) {
      console.log('⚠️  Seeding failed or no seed file found');
    }
  } catch {
    console.log('ℹ️  No seed file found, skipping database seeding');
  }
  
  console.log('\n🎉 Database setup completed successfully!');
  console.log('\n📊 Next steps:');
  console.log('   - Run: npx prisma studio (to view database in browser)');
  console.log('   - Run: npm run dev (to start the application)');
  console.log('   - Check: http://localhost:3000 (application)');
  console.log('   - Check: http://localhost:5555 (Prisma Studio)');
}

// Run setup
setupDatabase().catch(console.error);