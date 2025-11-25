// Test script to verify Vercel Blob configuration
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Vercel Blob Configuration...\n');

// Check if token exists
const token = process.env.BLOB_READ_WRITE_TOKEN || process.env.SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error('❌ No Blob token found!');
  console.log('Available environment variables:', Object.keys(process.env).filter(k => k.includes('BLOB')));
  process.exit(1);
}

console.log('✅ Blob token found:', token.substring(0, 20) + '...');
console.log('✅ Token length:', token.length);

// Test importing @vercel/blob
try {
  const { put } = require('@vercel/blob');
  console.log('✅ @vercel/blob package imported successfully');
} catch (error) {
  console.error('❌ Failed to import @vercel/blob:', error.message);
  console.log('💡 Try running: npm install @vercel/blob');
  process.exit(1);
}

console.log('\n✅ All checks passed! Vercel Blob should work correctly.');
console.log('💡 Make sure to restart your Next.js dev server for env changes to take effect.');
