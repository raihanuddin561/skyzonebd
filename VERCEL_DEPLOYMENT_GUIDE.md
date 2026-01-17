# Vercel Deployment Guide for Skyzone E-Commerce

## 📋 Prerequisites

- Vercel account
- GitHub repository
- PostgreSQL database (Vercel Postgres recommended)
- Vercel Blob storage for images

## 🚀 Step-by-Step Deployment

### 1. Install Dependencies

```bash
npm install tsx --save-dev
npm install @vercel/blob --save
```

### 2. Set Up Vercel Postgres

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create a new project or select existing
3. Go to **Storage** → **Create Database** → **Postgres**
4. Copy the connection strings

### 3. Set Up Vercel Blob Storage

1. In Vercel Dashboard, go to **Storage** → **Create**
2. Select **Blob** storage
3. Copy the `BLOB_READ_WRITE_TOKEN`

### 4. Environment Variables

Create `.env` file locally and add to Vercel:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_xxxxxxxxxx"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this"
NEXTAUTH_SECRET="your-nextauth-secret-change-this"
NEXTAUTH_URL="https://your-domain.vercel.app"

# App
NEXT_PUBLIC_API_URL="https://your-domain.vercel.app"
```

**Add these to Vercel:**
1. Project Settings → Environment Variables
2. Add each variable for Production, Preview, and Development

### 5. Database Setup

#### Local Development:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (for Vercel Postgres)
npm run db:push

# Seed database with initial data
npm run db:seed
```

#### Production (Vercel):

Vercel will automatically run:
- `prisma generate` (via postinstall script)
- Use Vercel's build command to run migrations

### 6. Update package.json Scripts

Already configured:

```json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

### 7. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Option B: GitHub Integration (Recommended)

1. Push code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will auto-detect Next.js
5. Add environment variables
6. Deploy!

### 8. Post-Deployment Tasks

#### Seed the Production Database:

```bash
# Via Vercel CLI
vercel env pull .env.production
DATABASE_URL="your-production-url" npm run db:seed
```

Or create a one-time deployment script:

```bash
# In Vercel Dashboard
# Project → Settings → Functions
# Add a one-time function to run seed
```

## 🖼️ Image Upload with Vercel Blob

### Installation:

```bash
npm install @vercel/blob
```

### Usage in Admin Panel:

```typescript
// src/app/api/admin/upload/route.ts
import { put } from '@vercel/blob';

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get('file') as File;
  
  const blob = await put(file.name, file, {
    access: 'public',
  });
  
  return Response.json({ url: blob.url });
}
```

### Frontend Upload Component:

```typescript
const handleUpload = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });
  
  const { url } = await response.json();
  return url;
};
```

## 🔄 Image Migration Strategy

### For Initial Deployment:

1. **Use Placeholder URLs** (current approach in seed file)
2. **Upload via Admin Panel** after deployment
3. **Bulk Upload Script** for existing images

### Bulk Upload Script:

```typescript
// scripts/upload-images.ts
import { put } from '@vercel/blob';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

async function uploadImages() {
  const imagesDir = path.join(process.cwd(), 'public/images/products');
  const files = await readdir(imagesDir);
  
  for (const file of files) {
    const filePath = path.join(imagesDir, file);
    const fileBuffer = await readFile(filePath);
    const fileBlob = new Blob([fileBuffer]);
    
    const blob = await put(`products/${file}`, fileBlob, {
      access: 'public',
    });
    
    console.log(`Uploaded: ${file} → ${blob.url}`);
  }
}

