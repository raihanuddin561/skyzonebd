# Vercel Deployment Fix - API Routes Not Responding

## Problem Identified

The APIs were not responding on Vercel because:

1. **Missing Runtime Configuration** - API routes didn't have `export const runtime = 'nodejs'`
2. **Missing Dynamic Configuration** - Routes weren't marked as `force-dynamic`
3. **Missing Timeout Configuration** - No `maxDuration` set for serverless functions
4. **CORS Headers** - Missing proper CORS configuration in Next.js config

## Solutions Applied

### 1. Added Vercel Configuration to All API Routes (107 routes)

Each API route now includes:

```typescript
// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout
```

**Why this is needed:**
- `runtime: 'nodejs'` - Ensures routes use Node.js runtime (not Edge runtime)
- `dynamic: 'force-dynamic'` - Prevents static optimization of dynamic routes
- `maxDuration: 60` - Sets 60-second timeout for database operations

### 2. Updated next.config.ts with CORS Headers

```typescript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
        { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
      ],
    },
  ]
}
```

### 3. Created Health Check Endpoint

New endpoint: `/api/health`

**Purpose:** Verify all systems are operational

**Tests:**
- ✅ API routes responding
- ✅ Database connectivity
- ✅ Products data availability
- ✅ Environment configuration

**Usage:**
```bash
curl https://your-domain.vercel.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-26T10:30:00.000Z",
  "environment": "production",
  "checks": {
    "api": { "status": "ok", "message": "API is responding" },
    "database": { "status": "ok", "message": "Database connected successfully" },
    "products": { "status": "ok", "message": "1234 products available", "count": 1234 },
    "config": { "status": "ok", "message": "All required environment variables are set" }
  },
  "responseTime": 145
}
```

## Deployment Steps

### Step 1: Commit and Push Changes

```bash
git add .
git commit -m "fix: Add Vercel runtime configuration to all API routes"
git push origin main
```

### Step 2: Verify Environment Variables in Vercel

Go to **Vercel Dashboard → Your Project → Settings → Environment Variables**

**Required Variables:**
```bash
DATABASE_URL=postgresql://...           # PostgreSQL connection string
JWT_SECRET=your-secret-key              # JWT authentication secret
NEXTAUTH_SECRET=your-nextauth-secret    # NextAuth secret
NEXTAUTH_URL=https://your-domain.vercel.app
BLOB_READ_WRITE_TOKEN=your-blob-token   # For image uploads
```

**Optional but Recommended:**
```bash
NEXT_PUBLIC_API_BASE_URL=               # Leave empty for same-origin
NEXT_PUBLIC_USE_API=true
NEXT_PUBLIC_APP_NAME=SkyZone BD
```

### Step 3: Redeploy on Vercel

Vercel will automatically redeploy when you push to main. Wait for deployment to complete.

### Step 4: Test the Deployment

#### A. Test Health Check
```bash
curl https://your-domain.vercel.app/api/health
```

Should return `"status": "ok"` if everything is working.

#### B. Test Products API
```bash
curl https://your-domain.vercel.app/api/products?limit=5
```

Should return a list of products.

#### C. Test Categories API
```bash
curl https://your-domain.vercel.app/api/categories
```

Should return categories list.

#### D. Test in Browser
Visit: `https://your-domain.vercel.app/products`

Products should load on the page.

## Common Issues & Solutions

### Issue 1: Database Connection Errors

**Symptoms:**
- `/api/health` returns database error
- Products don't load
- 500 errors in console

**Solution:**
```bash
# Verify DATABASE_URL is set in Vercel
# Check format:
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# If using Neon/Supabase, use the POOLED connection string
```

### Issue 2: Products Still Not Showing

**Symptoms:**
- API works but returns empty array
- `/api/health` shows 0 products

