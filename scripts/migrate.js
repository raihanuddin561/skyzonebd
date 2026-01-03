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
    // Production/Staging: Use db push to avoid advisory lock issues
    console.log('🚀 Pushing schema to production database...');
    try {
      execSync('prisma db push --skip-generate', { stdio: 'inherit', timeout: 30000 });
      console.log('✅ Schema push completed successfully!');
    } catch (pushError) {
      console.log('⚠️  DB push failed, trying migrate deploy...');
      execSync('prisma migrate deploy', { stdio: 'inherit', timeout: 30000 });
    }
  }
  
  console.log('✅ Database migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
}