uploadImages();
```

## ⚙️ Build Configuration

### vercel.json (optional):

```json
{
  "buildCommand": "prisma generate && next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "regions": ["sin1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "BLOB_READ_WRITE_TOKEN": "@blob_token"
  }
}
```

## 🔒 Security Checklist

- [ ] Change default passwords in seed file
- [ ] Use strong JWT_SECRET
- [ ] Enable SSL for database (included in Vercel Postgres)
- [ ] Set up CORS properly
- [ ] Use environment variables for sensitive data
- [ ] Enable Vercel Authentication (optional)
- [ ] Set up rate limiting

## 📊 Monitoring

### Vercel Analytics:

1. Enable in Project Settings → Analytics
2. Monitor:
   - API response times
   - Database query performance
   - Error rates
   - User traffic

### Database Monitoring:

```bash
# View database metrics
vercel postgres list
vercel postgres insights
```

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Prisma Client not found"
```bash
# Solution: Add postinstall script
"postinstall": "prisma generate"
```

#### 2. Database connection fails
- Check DATABASE_URL format
- Ensure `?sslmode=require` is included
- Verify Vercel Postgres is running

#### 3. Images not loading
- Check BLOB_READ_WRITE_TOKEN
- Verify blob URLs are public
- Check CORS settings

#### 4. Seed fails on Vercel
- Run seed locally with production URL
- Use Vercel CLI with environment variables
- Check logs: `vercel logs`

## 🔄 Development Workflow

### Local Development:

```bash
# 1. Pull environment variables
vercel env pull .env.local

# 2. Generate Prisma Client
npm run db:generate

# 3. Push schema
npm run db:push

# 4. Seed database
npm run db:seed

# 5. Start dev server
npm run dev
```

### Deploy Preview:

```bash
# Deploy to preview URL
vercel

# Test preview
# Visit: https://your-project-xxxxx.vercel.app
```

### Deploy Production:

```bash
git push origin main
# Vercel auto-deploys on push
```

## 📦 Database Backup

### Export Data:

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Import Data:

```bash
psql $DATABASE_URL < backup.sql
```

## 🎯 Performance Tips

1. **Enable Edge Functions** for API routes
2. **Use ISR** (Incremental Static Regeneration) for product pages
3. **Optimize Images** with Vercel Image Optimization
4. **Cache** database queries with SWR
5. **Use CDN** for static assets (automatic with Vercel)

## 📱 Testing After Deployment

### Checklist:

- [ ] Homepage loads
- [ ] Product listing works
- [ ] Product detail pages load
- [ ] Search functionality
- [ ] Category filtering
- [ ] Add to cart works
- [ ] Checkout flow (guest & authenticated)
- [ ] Admin login works
- [ ] Admin panel accessible
- [ ] Image uploads work
- [ ] Order creation works
- [ ] Email notifications (if configured)

## 🔗 Useful Links

- [Vercel Postgres Docs](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel Blob Docs](https://vercel.com/docs/storage/vercel-blob)
- [Prisma with Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

## 📝 Post-Deployment Tasks

1. **Seed Production Database**
   ```bash
   DATABASE_URL="production-url" npm run db:seed
   ```

2. **Upload Product Images**
   - Use admin panel upload feature
   - Or run bulk upload script

3. **Test All Features**
   - Create test orders
   - Test payment flows
   - Verify email notifications

4. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor database queries
   - Watch error logs

5. **Set Up Custom Domain** (optional)
   - Add domain in Vercel
   - Update DNS records
   - Update NEXTAUTH_URL

---

## 🔍 Production Verification Checklist

### Database & Migration Status Verification

After deploying to Vercel, verify your database and migration status using the following endpoints:

#### 1. **Database Connectivity & Statistics**

```bash
# GET request - no authentication required (public endpoint)
curl https://your-domain.vercel.app/api/db/status
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database connected successfully!",
  "database": "sagor_db",
  "status": "connected",
  "statistics": {
    "users": 5,
    "products": 50,
    "activeProducts": 45,
    "inactiveProducts": 5,
    "categories": 10,
    "orders": 25
  },
  "timestamp": "2026-01-17T10:30:00.000Z"
}
```

**What to Check:**
- ✅ `status: "connected"` - Database is reachable
- ✅ Record counts match your expected data
- ✅ `activeProducts` and `inactiveProducts` sum equals total products

---

#### 2. **Migration Status Check**

```bash
# GET request - requires MIGRATION_SECRET_KEY
curl -H "Authorization: Bearer YOUR_MIGRATION_SECRET_KEY" \
  https://your-domain.vercel.app/api/migrate
