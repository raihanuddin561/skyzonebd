# Auto Migration System

## Overview

Database migrations now run automatically at build time for all environments.

## How It Works

### Development
```bash
npm run build
# Runs: prisma migrate dev (creates and applies migrations)
```

### Production/Vercel
```bash
npm run vercel-build
# Runs: prisma migrate deploy (applies existing migrations)
# Fallback: prisma db push if migrate fails
```

## Migration Strategy

### Development Environment
- Uses `prisma migrate dev`
- Creates migration files automatically
- Applies migrations to database
- Updates Prisma Client

### Production Environment  
- Uses `prisma migrate deploy`
- Only applies existing migration files
- No migration file creation
- Safe for production deployments
- **Fallback**: Uses `prisma db push` if migrations fail

## Environment Variables Required

```env
DATABASE_URL="postgresql://..."
NODE_ENV="production" # or "development"
```

## Commands

```bash
# Regular build (auto-migrates)
npm run build

# Vercel deployment (auto-migrates)
npm run vercel-build

# Manual migration
npm run db:migrate        # Development
npm run db:migrate:deploy # Production

# Generate Prisma Client only
npm run db:generate

# Reset database (dev only)
npm run db:reset
```

## Build Process

1. **Pre-Build**: Run migration script
   - Generate Prisma Client
   - Apply database migrations
   - Handle errors with fallback

2. **Build**: Next.js build
   - Compile application
   - Generate static pages

3. **Result**: Ready to deploy with migrated database

## Error Handling

- Development errors stop the build
- Production tries fallback (`db push`)
- All errors are logged clearly
- Exit codes indicate success/failure

## Vercel Deployment

The system automatically detects Vercel environment and:
1. Generates Prisma Client (`postinstall`)
2. Runs migrations (`vercel-build`)
3. Builds Next.js application
4. Deploys successfully

No manual migration needed!

## Benefits

✅ No manual migration commands  
✅ Consistent database state  
✅ Works in all environments  
✅ Safe production deployments  
✅ Automatic on every build  
✅ Error handling with fallback  

## Troubleshooting

**Build fails with migration error:**
- Check `DATABASE_URL` is set correctly
- Ensure database is accessible
- Verify migration files exist in `prisma/migrations/`

**Production deployment issues:**
- Use `prisma migrate deploy` manually first
- Check Vercel environment variables
- Review build logs for specific errors

**Development migration conflicts:**
- Run `npm run db:reset` to reset database
- Delete `prisma/migrations/` and start fresh
- Use `prisma migrate dev` to create new baseline
