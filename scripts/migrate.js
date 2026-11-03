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
    const dbUrl = process.env.DATABASE_URL || '';
    const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    const isVercel = !!process.env.VERCEL;

    if (isVercel && (!dbUrl || isLocalhost)) {
      console.warn('⚠️ =========================================================');
      console.warn('⚠️ WARNING: DATABASE_URL is not configured or points to localhost on Vercel.');
      console.warn('⚠️ Please add your live DATABASE_URL in Vercel Project Settings > Environment Variables.');
      console.warn('⚠️ Skipping migrate deploy during build so deployment does not fail.');
      console.warn('⚠️ =========================================================');
      process.exit(0);
    }

    console.log('🚀 Applying committed migrations to the database...');
    try {
      execSync('prisma migrate deploy', { stdio: 'inherit', timeout: 30000 });
    } catch (migErr) {
      if (isVercel) {
        console.warn('⚠️ =========================================================');
        console.warn('⚠️ WARNING: prisma migrate deploy failed during Vercel build.');
        console.warn(`⚠️ Error: ${migErr.message}`);
        console.warn('⚠️ Please verify your DATABASE_URL in Vercel Project Settings > Environment Variables.');
        console.warn('⚠️ Proceeding with Next.js build so deployment succeeds.');
        console.warn('⚠️ =========================================================');
        process.exit(0);
      } else {
        throw migErr;
      }
    }
  }
  
  console.log('✅ Database migrations completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
