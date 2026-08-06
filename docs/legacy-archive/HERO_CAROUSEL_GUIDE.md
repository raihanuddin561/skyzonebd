# Hero Carousel System - Complete Guide

## Overview
The hero carousel displays promotional banners with products on your homepage. You can select multiple products and customize each slide with unique text, colors, and images.

## Features

### ✨ Visual Features
- **Smooth Transitions**: 700ms fade and scale animations
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Touch/Swipe Support**: Mobile-friendly swipe gestures
- **Auto-Play**: Slides change every 5 seconds
- **Pause on Hover**: Auto-play pauses when user hovers
- **Product Cards**: Display product images and prices on slides
- **Custom Colors**: Set background and text colors per slide
- **Navigation Controls**: Arrow buttons and dot indicators
- **Slide Counter**: Shows current slide number

### 📱 Responsive Breakpoints
- **Mobile** (< 640px): 300px height, compact layout
- **Tablet** (640px - 768px): 350px height
- **Desktop** (768px - 1024px): 400px height
- **Large Desktop** (> 1024px): 450px height

## How to Add Products to Carousel

### Method 1: Through Admin Panel (Recommended)

1. **Navigate to Hero Slides Management**
   - Go to `/admin/hero-slides`
   - Click "+ Add New Slide"

2. **Fill in Slide Details**
   - **Title**: Main heading (e.g., "Featured Product! Limited Stock")
   - **Subtitle**: Supporting text (optional)
   - **Image**: Upload banner image or enter URL
   - **Product**: Select product from dropdown (product card will show on right)
   - **Button Text**: Call-to-action text (default: "Shop Now")
   - **Background Color**: Pick color for slide background
   - **Text Color**: Pick color for text (ensure good contrast)

3. **Product Display Options**
   - **With Product**: Product image and details appear on right side
   - **Without Product**: Full-width banner with custom image only

4. **Save and Activate**
   - Click "Create Slide"
   - Toggle "Active" to make it visible
   - Adjust "Position" to change order (lower numbers appear first)

### Method 2: When Creating New Product

1. **Go to Add New Product** (`/admin/products/new`)
2. **Fill in product details**
3. **Scroll to "Add to Hero Slider" checkbox**
4. **Check the box and fill in**:
   - Slide Title
   - Slide Subtitle
   - Button Text
   - Background Color
5. **Submit** - Product will be added to carousel automatically

## Managing Slides

### Edit Slide
1. Go to `/admin/hero-slides`
2. Find the slide you want to edit
3. Click "Edit" button
4. Update details
5. Click "Update Slide"

### Activate/Deactivate Slide
- Click the "Active/Inactive" button on any slide
- Only active slides appear on homepage

### Delete Slide
- Click "Delete" button
- Confirm deletion
- Slide is permanently removed

### Reorder Slides
- Edit slide and change "Position" value
- Lower numbers (0, 1, 2) appear first
- Higher numbers appear later

## Carousel Interactions

### Desktop
- **Hover**: Pause auto-play
- **Click Arrows**: Navigate manually
- **Click Dots**: Jump to specific slide
- **Click Product Card**: Go to product page
- **Click Button**: Follow link to product/category

### Mobile/Tablet
- **Swipe Left**: Next slide
- **Swipe Right**: Previous slide
- **Tap Dots**: Jump to specific slide
- **Tap Product**: Go to product page
- **Tap Button**: Follow link

## Best Practices

### Image Requirements
- **Dimensions**: 1920x450px (desktop), auto-resizes for mobile
- **Format**: JPG, PNG, or WebP
- **Size**: Keep under 500KB for fast loading
- **Quality**: High resolution for crisp display

### Text Guidelines
- **Title**: 4-8 words, clear and compelling
- **Subtitle**: 10-15 words, add context or urgency
- **Button Text**: 2-3 words, action-oriented ("Shop Now", "Learn More", "Get Deal")

### Color Selection
- **Contrast**: Ensure text is readable on background
- **Brand Colors**: Use your brand palette
- **Psychology**: Blue = trust, Red = urgency, Green = eco/health
- **Light Background**: Use dark text
- **Dark Background**: Use light text

