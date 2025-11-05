# How to Add a Product to Hero Carousel - Step by Step Guide

## Method 1: From Admin Hero Slides Page (Recommended & Easiest)

### Step 1: Navigate to Hero Slides Management
1. Login as admin
2. Go to: `http://localhost:3000/admin/hero-slides`
3. You'll see all existing carousel slides

### Step 2: Click "Add New Slide"
Click the blue button that says **"+ Add New Slide"**

### Step 3: Fill in the Form

#### Basic Information:
- **Title** (Required): Your main heading
  - Example: `"iPhone 15 Pro - Now Available!"`
  - This will be the big text on the slide

- **Subtitle** (Optional): Supporting text
  - Example: `"Get 10% off on pre-orders"`
  - This appears below the title

#### Product Selection (THIS IS THE KEY PART):
- **Link to Product**: This dropdown shows all your products
  - Click the dropdown
  - **Select the specific product** you want to feature
  - Example: Select "JR-OH1 Bluetooth Headphone"
  - When you select a product, the product image and price will automatically appear on the right side of the carousel slide!

#### Styling:
- **Button Text**: What the button says
  - Default: "Shop Now"
  - Can change to: "Buy Now", "Learn More", "View Details", etc.

- **Background Color**: Click to choose color
  - This sets the background of the entire slide
  - Example: Blue (#3B82F6), Red (#EF4444), etc.

- **Text Color**: Click to choose text color
  - Make sure it contrasts with background
  - White text on dark background, Dark text on light background

### Step 4: Upload/Set Image
You have two options:

**Option A: Upload Image**
1. Click "Choose File"
2. Select an image from your computer
3. Wait for upload to complete

**Option B: Use Image URL**
1. If you already have an image URL
2. Paste it in the "Or Image URL" field

### Step 5: Save
1. Click **"Create Slide"**
2. Your slide is created!
3. It will appear in the list below

### Step 6: Activate the Slide
1. Find your newly created slide in the list
2. Click the **"Active"** button to make it visible on homepage
3. If it says "Inactive", click to toggle to "Active"

---

## Method 2: When Creating a New Product

### Step 1: Go to Add Product Page
1. Login as admin
2. Navigate to: `http://localhost:3000/admin/products/new`
3. Fill in all product details (name, price, description, etc.)

### Step 2: Scroll Down to "Add to Hero Slider" Section
Near the bottom of the form, you'll see:
- ☐ **Add to Hero Slider (Homepage Banner)**

### Step 3: Check the Box
Click the checkbox ☑ **Add to Hero Slider (Homepage Banner)**

### Step 4: Fill in Hero Slider Settings
A blue box will appear with these fields:

#### Slide Title (Required):
- Example: `"New Arrival - Baby Cotton Dress"`
- This is what shows on the carousel

#### Slide Subtitle (Optional):
- Example: `"Soft, comfortable, and affordable"`
- Extra description

#### Button Text:
- Default: "Shop Now"
- Can change to anything

#### Background Color:
- Pick a color using the color picker
- This product will use this color as background

### Step 5: Submit Product
1. Click **"Add Product"** button at bottom
2. The product will be added
3. A carousel slide will be automatically created for this product!

---

## Visual Example of How It Looks

### On Admin Page:
```
┌─────────────────────────────────────────────────────┐
│ Hero Slides Management                        [+Add]│
├─────────────────────────────────────────────────────┤
│                                                      │
│ [Image]  iPhone 15 Pro - Now Available!            │
│          Get 10% off on pre-orders                  │
│          Linked to: iPhone 15 Pro Max               │
│          Position: 0 | Button: Shop Now             │
│          [Active] [Edit] [Delete]                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### On Homepage (What Users See):
```
┌────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Left Side]                      [Right Side]                 │
│                                                                 │
│  iPhone 15 Pro -                  ┌──────────────┐            │
│  Now Available!                   │              │            │
│                                   │   [Product   │            │
│  Get 10% off                      │    Image]    │            │
│  on pre-orders                    │              │            │
│                                   └──────────────┘            │
│  [Shop Now Button]                iPhone 15 Pro Max          │
│                                   ৳125,000                    │
│                                                                 │
│                                 [●][○][○]  1/3                │
└────────────────────────────────────────────────────────────────┘
```

---

## Complete Real Example

Let me show you with actual data:

### Example 1: Featured Electronics Product

**Admin Form Filled Out:**
```
Title: "JR-OH1 Bluetooth Headphone - Premium Sound"
Subtitle: "Wireless freedom with 20 hours battery life"
Product Selected: "JR-OH1 Bluetooth Headphone" (from dropdown)
Button Text: "Buy Now"
Background Color: #1E40AF (Dark Blue)
Text Color: #FFFFFF (White)
```

**Result on Homepage:**
- Left side shows: Title, subtitle, and "Buy Now" button
- Right side shows: Product image of the headphone in a nice white card with price ৳2,500
- Background is dark blue
- Text is white
- When user clicks "Buy Now" → Goes to product detail page

### Example 2: Baby Product Feature

**Admin Form Filled Out:**
```
Title: "Adorable Baby Dresses"
Subtitle: "100% Cotton • Safe for delicate skin"
Product Selected: "Baby Frock - Cotton Dress" (from dropdown)
Button Text: "View Collection"
Background Color: #EC4899 (Pink)
Text Color: #FFFFFF (White)
```

**Result on Homepage:**
- Left side: Pink background with white text showing title and subtitle
- Right side: Baby dress product image with name and price ৳390
- Button says "View Collection"
- Clicking takes user to that specific product page

---

## Key Points to Remember

### ✅ When You Select a Product:
1. **Product image** automatically shows on the right side of slide
2. **Product name** appears under the image
3. **Product price** displays below name
4. **Link** automatically goes to that product's detail page
5. You get a beautiful product card display!

### ✅ Custom Text Control:
- **Title**: Your main custom headline (shows on left)
- **Subtitle**: Your custom description (shows on left)
- **Button Text**: Your custom call-to-action
- **Colors**: Full control over background and text colors

### ✅ Without Product Selection:
- If you don't select a product
- Only your custom image shows (full width)
- No product card on right side
- Still works for general promotions!

---

## Quick Reference: Finding Products

### To see what products you can select:

**Option 1: Check Products Page**
1. Go to `/admin/products`
2. See all your products
3. Note the product names

**Option 2: In the Dropdown**
1. When adding hero slide
2. Click "Link to Product" dropdown
3. All active products appear
4. Shows: Product name - Price

Example dropdown items:
```
[Select Product...]
JR-OH1 Bluetooth Headphone - ৳2,500
Baby Frock - Cotton Dress - ৳390
Puzzle Cube Game - ৳250
Industrial Electric Motor - ৳45,000
```

---

## Troubleshooting

### Q: "I don't see any products in the dropdown"
**A:** 
- Make sure you have products in your database
- Go to `/admin/products` and add products first
- Products must be active (`isActive = true`)

### Q: "Product image not showing on carousel"
**A:**
- Check if product has a valid `imageUrl`
- Go to product details and ensure image is uploaded
- Check browser console for image loading errors

### Q: "Slide not appearing on homepage"
**A:**
- Check if slide is marked as "Active" (green button)
- Click the Active/Inactive toggle button
- Only active slides show on homepage

### Q: "Can I have multiple products in one slide?"
**A:**
- No, one product per slide
- But you can create multiple slides (one for each product)
- Each slide can feature a different product

### Q: "How do I reorder slides?"
**A:**
- Edit the slide
- Change the "Position" number
- Lower numbers (0, 1, 2) appear first
- Higher numbers appear later

---

## Video Tutorial (Step by Step)

### Scenario: Add "Bluetooth Headphone" to Carousel

1. **Login** → Admin Dashboard
2. **Click** → "Hero Slides" in sidebar
3. **Click** → "+ Add New Slide" button
4. **Type** → Title: "Premium Wireless Audio"
5. **Type** → Subtitle: "Best sound quality guaranteed"
6. **Upload** → Banner image or use URL
7. **Click** → "Link to Product" dropdown
8. **Select** → "JR-OH1 Bluetooth Headphone"
9. **See** → Product info shows in preview
10. **Type** → Button text: "Get Yours Now"
11. **Pick** → Background color (click color box)
12. **Pick** → Text color (ensure readable)
13. **Click** → "Create Slide"
14. **Success** → Slide created!
15. **Click** → "Active" to enable it
16. **Visit** → Homepage to see it live!

---

## Summary

### To Add Product to Carousel:

1. **Go to**: `/admin/hero-slides`
2. **Click**: "+ Add New Slide"
3. **Select Product**: Choose from dropdown
4. **Add Custom Text**: Title + Subtitle
5. **Choose Colors**: Background + Text
6. **Save**: Click "Create Slide"
7. **Activate**: Toggle to "Active"
8. **Done**: Visit homepage to see it! 🎉

The product you selected will appear on the right side of the carousel with its image and price, while your custom text appears on the left!

---

**Need Help?**
- Check existing slides for examples
- Try editing an existing slide to see how it works
- All changes can be edited or deleted anytime

**Pro Tip**: Create 3-5 slides for different products to have a rotating carousel that showcases your best items!
