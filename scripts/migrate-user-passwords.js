/**
 * Migration Script: Hash Existing User Passwords
 * 
 * This script checks for users with unhashed passwords and hashes them.
 * Safe to run multiple times - will skip already hashed passwords.
 * 
 * Usage:
 *   node scripts/migrate-user-passwords.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function migratePasswords() {
  console.log('🔐 Starting password migration...\n');

  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        password: true,
        name: true
      }
    });

    console.log(`📊 Found ${users.length} users in database\n`);

    if (users.length === 0) {
      console.log('✅ No users to migrate');
      return;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
      const isAlreadyHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');

      if (isAlreadyHashed) {
        console.log(`⏭️  Skipping ${user.email} - password already hashed`);
        skippedCount++;
        continue;
      }

      // Hash the plain text password
      console.log(`🔒 Hashing password for ${user.email}...`);
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // Update the user with hashed password
      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword }
      });

      console.log(`✅ Updated ${user.email}`);
      migratedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n🎉 Migration Complete!`);
    console.log(`   - Migrated: ${migratedCount} users`);
    console.log(`   - Skipped: ${skippedCount} users (already hashed)`);
    console.log(`   - Total: ${users.length} users\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migratePasswords()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
