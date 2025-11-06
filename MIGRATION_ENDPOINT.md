# Database Migration Guide

Two safe ways to sync your database schema without losing data.

## Option 1: DB Push (Recommended - No Data Loss)

`prisma db push` syncs your schema directly without creating migration files. **Safe for existing data.**

### Method A: Via API Endpoint

**POST** `/api/db-sync` - Check database status and get instructions  
**GET** `/api/db-sync` - View current tables and record counts

```bash
# Check database status
curl https://your-domain.vercel.app/api/db-sync \
  -H "Authorization: Bearer your-secret-key"

# This will show you current tables and data counts
```

### Method B: Via Vercel CLI (Best Practice)

```bash
# 1. Pull environment variables
vercel env pull

# 2. Run db push (syncs schema without migrations)
npx prisma db push

# This updates your database schema while preserving all existing data
```

### Method C: Locally

```bash
npm run db:push
```

---

## Option 2: Migrations (Production Standard)

Use migrations for production deployments with version control.

**POST** `/api/migrate` - Run pending migrations  
**GET** `/api/migrate` - Check migration status

### Run Migrations via API

```bash
curl -X POST https://your-domain.vercel.app/api/migrate \
  -H "Authorization: Bearer your-migration-secret-key"
```

### Run Migrations via CLI

```bash
vercel env pull
npx prisma migrate deploy
```

---

## Which Method to Use?

### Use `prisma db push` when:
- ✅ You're in development
- ✅ You want quick schema updates
- ✅ You have existing data you want to keep
- ✅ You don't need migration history

### Use `prisma migrate` when:
- ✅ You're in production
- ✅ You need version control for schema changes
- ✅ You want rollback capability
- ✅ Multiple developers are working on the project

---

## Setup in Vercel

1. Go to project settings → Environment Variables
2. Add: `MIGRATION_SECRET_KEY` = `your-secure-random-key`
3. Add: `DATABASE_URL` = `your-postgres-connection-string`
4. Deploy

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "status": "connected",
  "tables": [...],
  "recordCounts": {
    "users": 150,
    "products": 320,
    "orders": 89
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Database operation failed",
  "details": "..."
}
```

---

## Safety Notes

✅ **DB Push** - Safe, preserves data, updates schema directly  
✅ **Migrations** - Safe, version controlled, can be rolled back  
⚠️ **Never** run destructive SQL manually without backups  
⚠️ **Always** test schema changes in development first

---

## Quick Reference

```bash
# Check database status
curl https://your-app.vercel.app/api/db-sync \
  -H "Authorization: Bearer YOUR_SECRET"

# Sync schema (no data loss)
vercel env pull && npx prisma db push

# Run migrations (production)
vercel env pull && npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```