```

**Expected Response:**
```json
{
  "success": true,
  "status": "Database schema is up to date!"
}
```

**What to Check:**
- ✅ Returns "up to date" or shows list of applied migrations
- ✅ No pending migrations
- ✅ No error messages

**Common Issues:**
- ❌ "Unauthorized" - Check your `MIGRATION_SECRET_KEY` environment variable
- ❌ Migration pending - Run migration endpoint or redeploy

---

#### 3. **Database Schema Sync Check**

```bash
# GET request - requires MIGRATION_SECRET_KEY
curl -H "Authorization: Bearer YOUR_MIGRATION_SECRET_KEY" \
  https://your-domain.vercel.app/api/db-sync
```

**Expected Response:**
```json
{
  "success": true,
  "status": "connected",
  "tables": [
    {"table_name": "User", "column_count": 8},
    {"table_name": "Product", "column_count": 25},
    {"table_name": "Category", "column_count": 6},
    {"table_name": "Order", "column_count": 12}
  ],
  "recordCounts": {
    "users": 5,
    "products": 50,
    "categories": 10,
    "orders": 25
  },
  "message": "Database is accessible and has data"
}
```

**What to Check:**
- ✅ All expected tables exist (User, Product, Category, Order, etc.)
- ✅ Table structures match your Prisma schema
- ✅ Record counts are reasonable

---

#### 4. **Verify Product Toggle Persistence** (Admin Feature Test)

To confirm the Deactivate/Activate button works correctly:

1. **Login to Admin Panel:**
   ```
   https://your-domain.vercel.app/auth/login
   Email: admin@skyzonebd.com
   Password: 11admin22
   ```

2. **Navigate to Products:**
   ```
   https://your-domain.vercel.app/admin/products
   ```

3. **Test Toggle:**
   - Click "Deactivate" on an active product
   - Verify button changes to "Activate" immediately
   - Refresh the page
   - Confirm the button still shows "Activate" (proves DB persistence)

4. **Verify via API:**
   ```bash
   # Check DB status shows correct active/inactive counts
   curl https://your-domain.vercel.app/api/db/status
   ```

---

### Required Environment Variables for Verification

Make sure these are set in Vercel (Project Settings → Environment Variables):

```env
# Database
DATABASE_URL="postgresql://..."

# Migration/Sync endpoints security
MIGRATION_SECRET_KEY="your-secret-key-here"

# Authentication
JWT_SECRET="your-jwt-secret"
```

**Security Note:** Never expose `MIGRATION_SECRET_KEY` in client-side code or public documentation. Store it securely in Vercel environment variables.

---

### Automated Build Migration Process

**How Vercel Handles Migrations Automatically:**

1. **Build Command:** `npm run vercel-build`
   - Runs `node scripts/migrate.js`
   - Executes Prisma migrations or db push
   - Builds Next.js application

2. **Post-Install Hook:** `npm run postinstall`
   - Runs `prisma generate`
   - Creates Prisma Client for the build

3. **Migration Script Logic:** (in `scripts/migrate.js`)
   - Development: Uses `prisma migrate dev`
   - Production: Uses `prisma db push` (safe for Vercel Postgres)
   - Fallback: Tries `prisma migrate deploy` if push fails

**What This Means:**
- ✅ Every Vercel deployment automatically applies schema changes
- ✅ No manual migration commands needed
- ✅ Database stays in sync with your codebase
- ✅ Safe for production (uses `db push`, not migrate dev)

**To Verify Auto-Migration Works:**
1. Make a schema change in `prisma/schema.prisma`
2. Push to GitHub (triggers Vercel deployment)
3. After deployment, check `/api/migrate` endpoint
4. Confirm "up to date" status

---

## 🎉 You're Live!

Your Skyzone e-commerce platform is now running on Vercel with:
- ✅ PostgreSQL database
- ✅ Blob storage for images
- ✅ Automatic deployments
- ✅ SSL certificates
- ✅ CDN delivery
- ✅ Serverless functions

**Next Steps:**
- Upload real product images
- Configure payment gateways
- Set up email service (SendGrid, Resend, etc.)
- Enable analytics
- Add custom domain

---

**Need Help?**
- Vercel Support: https://vercel.com/support
- Prisma Discord: https://pris.ly/discord
- GitHub Issues: Create an issue in your repository

**Last Updated:** October 2024  
**Version:** 1.0.0
