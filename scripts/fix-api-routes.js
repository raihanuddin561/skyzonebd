const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration to add to API routes
const VERCEL_CONFIG = `
// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout
`;

// Find all route.ts files in api directory
const apiRoutes = glob.sync('src/app/api/**/route.ts', { 
  cwd: process.cwd(),
  absolute: true 
});

console.log(`Found ${apiRoutes.length} API routes to fix\n`);

let fixed = 0;
let skipped = 0;

apiRoutes.forEach(filePath => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already has runtime configuration
    if (content.includes('export const runtime')) {
      console.log(`⏭️  Skipped (already configured): ${path.relative(process.cwd(), filePath)}`);
      skipped++;
      return;
    }
    
    // Find the first import statement
    const lines = content.split('\n');
    let lastImportIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) {
        lastImportIndex = i;
      } else if (lastImportIndex >= 0 && lines[i].trim() !== '' && !lines[i].startsWith('import ')) {
        break;
      }
    }
    
    if (lastImportIndex >= 0) {
      // Insert after last import
      lines.splice(lastImportIndex + 1, 0, VERCEL_CONFIG);
      const newContent = lines.join('\n');
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Fixed: ${path.relative(process.cwd(), filePath)}`);
      fixed++;
    } else {
      console.log(`⚠️  Warning: Could not find imports in ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
});

console.log(`\n📊 Summary:`);
console.log(`   Fixed: ${fixed}`);
console.log(`   Skipped: ${skipped}`);
console.log(`   Total: ${apiRoutes.length}`);
