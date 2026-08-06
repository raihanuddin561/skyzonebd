# Hero Slides Management System

## Overview
The Hero Slides system allows admins to manage dynamic promotional banners on the homepage. Each slide can showcase products, promotions, or custom content with full visual customization.

## Features

### ✅ Implemented
1. **Database Model** - HeroSlide table with Prisma ORM
2. **Admin API** - Full CRUD operations with JWT authentication
3. **Admin UI** - Management interface at `/admin/hero-slides`
4. **Product Integration** - Link slides to specific products
5. **Image Upload** - Vercel Blob storage support
6. **Edit Mode** - Update existing slides
7. **Active/Inactive Toggle** - Show/hide slides without deleting
8. **Custom Styling** - Background and text color customization
9. **Auto-Rotation** - 5-second intervals with smooth transitions
10. **Responsive Design** - Mobile (250px) and Desktop (350px) heights

## Database Schema

```prisma
model HeroSlide {
  id         String   @id @default(uuid())
  title      String
  subtitle   String?
  imageUrl   String
  linkUrl    String?
  productId  String?
  buttonText String   @default("Shop Now")
  position   Int      @default(autoincrement())
  isActive   Boolean  @default(true)
  bgColor    String   @default("#3B82F6")
  textColor  String   @default("#FFFFFF")
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  product    Product? @relation(fields: [productId], references: [id])
  
  @@index([position])
  @@index([isActive])
}
```

## API Endpoints

### GET /api/hero-slides
**Public Access** (filtered to active slides only)
**Admin Access** (returns all slides)

```typescript
// Response
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Summer Sale",
      "subtitle": "Up to 50% off",
      "imageUrl": "https://...",
      "linkUrl": "/products",
      "productId": null,
      "buttonText": "Shop Now",
      "position": 1,
      "isActive": true,
      "bgColor": "#3B82F6",
      "textColor": "#FFFFFF",
      "product": null
    }
  ]
}
```

### POST /api/hero-slides
**Admin Only** - Create new slide

```typescript
// Request Body
{
  "title": "New Slide",
  "subtitle": "Optional subtitle",
  "imageUrl": "https://...",
  "linkUrl": "/products/123",
  "productId": "product-uuid", // Optional
  "buttonText": "Click Here",
  "bgColor": "#3B82F6",
  "textColor": "#FFFFFF"
}
```

### PUT /api/hero-slides/[id]
**Admin Only** - Update existing slide

### DELETE /api/hero-slides/[id]
**Admin Only** - Delete slide

## Admin UI Features

### Access
- Navigate to `/admin/hero-slides` from admin dashboard
- Link available in sidebar under "Content" section
- Quick action card on admin dashboard

### Create/Edit Form
- **Title** (required) - Main heading
- **Subtitle** (optional) - Secondary text
- **Image Upload** - Upload to Vercel Blob or paste URL
- **Product Selector** - Dropdown of all products (auto-links)
- **Custom Link** - Override with custom URL
- **Button Text** - CTA button label
- **Background Color** - Color picker
- **Text Color** - Color picker

### Slide Management
- **Active/Inactive Toggle** - Green = active, Gray = inactive
- **Edit Button** - Populate form with existing data
- **Delete Button** - Remove slide (with confirmation)
- **Image Preview** - Visual preview of slide image
- **Product Badge** - Shows linked product name

## Frontend Display

### Homepage Integration
Location: `src/app/page.tsx`

```typescript
// Fetches active slides on mount
useEffect(() => {
  fetch('/api/hero-slides')
    .then(res => res.json())
    .then(data => setHeroSlides(data.data));
}, []);

// Auto-rotation every 5 seconds
useEffect(() => {
  if (heroSlides.length > 1) {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => 
        prev === heroSlides.length - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }
}, [heroSlides.length]);
```

### Slide Layout
- **Two-Column Design**
  - Left: Title, subtitle, CTA button
  - Right: Product showcase (if linked)
- **Background Options**
  - Solid color (bgColor)
  - Background image with overlay
- **Product Display**
  - Product image (48x48)
  - Product name
  - Price in BDT
  - Hover scale effect

### Responsive Heights
- Mobile: `h-[250px]`
- Desktop: `md:h-[350px]`

## Usage Guide

### Creating a Generic Slide
1. Go to `/admin/hero-slides`
2. Click "Add New Slide"
3. Fill in title, subtitle
4. Upload image or paste URL
5. Set custom link (e.g., `/products`, `/categories/electronics`)
6. Choose colors
7. Click "Create Slide"

### Creating a Product Promotion
1. Go to `/admin/hero-slides`
2. Click "Add New Slide"
3. Fill in title, subtitle
4. Upload image
5. **Select product from dropdown** (auto-fills link)
6. Customize button text (e.g., "Buy Now")
7. Choose colors
8. Click "Create Slide"

### Editing a Slide
1. Find slide in list
2. Click "Edit" button
3. Form populates with existing data
4. Make changes
5. Click "Update Slide"

### Managing Visibility
- Click **Active/Inactive** button to toggle
- Inactive slides don't show on homepage
- Useful for seasonal promotions

### Deleting a Slide
1. Click "Delete" button
2. Confirm in popup
3. Slide removed from database

## Sample SQL Seed
See `scripts/seed-hero-slides.sql` for sample data

## Best Practices

### Image Guidelines
- **Recommended Size**: 1200x400px minimum
- **Format**: JPG, PNG, WebP
- **File Size**: < 500KB for fast loading
- **Aspect Ratio**: 3:1 for best results

### Content Tips
- **Title**: 3-7 words, action-oriented
- **Subtitle**: Brief description (10-15 words)
- **Button Text**: Clear CTA ("Shop Now", "Learn More", "Buy Now")
- **Colors**: Ensure text contrast for readability

### Performance
- Limit to 3-5 active slides
- Use optimized images
- Product images cached from existing products

## Troubleshooting

### Slides Not Showing
1. Check `isActive` status in admin
2. Verify API response at `/api/hero-slides`
3. Check browser console for errors

### Images Not Loading
1. Verify image URL is accessible
2. Check CORS if external images
3. Re-upload to Vercel Blob

### Product Not Linking
1. Ensure product exists in database
2. Check productId in slide
3. Verify product slug is correct

## Future Enhancements
- Drag-drop reordering by position
- Schedule slides (start/end dates)
- Click tracking analytics
- A/B testing different slides
- Video background support
- Mobile-specific images

## Technical Stack
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Storage**: Vercel Blob
- **Auth**: JWT with admin role verification