### Product Selection
- Feature **bestsellers** or **new arrivals**
- Rotate **seasonal products**
- Highlight **promotional items**
- Showcase **high-margin products**
- Keep mix of **different categories**

## API Endpoints

### Get All Slides (Public)
```javascript
GET /api/hero-slides
Response: { success: true, data: [...slides] }
```

### Get All Slides (Admin - includes inactive)
```javascript
GET /api/hero-slides
Headers: { Authorization: "Bearer <token>" }
Response: { success: true, data: [...slides] }
```

### Create Slide (Admin only)
```javascript
POST /api/hero-slides
Headers: { Authorization: "Bearer <token>" }
Body: {
  title: string,
  subtitle?: string,
  imageUrl: string,
  productId?: string,
  linkUrl?: string,
  buttonText: string,
  bgColor: string,
  textColor: string,
  position?: number
}
```

### Update Slide (Admin only)
```javascript
PUT /api/hero-slides/[id]
Headers: { Authorization: "Bearer <token>" }
Body: { ...fields to update }
```

### Delete Slide (Admin only)
```javascript
DELETE /api/hero-slides/[id]
Headers: { Authorization: "Bearer <token>" }
```

## Database Schema

```prisma
model HeroSlide {
  id          String   @id @default(cuid())
  title       String
  subtitle    String?
  imageUrl    String
  linkUrl     String?
  productId   String?
  buttonText  String   @default("Shop Now")
  position    Int      @default(0)
  isActive    Boolean  @default(true)
  bgColor     String   @default("#3B82F6")
  textColor   String   @default("#FFFFFF")
  product     Product? @relation(...)
}
```

## Technical Details

### Animations
- **Slide In Left**: Title, subtitle, and button animate from left
- **Slide In Right**: Product card animates from right
- **Fade & Scale**: Slides fade and slightly scale when changing
- **Duration**: 700ms transition, 800ms animations
- **Delays**: Staggered by 200ms for cascading effect

### Auto-Play
- **Interval**: 5000ms (5 seconds)
- **Pause**: On mouse hover (desktop only)
- **Resume**: When mouse leaves
- **Reset**: After manual navigation

### Touch Support
- **Min Distance**: 50px swipe required
- **Direction**: Left = next, Right = previous
- **Smooth**: Uses same transition as arrow clicks

## Troubleshooting

### Slides Not Showing
- Check if slides are marked as "Active"
- Verify image URLs are valid
- Check browser console for errors
- Ensure at least one slide exists

### Images Not Loading
- Verify image URL is accessible
- Check Vercel Blob storage if using upload
- Ensure correct permissions
- Try uploading image again

### Carousel Not Auto-Playing
- Check if browser tab is active
- Verify at least 2 slides exist
- Check console for JavaScript errors
- Clear cache and reload

### Touch Swipe Not Working
- Ensure using mobile device or emulator
- Check if touch events are enabled
- Verify minimum swipe distance (50px)
- Test on different mobile browsers

## Examples

### Example 1: New Product Launch
```javascript
{
  title: "New iPhone 15 Pro Max",
  subtitle: "Pre-order now and get 10% off!",
  productId: "prod_123",
  buttonText: "Pre-Order Now",
  bgColor: "#000000",
  textColor: "#FFFFFF"
}
```

### Example 2: Seasonal Sale
```javascript
{
  title: "Summer Sale - Up to 50% Off",
  subtitle: "Limited time offer on electronics",
  linkUrl: "/products?category=electronics",
  buttonText: "Shop Sale",
  bgColor: "#F59E0B",
  textColor: "#FFFFFF"
}
```

### Example 3: Brand Feature
```javascript
{
  title: "Premium Quality Baby Products",
  subtitle: "Safe, tested, and certified",
  productId: "baby_001",
  buttonText: "View Collection",
  bgColor: "#EC4899",
  textColor: "#FFFFFF"
}
```

## Support

For issues or questions:
1. Check this guide first
2. Review browser console logs
3. Test on different devices
4. Contact admin support

---

**Last Updated**: November 5, 2025
**Version**: 2.0
