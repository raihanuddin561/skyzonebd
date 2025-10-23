# Vercel Deployment Setup Guide

## Prerequisites
- Vercel account
- GitHub repository connected to Vercel
- Local development environment working

## Step 1: Set up Vercel PostgreSQL

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Name your database (e.g., `skyzonebd-production`)
5. Select a region closest to your users
6. Click **Create**

## Step 2: Get Database Connection String

After creating the database:

1. In the Storage tab, click on your Postgres database
2. Go to **Settings** → **Connection**
3. Copy the `POSTGRES_PRISMA_URL` value (this is optimized for Prisma)
4. This will be used as your `DATABASE_URL`

## Step 3: Set up Vercel Blob Storage

1. In your Vercel project → **Storage** tab
2. Click **Create Database** → Select **Blob**
3. Name it (e.g., `skyzonebd-images`)
4. Click **Create**
5. Copy the `BLOB_READ_WRITE_TOKEN` from the storage settings

## Step 4: Configure Environment Variables in Vercel

Go to your project → **Settings** → **Environment Variables**

Add these variables for **Production**, **Preview**, and **Development**:

```bash
# Database
DATABASE_URL=<your-POSTGRES_PRISMA_URL-from-step-2>

# JWT Authentication
JWT_SECRET=<generate-a-strong-random-string>
NEXTAUTH_SECRET=<generate-another-strong-random-string>
NEXTAUTH_URL=https://your-domain.vercel.app

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=<your-blob-token-from-step-3>

# API Configuration
NEXT_PUBLIC_API_BASE_URL=
NEXT_PUBLIC_USE_API=true

# App Configuration
NEXT_PUBLIC_APP_NAME=SkyZone BD
NEXT_PUBLIC_APP_VERSION=1.0.0

# Features
NEXT_PUBLIC_ENABLE_WISHLIST=true
NEXT_PUBLIC_ENABLE_COMPARISON=true
NEXT_PUBLIC_ENABLE_REVIEWS=true

# Pagination
NEXT_PUBLIC_PRODUCTS_PER_PAGE=12
NEXT_PUBLIC_SEARCH_RESULTS_PER_PAGE=10

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE=5242880
NEXT_PUBLIC_ALLOWED_IMAGE_TYPES=jpg,jpeg,png,webp

# Authentication
NEXT_PUBLIC_JWT_EXPIRY=24h
NEXT_PUBLIC_REFRESH_TOKEN_EXPIRY=7d

# Development
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_MOCK_DELAY=1000
```

## Step 5: Deploy and Initialize Database

### Option A: Automatic (Recommended)

The database will be initialized automatically during build:

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Add Vercel setup"
   git push origin main
   ```

2. Vercel will automatically:
   - Run `prisma generate`
   - Run `prisma migrate deploy` (creates tables)
   - Build the application

3. **Seed the database manually** (first time only):
   - Go to Vercel Dashboard → Your Project → **Settings** → **Functions**
   - Or use Vercel CLI:
   ```bash
   vercel env pull .env.production
   npm run db:seed
   ```

### Option B: Using Vercel CLI

1. Install Vercel CLI (if not already):
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Link your project:
   ```bash
   vercel link
   ```

4. Pull production environment variables:
   ```bash
   vercel env pull .env.production
   ```

5. Run migrations against production database:
   ```bash
   DATABASE_URL="your-production-url" npx prisma migrate deploy
   ```

6. Seed the production database:
   ```bash
   DATABASE_URL="your-production-url" npm run db:seed
   ```

## Step 6: Seed Database from Vercel Dashboard

Since Vercel doesn't run seed scripts automatically, you need to seed manually:

### Method 1: Using Vercel Postgres Dashboard

1. Go to Vercel Dashboard → Storage → Your Postgres Database
2. Click **Data** tab → **Query**
3. The tables are already created by migrations
4. Run the seed script locally pointed to production:
   ```bash
   DATABASE_URL="your-production-postgres-url" npm run db:seed
   ```

### Method 2: Create an API Route for Seeding

Create `/api/seed` route (protected by admin auth):

```typescript
// src/app/api/seed/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Add authentication check here
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SEED_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run your seed logic here
    // Import and execute seed.ts logic
    
    return NextResponse.json({ success: true, message: 'Database seeded' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Then call it once:
```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Authorization: Bearer your-seed-secret"
```

## Step 7: Upload Images to Vercel Blob

Your seed script should use Vercel Blob URLs. You have two options:

### Option A: Pre-upload images and use URLs in seed

1. Create a script to upload images:
   ```typescript
   // scripts/upload-images.ts
   import { put } from '@vercel/blob';
   import fs from 'fs';
   import path from 'path';

   const uploadImages = async () => {
     const imagesDir = path.join(process.cwd(), 'public/images/products');
     // Upload logic here
   };
   ```

2. Run it with production blob token:
   ```bash
   BLOB_READ_WRITE_TOKEN="your-token" tsx scripts/upload-images.ts
   ```

### Option B: Use existing public URLs temporarily

Update your seed file to use CDN URLs or Vercel Blob URLs.

## Step 8: Verify Deployment

1. Check your deployment URL: `https://your-app.vercel.app`
2. Verify API endpoints:
   - `https://your-app.vercel.app/api/products`
   - `https://your-app.vercel.app/api/categories`
3. Check database connection:
   - `https://your-app.vercel.app/api/db/status`

## Troubleshooting

### Tables don't exist
**Error**: `The table 'public.products' does not exist`

**Solution**:
```bash
# Connect to production DB and run migrations
DATABASE_URL="your-production-url" npx prisma migrate deploy
```

### Database not seeded
**Error**: API returns empty arrays

**Solution**:
```bash
# Run seed script against production
DATABASE_URL="your-production-url" npm run db:seed
```

### Images not loading
**Error**: 404 on image URLs

**Solution**:
- Ensure `BLOB_READ_WRITE_TOKEN` is set in Vercel
- Upload images to Vercel Blob
- Update seed data with correct Blob URLs

## Quick Command Reference

```bash
# Local development
npm run dev

# Generate Prisma Client
npm run db:generate

# Run migrations locally
npm run db:migrate

# Seed local database
npm run db:seed

# Deploy migrations to production
DATABASE_URL="prod-url" npx prisma migrate deploy

# Seed production database
DATABASE_URL="prod-url" npm run db:seed

# Open Prisma Studio for production
DATABASE_URL="prod-url" npx prisma studio

# Push to Vercel
git push origin main
```

## Security Notes

1. Never commit `.env.production` or `.env.local` to Git
2. Rotate JWT_SECRET and NEXTAUTH_SECRET regularly
3. Use strong, random strings for secrets (32+ characters)
4. Limit Blob storage access with proper tokens
5. Set up proper CORS if using external domains

## Next Steps After Deployment

1. ✅ Database tables created
2. ✅ Database seeded with initial data
3. ✅ Images uploaded to Vercel Blob
4. 🔄 Test all API endpoints
5. 🔄 Test product pages
6. 🔄 Test cart and checkout flow
7. 🔄 Test authentication
8. 🔄 Set up monitoring and error tracking
9. 🔄 Configure custom domain (optional)
10. 🔄 Set up backup strategy
