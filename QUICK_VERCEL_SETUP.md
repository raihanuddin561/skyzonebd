# Quick Setup Guide - Initialize Vercel Database

## 🎯 Your Current Situation
Your Vercel deployment is working, but the database tables don't exist yet. You need to:
1. Run Prisma migrations to create tables
2. Seed the database with initial data

## 🚀 Quick Steps to Fix

### Step 1: Configure Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these **required** variables:

```bash
DATABASE_URL=<your-postgres-prisma-url>
JWT_SECRET=<generate-strong-random-32-char-string>
NEXTAUTH_SECRET=<generate-another-strong-random-string>
BLOB_READ_WRITE_TOKEN=<your-vercel-blob-token>
```

**Required for seeding:**
```bash
SEED_SECRET=<generate-strong-random-32-char-string>
```

### Step 2: Trigger Redeploy (Creates Tables)

After adding environment variables:
1. Go to **Deployments** tab in Vercel
2. Click the ⋮ menu on latest deployment
3. Click **Redeploy** → Check "Use existing build cache"
4. The migration will run automatically during build

### Step 3: Seed the Database

#### Option A: Using the Seed API (Requires SEED_SECRET)

Once deployment is complete, call the seed endpoint with authentication:

```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Authorization: Bearer YOUR_SEED_SECRET"
```

**Note:** You MUST set `SEED_SECRET` in Vercel environment variables first. The endpoint is protected and won't work without it.

#### Option B: Using Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Pull production env vars
vercel env pull .env.production

# Run seed against production
DATABASE_URL="your-production-url" npm run db:seed
```

### Step 4: Verify

Check these URLs:
- ✅ Database status: `https://your-app.vercel.app/api/db/status`
- ✅ Products API: `https://your-app.vercel.app/api/products`
- ✅ Categories API: `https://your-app.vercel.app/api/categories`

To check seed status (requires SEED_SECRET):
```bash
curl https://your-app.vercel.app/api/seed \
  -H "Authorization: Bearer YOUR_SEED_SECRET"
```

---

## 📋 Checklist

- [ ] Add `DATABASE_URL` to Vercel environment variables
- [ ] Add `JWT_SECRET` to Vercel environment variables
- [ ] Add `NEXTAUTH_SECRET` to Vercel environment variables
- [ ] Add `BLOB_READ_WRITE_TOKEN` to Vercel environment variables
- [ ] Add `SEED_SECRET` to Vercel environment variables (required for seeding)
- [ ] Redeploy to run migrations (creates tables)
- [ ] Call `/api/seed` endpoint with SEED_SECRET to populate data
- [ ] Verify products appear on the website

---

## 🔍 What Gets Created

When you seed the database, you'll get:

**Categories (3):**
- Electronics
- Baby Items
- Fashion

**Products (8):**
- Wireless Bluetooth Headphones ($79.99)
- Smart Watch Pro ($299.99)
- Wireless Mouse ($24.99)
- Baby Stroller Premium ($249.99)
- Baby Carrier Ergonomic ($89.99)
- Baby Toys Set ($34.99)
- Premium Cotton T-Shirt ($19.99)
- Denim Jeans Classic ($59.99)

All products use Unsplash images (free CDN).

---

## 🆘 Troubleshooting

### Error: "The table 'public.products' does not exist"
**Solution:** Redeploy the app. The migration runs during build.

### Error: "Database already seeded"
**Solution:** This is good! Your database is already populated.

### Error: Unauthorized when calling /api/seed
**Solution:** You MUST set `SEED_SECRET` in Vercel environment variables and include it in the Authorization header:
```bash
curl -X POST https://your-app.vercel.app/api/seed \
  -H "Authorization: Bearer your-seed-secret-here"
```

### Error: Seeding disabled
**Solution:** The `SEED_SECRET` environment variable is not set in Vercel. Add it first.

### Products API returns empty array
**Solution:** The tables exist but aren't seeded. Call `/api/seed` endpoint.

---

## 📚 Full Documentation

For complete details, see `VERCEL_SETUP.md` in your project root.

---

## 🎉 That's It!

Once you complete these steps, your Vercel deployment will have:
- ✅ Database tables created
- ✅ Sample products and categories
- ✅ Working API endpoints
- ✅ Functional e-commerce site
