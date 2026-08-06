# 📋 TECHNICAL SEO QA CHECKLIST & VERIFICATION GUIDE
**SkyzoneBD - Bangladesh B2B Wholesale Electrical Hardware**

## ✅ PRE-DEPLOYMENT CHECKLIST

### 1. Build Verification
```bash
cd d:\partnershipbusinesses\skyzone\skyzonebd
npm run build
```
**Expected:** 
- ✅ 0 errors
- ✅ Static pages generated
- ✅ Dynamic routes configured
- ✅ Sitemap route visible

**Check Build Output:**
```
.next/server/app/
  ├── robots.ts.meta (static)
  ├── sitemap.xml/ (ISR)
  └── page.html (static/ISR)
```

---

### 2. Local Testing

#### Test Robots.txt
```bash
# Start dev/production server
npm run dev  # or npm run start

# Test robots.txt in browser
http://localhost:3000/robots.txt
```

**Verify Contains:**
```
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /account/
Disallow: /profile/
Disallow: /auth/
Disallow: /checkout/
Disallow: /orders/
Disallow: /wishlist/
Disallow: /partner/
Disallow: /data-deletion/

Sitemap: https://skyzonebd.shop/sitemap.xml
```

#### Test Sitemap
```bash
# View in browser
http://localhost:3000/sitemap.xml
```

**Verify:**
- ✅ Contains homepage
- ✅ Contains /products
- ✅ Contains /search
- ✅ Contains policy pages
- ✅ Contains dynamic product URLs (check 5+)
- ✅ Contains dynamic category URLs (check 3+)
- ✅ NO /api/ URLs
- ✅ NO /admin/ URLs
- ✅ NO /auth/ URLs
- ✅ All URLs start with https://skyzonebd.shop

**Count URLs:**
```bash
curl http://localhost:3000/sitemap.xml | grep -o "<url>" | wc -l
```
**Expected:** 50+ URLs (7 static + products + categories)

#### Test Middleware Headers
```bash
# Test API route protection
curl -I http://localhost:3000/api/products

# Should include:
# X-Robots-Tag: noindex, nofollow, noarchive, nosnippet

# Test admin route protection
curl -I http://localhost:3000/admin

# Should include:
# X-Robots-Tag: noindex, nofollow
```

#### Test Page Metadata
Open in browser and inspect `<head>`:

**Homepage (/):**
```html
<title>SkyzoneBD - Bangladesh B2B Wholesale Electrical Hardware | LED, Bulbs, Wires, Switches</title>
<meta name="description" content="Bangladesh's #1 B2B wholesale marketplace..." />
<link rel="canonical" href="https://skyzonebd.shop" />
<meta property="og:url" content="https://skyzonebd.shop" />
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization"...}</script>
```

**Products (/products):**
```html
<title>All Products - Wholesale Electrical Hardware Bangladesh | SkyzoneBD</title>
<meta name="description" content="Browse 1000+ wholesale electrical hardware..." />
<link rel="canonical" href="https://skyzonebd.shop/products" />
```

**Search (/search):**
```html
<title>Search Products - Find Wholesale Electrical Hardware | SkyzoneBD</title>
<link rel="canonical" href="https://skyzonebd.shop/search" />
```

**Admin (/admin):**
```html
<meta name="robots" content="noindex, nofollow" />
```

**Profile (/profile):**
```html
<!-- Should have X-Robots-Tag header from middleware -->
```

#### Test Structured Data
Open homepage, view source, find JSON-LD:

**Organization Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SkyzoneBD",
  "url": "https://skyzonebd.shop",
  ...
}
```

**WebSite Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "SkyzoneBD",
  "potentialAction": {
    "@type": "SearchAction",
    ...
  }
}
```

---

## 🌐 PRODUCTION DEPLOYMENT CHECKLIST

### Day 0: Deploy

```bash
# Commit changes
git add .
git commit -m "feat: comprehensive SEO implementation with middleware protection"
git push origin main

# Deploy to Vercel (if using Vercel)
vercel --prod
```

**Verify Deployment:**
- ✅ Build succeeded
- ✅ No errors in deployment logs
- ✅ Site accessible at https://skyzonebd.shop

---

### Day 1: Post-Deployment Verification

