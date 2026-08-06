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
    // Production/Staging: apply only already-committed, reviewed migration
    // files. `prisma db push` (the previous primary path here) has no
    // migration history and no rollback — it can silently apply destructive,
    // unreviewed schema changes straight from whatever schema.prisma happens
    // to be checked out, against the live database, on every single build.
    // `migrate deploy` only ever applies migrations that already exist as
    // committed files, so a bad schema change gets caught by whoever forgot
    // to write the migration, not by the production database eating it.
    console.log('🚀 Applying committed migrations to the database...');
    execSync('prisma migrate deploy', { stdio: 'inherit', timeout: 30000 });
  }
  
  console.log('✅ Database migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
