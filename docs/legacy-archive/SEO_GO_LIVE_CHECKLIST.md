# 🚀 GO-LIVE SEO CHECKLIST
**SkyzoneBD Technical SEO Implementation**

## ⏱️ BEFORE DEPLOYMENT (10 minutes)

```bash
# 1. Build verification
npm run build
# ✅ Must complete with 0 errors

# 2. Test locally
npm run start

# 3. Quick tests
curl http://localhost:3000/robots.txt
curl http://localhost:3000/sitemap.xml | grep -o "<url>" | wc -l
# ✅ Should show 50+ URLs

curl -I http://localhost:3000/api/products | grep -i "x-robots"
# ✅ Must show: X-Robots-Tag: noindex
```

**Pre-Deploy Checklist:**
- [ ] Build completes successfully
- [ ] robots.txt accessible
- [ ] sitemap.xml shows 50+ URLs
- [ ] API routes have X-Robots-Tag headers
- [ ] No console errors in browser

---

## 📦 DEPLOYMENT (5 minutes)

```bash
git add .
git commit -m "feat: comprehensive SEO implementation - P0 complete"
git push origin main

# If using Vercel
vercel --prod
```

**Verify:**
- [ ] Deployment succeeds
- [ ] Site accessible at https://skyzonebd.shop
- [ ] No build errors in logs

---

## ✅ POST-DEPLOYMENT (30 minutes)

### Immediate Tests (5 minutes)

```bash
# 1. Robots.txt
curl https://skyzonebd.shop/robots.txt
# ✅ Verify correct disallow rules

# 2. Sitemap
curl https://skyzonebd.shop/sitemap.xml | grep -o "<url>" | wc -l
# ✅ Should be 50+

# 3. API Protection
curl -I https://skyzonebd.shop/api/admin/data-deletion-requests | grep -i "x-robots"
# ✅ Must show: X-Robots-Tag: noindex, nofollow, noarchive, nosnippet

# 4. Admin Protection
curl -I https://skyzonebd.shop/admin | grep -i "x-robots"
# ✅ Must show: X-Robots-Tag: noindex, nofollow
```

### Browser Tests (10 minutes)

Visit and verify:
- [ ] https://skyzonebd.shop - Title, description, schemas visible
- [ ] https://skyzonebd.shop/products - Metadata correct
- [ ] https://skyzonebd.shop/search - Metadata correct
- [ ] Right-click → View Page Source → Search for "application/ld+json"
  - [ ] Organization schema present
  - [ ] WebSite schema present

### Google Search Console (15 minutes)

1. **Add Property** (5 min)
   - Go to https://search.google.com/search-console
   - Add `https://skyzonebd.shop`
   - Verify via DNS or HTML file

2. **Submit Sitemap** (2 min)
   - Click Sitemaps
   - Enter: `sitemap.xml`
   - Click Submit

3. **Request Indexing** (8 min)
   - URL Inspection → https://skyzonebd.shop
   - Click "Request Indexing"
   - Repeat for:
     - /products
     - 3 product pages
     - 2 category pages

---

## 📅 WEEK 1 MONITORING (Daily Check: 5 minutes)

**Day 1-3:**
- [ ] GSC: Sitemap status = "Success"
- [ ] GSC: No crawl errors
- [ ] Test: `site:skyzonebd.shop` (should start showing results)

**Day 4-7:**
- [ ] GSC Coverage: 10+ valid pages
- [ ] Security check: `site:skyzonebd.shop inurl:api` = 0 results
- [ ] Security check: `site:skyzonebd.shop inurl:admin` = 0 results

---

## 🎯 SUCCESS CRITERIA

### Week 1 (Must Achieve)
- ✅ 0 crawl errors
- ✅ Sitemap processed
- ✅ 10+ pages indexed
- ✅ 0 API/admin leaks

### Week 2-4 (Expected)
- 📈 50+ pages indexed
- 📈 Impressions: 100-500/day
- 📈 Structured data appearing in GSC

### Month 2-3 (Goal)
- 🎯 100-200% traffic increase
- 🎯 Top 20 for primary keywords
- 🎯 Rich results in SERPs

---

## 🚨 CRITICAL CHECKS

### Daily (First Week)
```bash
# API protection still working?
curl -I https://skyzonebd.shop/api/products | grep -i "x-robots"
```

### Weekly (First Month)
1. GSC Coverage report
2. Performance report
3. Indexing progress
4. Check for errors

---

## 📞 ESCALATION

**If issues occur:**

1. **Build fails:** Check error logs, verify Prisma connection
2. **No X-Robots-Tag:** Restart server, check middleware.ts location
3. **Sitemap empty:** Check DATABASE_URL, verify products exist
4. **API indexed:** Add temporary URL removal in GSC

---

## ✨ QUICK REFERENCE

**Verify Everything Working:**
```bash
# One-liner check
curl https://skyzonebd.shop/robots.txt && \
curl -I https://skyzonebd.shop/api/products | grep "X-Robots-Tag" && \
curl https://skyzonebd.shop/sitemap.xml | grep -c "<url>"
```

**Expected Output:**
```
User-agent: *
Disallow: /api/
...
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
50
```

---

## 📋 FINAL CHECKLIST

Before marking as complete:
- [ ] Deployed to production
- [ ] All 4 curl tests pass
- [ ] Browser tests pass (3 pages)
- [ ] GSC property added
- [ ] Sitemap submitted
- [ ] 5 URLs requested for indexing
- [ ] No console errors
- [ ] Structured data visible in source

**Status:** READY ✅

---

**Implementation:** January 20, 2026  
**Time to Complete:** ~50 minutes  
**Next Review:** Day 7 post-deployment