#### 1. Verify Robots.txt (Production)
```bash
curl https://skyzonebd.shop/robots.txt
```
**Checklist:**
- ✅ Correct disallow rules
- ✅ Correct sitemap URL
- ✅ No 404 error

#### 2. Verify Sitemap (Production)
```bash
curl https://skyzonebd.shop/sitemap.xml
```
**Checklist:**
- ✅ Returns valid XML
- ✅ Contains 50+ URLs
- ✅ All URLs use correct domain (skyzonebd.shop)
- ✅ No /api/ or /admin/ URLs present

```bash
# Count URLs
curl https://skyzonebd.shop/sitemap.xml | grep -o "<url>" | wc -l

# Check for leaked routes (should return 0)
curl https://skyzonebd.shop/sitemap.xml | grep "/api/"
curl https://skyzonebd.shop/sitemap.xml | grep "/admin/"
```

#### 3. Verify API Protection
```bash
curl -I https://skyzonebd.shop/api/products
curl -I https://skyzonebd.shop/api/admin/data-deletion-requests
```
**Must See:**
```
X-Robots-Tag: noindex, nofollow, noarchive, nosnippet
```

#### 4. Verify Admin Protection
```bash
curl -I https://skyzonebd.shop/admin
curl -I https://skyzonebd.shop/dashboard
curl -I https://skyzonebd.shop/orders
```
**Must See:**
```
X-Robots-Tag: noindex, nofollow
```

#### 5. Test Key Pages

Visit these URLs and verify metadata:

**Homepage:**
https://skyzonebd.shop
- ✅ Title contains "Bangladesh B2B Wholesale Electrical Hardware"
- ✅ Description mentions LED, bulbs, wires, switches
- ✅ Canonical URL present
- ✅ OG tags present
- ✅ Structured data present (2 schemas)

**Products:**
https://skyzonebd.shop/products
- ✅ Title contains "All Products - Wholesale Electrical Hardware"
- ✅ Canonical URL present

**Search:**
https://skyzonebd.shop/search
- ✅ Title contains "Search Products"
- ✅ Canonical URL present

**Random Product:**
https://skyzonebd.shop/products/[any-product-id]
- ✅ Page loads
- ✅ Title visible (may need P1 implementation for dynamic)

**Random Category:**
https://skyzonebd.shop/products/category/[any-category-id]
- ✅ Page loads
- ✅ Title visible (may need P1 implementation for dynamic)

#### 6. Google Search Console Setup

**a) Add Property**
1. Go to https://search.google.com/search-console
2. Click "Add Property"
3. Enter: `https://skyzonebd.shop`
4. Choose verification method:
   - **Option 1:** HTML file upload
   - **Option 2:** DNS TXT record (recommended)
   - **Option 3:** Google Analytics (if already installed)

**b) Submit Sitemap**
1. In GSC, go to Sitemaps (left sidebar)
2. Enter: `sitemap.xml`
3. Click "Submit"
4. Wait 1-2 hours
5. Verify status shows "Success"

**c) Request Indexing (Priority Pages)**

Use URL Inspection tool for these URLs:
1. https://skyzonebd.shop (homepage)
2. https://skyzonebd.shop/products
3. Top 3 product pages
4. Top 2 category pages
5. https://skyzonebd.shop/search

For each URL:
- Enter URL in inspection tool
- Click "Request Indexing"
- Wait for confirmation

---

### Day 2-7: Monitoring

#### Check GSC Coverage Report
1. Go to GSC → Coverage
2. Verify:
   - ✅ "Valid" pages increasing
   - ✅ No errors
   - ✅ "Excluded" pages include /api/, /admin/, /auth/

#### Check Sitemaps Report
1. Go to GSC → Sitemaps
2. Verify:
   - ✅ Status: "Success"
   - ✅ Discovered URLs: 50+
   - ✅ "Couldn't fetch" count: 0

#### Check Index Coverage
Wait 3-5 days, then check:
```bash
site:skyzonebd.shop
```
**Expected:** 20-50+ indexed pages

#### Security Verification
```bash
site:skyzonebd.shop inurl:api
site:skyzonebd.shop inurl:admin
site:skyzonebd.shop inurl:dashboard
```
**Expected:** 0 results each

