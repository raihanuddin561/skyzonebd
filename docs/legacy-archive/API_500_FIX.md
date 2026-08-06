# API 500 Error Fix - January 26, 2026

## Problem
Browser console showing: `❌ API call failed: ApiError: API Error: 500 - Network error occurred`

## Root Causes Fixed

### 1. **Incorrect API Base URL Configuration**
**Problem:** `apiConfig.ts` had empty string as fallback for `NEXT_PUBLIC_API_BASE_URL`, and `api.ts` had `http://localhost:8081` as fallback.

**Fix:** Changed both to use empty string (relative paths) for same-origin requests.

```typescript
// Before
BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8081',

// After  
BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '', // Relative URLs work in production
```

### 2. **Poor Error Handling**
**Problem:** All network errors were converted to generic "500 - Network error occurred" without details.

**Fix:** Improved error handling to show actual error messages:
- Timeout errors now show "Request timeout"
- Network errors show "Network error - Check internet connection or CORS settings"
- Added debug logging for all API requests

### 3. **URL Building Issue**
**Problem:** `buildApiUrl` was concatenating `BASE_URL + API_VERSION + endpoint`, causing double slashes when BASE_URL was empty.

**Fix:** Updated to handle empty BASE_URL correctly and ensure no double slashes.

## Files Modified
1. ✅ `src/config/apiConfig.ts` - Fixed BASE_URL and buildApiUrl
2. ✅ `src/config/api.ts` - Fixed BASE_URL  
3. ✅ `src/services/apiService.ts` - Improved error handling and logging

## Testing After Deployment

Once Vercel deploys the changes:

### 1. Check Browser Console
Open browser DevTools → Console tab
- You should now see: `🔄 API Request: /api/products` logs
- If errors occur, you'll see detailed error messages instead of generic "500 - Network error"

### 2. Test API Endpoints
```bash
# Health check
curl https://your-domain.vercel.app/api/health

# Products (should work now)
curl https://your-domain.vercel.app/api/products?limit=5
```

### 3. Check Network Tab
Open DevTools → Network tab
- API calls should go to same domain (not localhost:8081)
- Should see actual status codes (200, 404, 500, etc.) not just "500"

## Common Issues & Solutions

### If products still don't load:

**Check 1: Database Connection**
```bash
curl https://your-domain.vercel.app/api/health
```
Look for: `"database": { "status": "ok" }`

**Check 2: Products Exist**
If health check shows `"count": 0`, seed the database:
```bash
DATABASE_URL="your-production-url" npm run db:seed
```

**Check 3: CORS Headers**
Already fixed in previous deployment (next.config.ts has CORS headers).

### If you see CORS errors:
The CORS headers in `next.config.ts` should handle this, but verify:
```typescript
// In next.config.ts - Already added
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      // ... other CORS headers
    ],
  }]
}
```

## What Changed in This Deploy

### Before:
- API calls tried to go to `http://localhost:8081` in production ❌
- All errors showed generic "500 - Network error occurred" ❌
- No visibility into what was actually failing ❌

### After:
- API calls use relative URLs (same-origin) ✅
- Detailed error messages show actual problems ✅
- Debug logging helps troubleshoot issues ✅
- Better timeout handling ✅

## Next Steps

1. **Wait for Vercel deployment** (2-3 minutes)
2. **Test in browser** - Check console for detailed logs
3. **If errors persist** - Check error messages (they'll be specific now)
4. **Verify database** - Use `/api/health` endpoint

## Monitoring

### Good Indicators:
```
🔄 API Request: /api/products
✅ 200 GET /api/products [145ms]
```

### Bad Indicators (with details now):
```
❌ API Request failed: /api/products TypeError: Failed to fetch
// or
❌ API Error: 404 - Product not found
// or  
❌ API Error: 500 - Database connection failed
```

---

**Deployed:** January 26, 2026
**Status:** ✅ Pushed to GitHub
**Vercel:** Will auto-deploy
