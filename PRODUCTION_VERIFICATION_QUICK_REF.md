# 🚀 Quick Production Verification Reference

## Database & Migration Status - Quick Commands

### 1. Basic Database Health Check (Public)
```bash
curl https://your-domain.vercel.app/api/db/status
```
✅ Check: `status: "connected"` and product counts

---

### 2. Migration Status (Requires Auth)
```bash
curl -H "Authorization: Bearer YOUR_MIGRATION_SECRET_KEY" \
  https://your-domain.vercel.app/api/migrate
```
✅ Check: `"status": "Database schema is up to date!"`

---

### 3. Database Tables & Counts (Requires Auth)
```bash
curl -H "Authorization: Bearer YOUR_MIGRATION_SECRET_KEY" \
  https://your-domain.vercel.app/api/db-sync
```
✅ Check: All tables present with correct record counts

---

## Product Toggle Test (Admin Panel)

1. Login: `https://your-domain.vercel.app/auth/login`
2. Navigate: `https://your-domain.vercel.app/admin/products`
3. Click "Deactivate" on any product
4. ✅ Button changes to "Activate" immediately
5. Refresh page
6. ✅ Button still shows "Activate" (DB persistence confirmed)

---

## Environment Variables Required

Add to Vercel (Project Settings → Environment Variables):

```env
DATABASE_URL="postgresql://..."
MIGRATION_SECRET_KEY="your-secret-key-min-32-chars"
JWT_SECRET="your-jwt-secret"
```

---

## Expected Responses

### /api/db/status (Success)
```json
{
  "success": true,
  "status": "connected",
  "statistics": {
    "products": 50,
    "activeProducts": 45,
    "inactiveProducts": 5
  }
}
```

### /api/migrate (Success)
```json
{
  "success": true,
  "status": "Database schema is up to date!"
}
```

### /api/db-sync (Success)
```json
{
  "success": true,
  "status": "connected",
  "tables": [...],
  "recordCounts": {
    "users": 5,
    "products": 50
  }
}
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `status: "disconnected"` | Check `DATABASE_URL` in Vercel env vars |
| `401 Unauthorized` | Verify `MIGRATION_SECRET_KEY` is correct |
| Toggle not persisting | Check browser console for errors |
| Schema out of date | Redeploy to trigger auto-migration |

---

**Full Documentation:** See `VERCEL_DEPLOYMENT_GUIDE.md` or `ADMIN_TOGGLE_AND_MIGRATION_FIX.md`