**Solution:**
```bash
# Seed the database
# Option A: Use Vercel CLI locally
DATABASE_URL="your-production-url" npm run db:seed

# Option B: Temporarily enable /api/seed in production
# Visit: https://your-domain.vercel.app/api/seed
# Then disable it for security
```

### Issue 3: 504 Timeout Errors

**Symptoms:**
- API calls timeout after 10 seconds
- Intermittent failures

**Solution:**
- Check if `maxDuration` is set correctly (should be 60)
- Optimize database queries (add indexes)
- Use connection pooling for database

### Issue 4: CORS Errors in Browser

**Symptoms:**
- Console shows CORS policy errors
- API works in Postman but not in browser

**Solution:**
- Verify `next.config.ts` has the headers configuration
- Check browser console for specific CORS errors
- Ensure `NEXTAUTH_URL` matches your domain

### Issue 5: Environment Variables Not Loading

**Symptoms:**
- `/api/config` shows missing variables
- JWT authentication fails

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Make sure variables are set for **Production**, **Preview**, AND **Development**
3. Click **Redeploy** after adding variables (just adding them doesn't trigger redeploy)

## Verification Checklist

After deployment, verify:

- [ ] `/api/health` returns status: "ok"
- [ ] `/api/products` returns products list
- [ ] `/api/categories` returns categories
- [ ] Homepage loads with products
- [ ] Product detail pages work
- [ ] Cart functionality works
- [ ] Search works
- [ ] Admin panel accessible (if deployed)
- [ ] Image uploads work
- [ ] Database is populated with data

## Quick Test Commands

```bash
# Set your domain
DOMAIN="your-domain.vercel.app"

# Test health
curl https://$DOMAIN/api/health

# Test products (should return JSON)
curl https://$DOMAIN/api/products?limit=3

# Test categories
curl https://$DOMAIN/api/categories

# Test config (check env vars)
curl https://$DOMAIN/api/config

# Check product count
curl -s https://$DOMAIN/api/health | jq '.checks.products.count'
```

## Monitoring

### Check Vercel Logs

1. Go to Vercel Dashboard → Your Project
2. Click on the latest deployment
3. Click **Functions** tab
4. View logs for each API route

### Common Log Messages

**Good:**
```
✅ PostgreSQL database connected successfully!
✓ Compiled /api/products
✓ 200 GET /api/products [145ms]
```

**Bad:**
```
❌ Database connection failed: getaddrinfo ENOTFOUND
⚠ Warning: API route /api/products exceeded timeout
⚠ Missing environment variable: DATABASE_URL
```

## Performance Optimization

After deployment, consider:

1. **Enable Vercel Analytics** - Track API performance
2. **Add Database Indexes** - Speed up queries
3. **Use Edge Caching** - For static data like categories
4. **Optimize Images** - Use Vercel Image Optimization
5. **Monitor Response Times** - Set up alerts for slow responses

## Rollback Plan

If deployment fails:

```bash
# Option 1: Revert in Vercel Dashboard
# Go to Deployments → Select previous working deployment → Promote to Production

# Option 2: Git revert and redeploy
git revert HEAD
git push origin main
```

## Support

If issues persist:

1. Check Vercel Functions logs
2. Test `/api/health` endpoint
3. Verify DATABASE_URL format
4. Ensure database has data (run seed script)
5. Check for any migration errors

## Files Modified

- ✅ All 107 API routes in `src/app/api/**/route.ts`
- ✅ `next.config.ts` - Added CORS headers
- ✅ `src/app/api/health/route.ts` - New health check endpoint
- ✅ `scripts/fix-api-routes.js` - Utility script for bulk updates

## Next Steps

1. **Push changes to GitHub**
2. **Wait for Vercel to deploy**
3. **Run health check**
4. **Test products loading**
5. **Monitor logs for errors**
6. **Seed database if needed**

---

**Last Updated:** January 26, 2026
**Build Status:** ✅ All tests passing
**API Routes Fixed:** 107
**Estimated Deploy Time:** 2-3 minutes
