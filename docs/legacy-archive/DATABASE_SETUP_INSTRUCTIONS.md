# Database Setup Instructions

## 🎯 Quick Start

### Option 1: Use Vercel Postgres (Recommended for Production)

1. **Create Vercel Postgres Database:**
   ```bash
   # Via Vercel Dashboard
   https://vercel.com/dashboard → Storage → Create → Postgres
   ```

2. **Get Connection String:**
   - Copy the `DATABASE_URL` and `DIRECT_URL`
   - Add to `.env` file

3. **Update .env:**
   ```env
   DATABASE_URL="postgresql://user:pass@host:5432/database?sslmode=require"
   DIRECT_URL="postgresql://user:pass@host:5432/database?sslmode=require"
   ```

4. **Push Schema & Seed:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

### Option 2: Local PostgreSQL Development

1. **Install PostgreSQL:**
   - Windows: https://www.postgresql.org/download/windows/
   - Mac: `brew install postgresql`
   - Linux: `sudo apt-get install postgresql`

2. **Start PostgreSQL:**
   ```bash
   # Windows (Services)
   services.msc → PostgreSQL → Start

   # Mac/Linux
   brew services start postgresql
   # or
   sudo service postgresql start
   ```

3. **Create Database:**
   ```bash
   psql -U postgres
   CREATE DATABASE sagor_db;
   \q
   ```

4. **Update .env:**
   ```env
   DATABASE_URL="postgresql://postgres:your_password@localhost:5432/sagor_db"
   ```

5. **Setup Database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

### Option 3: Docker PostgreSQL (Easy Local Setup)

1. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'
   services:
     postgres:
       image: postgres:15
       environment:
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
         POSTGRES_DB: sagor_db
       ports:
         - '5432:5432'
       volumes:
         - postgres_data:/var/lib/postgresql/data
   
   volumes:
     postgres_data:
   ```

2. **Start Docker:**
   ```bash
   docker-compose up -d
   ```

3. **Update .env:**
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sagor_db"
   ```

4. **Setup Database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

## 📋 Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (no migration files)
npm run db:push

# Create migration files
npm run db:migrate

# Seed database with initial data
npm run db:seed

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (⚠️ deletes all data)
npm run db:reset
```

## 🔍 Verify Database Setup

After running seed, you should have:
- 3 users (admin, retail customer, wholesale customer)
- 4 categories
- 10 products with wholesale pricing tiers
- 1 sample order

**Test credentials:**
```
Admin:
  Email: admin@skyzone.com
  Password: admin123

Retail Customer:
  Email: customer@example.com
  Password: admin123

Wholesale Customer:
  Email: wholesale@example.com
  Password: admin123
```

## 🐛 Troubleshooting

### Error: "Can't reach database server"
**Solution:** Database isn't running. Start PostgreSQL service or use Docker.

### Error: "database does not exist"
**Solution:** Create the database first:
```bash
createdb sagor_db
# or via psql
psql -U postgres -c "CREATE DATABASE sagor_db;"
```

### Error: "password authentication failed"
**Solution:** Check your DATABASE_URL password is correct.

### Error: "relation already exists"
**Solution:** Database tables already exist. Either:
- Use `npm run db:reset` to start fresh
- Or modify seed to skip existing data

## 🚀 Quick Deploy to Vercel

If you want to skip local setup and go straight to production:

1. **Push code to GitHub**
2. **Import to Vercel** (vercel.com/new)
3. **Add Vercel Postgres** in dashboard
4. **Add environment variables**
5. **Deploy!**
6. **Seed production database:**
   ```bash
   vercel env pull .env.production
   DATABASE_URL="$(grep DATABASE_URL .env.production | cut -d '=' -f2-)" npm run db:seed
   ```

## 📊 Database Schema Overview

```
Users (with roles: ADMIN, SELLER, BUYER)
  ├── BusinessInfo (for B2B users)
  └── Orders
      └── OrderItems

Categories
  └── Products
      ├── WholesaleTiers (B2B pricing)
      └── OrderItems

Orders
  ├── Payments
  └── OrderItems

RFQs (Request for Quote - B2B feature)
  └── RFQItems
```

## 📝 Notes

- The seed file uses **placeholder image URLs** for development
- After deployment, upload real images via admin panel
- Images will be stored in Vercel Blob storage
- Passwords are hashed with bcrypt (strength: 10)

---

**Need Help?**
- Prisma Docs: https://www.prisma.io/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