---

## 🔍 STRUCTURED DATA VALIDATION

### Google Rich Results Test
1. Go to https://search.google.com/test/rich-results
2. Test these URLs:
   - https://skyzonebd.shop (Organization + WebSite)
   - https://skyzonebd.shop/products/[product-id] (after P1)
   - https://skyzonebd.shop/products/category/[cat-id] (after P1)

**Expected Results:**
- ✅ Organization schema valid
- ✅ WebSite schema valid
- ✅ 0 errors
- ✅ Warnings acceptable

### Schema.org Validator
1. Go to https://validator.schema.org/
2. Test same URLs
3. Verify no errors

---

## 📊 PERFORMANCE TESTING

### Google PageSpeed Insights
1. Go to https://pagespeed.web.dev/
2. Test: https://skyzonebd.shop

**Target Scores:**
- Performance: 80+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Lighthouse CLI
```bash
npm install -g lighthouse
lighthouse https://skyzonebd.shop --output=html --output-path=./lighthouse-report.html
```

**Review:**
- SEO score
- Metadata presence
- Structured data
- Mobile-friendliness

### Mobile-Friendly Test
1. Go to https://search.google.com/test/mobile-friendly
2. Test: https://skyzonebd.shop
3. Verify: "Page is mobile-friendly"

---

## 🐛 TROUBLESHOOTING

### Issue: Sitemap shows 0 products

**Diagnosis:**
```bash
# Check if database connection works
curl https://skyzonebd.shop/api/products
```

**Solution:**
1. Verify DATABASE_URL environment variable
2. Check Prisma client generation
3. Review sitemap.ts error handling

---

### Issue: X-Robots-Tag headers not appearing

**Diagnosis:**
```bash
curl -I https://skyzonebd.shop/api/products | grep -i "x-robots"
```

**Solution:**
1. Verify middleware.ts is in src/ folder
2. Check middleware.ts matcher config
3. Restart server
4. Clear CDN cache (if using CDN)

---

### Issue: API routes still appearing in Google

**Diagnosis:**
```bash
site:skyzonebd.shop inurl:api
```

**Solution:**
1. Verify robots.txt has disallow
2. Verify X-Robots-Tag headers present
3. Request removal in GSC (temporary)
4. Wait 1-2 weeks for recrawl

---

### Issue: Structured data errors

**Diagnosis:**
Use https://validator.schema.org/

**Common Fixes:**
- Add missing required fields
- Fix URL formatting
- Ensure proper JSON syntax
- Check for null values

---

## 📈 SUCCESS METRICS

### Week 1
- ✅ 0 crawl errors in GSC
- ✅ Sitemap submitted & processed
- ✅ 10+ pages indexed
- ✅ 0 API/admin pages indexed

### Week 2-4
- 📈 50+ pages indexed
- 📈 Impressions: 100-500/day
- 📈 Clicks: 5-20/day
- 📈 Rich results appearing

### Month 2-3
- 🎯 Top 20 for "wholesale electrical bangladesh"
- 🎯 Top 10 for long-tail keywords
- 🎯 100-200% traffic increase
- 🎯 CTR improvement to 3-5%

---

## 📝 WEEKLY MONITORING CHECKLIST

**Every Monday:**
- [ ] Check GSC Coverage report
- [ ] Review Performance report
- [ ] Check for new errors
- [ ] Review top queries
- [ ] Check indexing progress

**Every Month:**
- [ ] Run Lighthouse audit
- [ ] Check PageSpeed scores
- [ ] Review keyword rankings
- [ ] Analyze traffic growth
- [ ] Update content strategy

---

## 🚀 NEXT STEPS (P1)

After P0 is verified working:

1. **Implement Product Dynamic Metadata**
   - Convert product pages to server components
   - Add generateMetadata function
   - Add ProductSchema and BreadcrumbSchema

2. **Implement Category Dynamic Metadata**
   - Convert category pages to server components
   - Add generateMetadata function
   - Add BreadcrumbSchema

3. **Content Enhancement**
   - Add category descriptions (100+ words)
   - Add FAQ sections
   - Build internal linking structure

---

**Last Updated:** January 20, 2026
**Status:** P0 Complete - Ready for Production Testing
