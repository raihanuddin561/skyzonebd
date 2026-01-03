#!/usr/bin/env node
/**
 * Auto Migration Script
 * Runs database migrations automatically during build/deployment
 * Handles both development and production environments
 */

const { execSync } = require('child_process');
const path = require('path');

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

console.log('🔄 Starting automatic database migration...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

try {
  // Ensure Prisma client is generated
  console.log('📦 Generating Prisma Client...');
  execSync('prisma generate', { stdio: 'inherit' });
  
  if (isDevelopment) {
    // Development: Use migrate dev (creates migration files)
    console.log('🔧 Running development migrations...');
    execSync('prisma migrate dev --skip-seed', { stdio: 'inherit' });
  } else {
    // Production/Staging: Use migrate deploy (applies existing migrations)
    console.log('🚀 Deploying production migrations...');
    execSync('prisma migrate deploy', { stdio: 'inherit' });
  }
  
  console.log('✅ Database migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  
  // In production, try db push as fallback
  if (isProduction) {
    console.log('⚠️  Attempting fallback: prisma db push...');
    try {
      execSync('prisma db push --accept-data-loss --skip-generate', { stdio: 'inherit' });
      console.log('✅ Fallback migration successful!');
      process.exit(0);
    } catch (fallbackError) {
      console.error('❌ Fallback migration failed:', fallbackError.message);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}
