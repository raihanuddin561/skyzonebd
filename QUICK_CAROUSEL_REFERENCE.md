# 🎯 SUPER SIMPLE: Add Product to Carousel

## The 3-Minute Guide

### What You Want:
Show a product on your homepage carousel with your own custom text.

### How to Do It:

#### 1️⃣ Go to Admin Page
```
URL: http://localhost:3000/admin/hero-slides
```

#### 2️⃣ Click Blue Button
```
[+ Add New Slide] ← Click this
```

#### 3️⃣ Fill Form (5 fields)

**Field 1: Title** (Your custom text)
```
Example: "Amazing Headphones Now Available!"
```

**Field 2: Subtitle** (More custom text)
```
Example: "Get 20% off this week only"
```

**Field 3: Image** (Background image)
```
Click "Choose File" and upload any image
```

**Field 4: Link to Product** ⭐ **THIS IS THE KEY!**
```
Click dropdown ▼
Select: "JR-OH1 Bluetooth Headphone - ৳2,500"
       (or any product you want to feature)
```

**Field 5: Button Text**
```
Example: "Shop Now" or "Buy Now"
```

#### 4️⃣ Click Save
```
[Create Slide] ← Click this
```

#### 5️⃣ Activate
```
[Active] ← Click to turn green
```

#### 6️⃣ Done! Visit Homepage
```
http://localhost:3000
```

---

## What Happens:

### You Selected This Product:
```
"JR-OH1 Bluetooth Headphone"
```

### On Homepage, Users See:

**Left Side** = Your custom text:
- "Amazing Headphones Now Available!"
- "Get 20% off this week only"
- [Shop Now] button

**Right Side** = Product automatically shows:
- Product image (from database)
- Product name: "JR-OH1 Bluetooth Headphone"
- Product price: "৳2,500"

---

## Quick Tips:

✅ **Product dropdown** = All your products from database
✅ **Select any product** = It will appear on carousel
✅ **Write your own text** = Title, subtitle, button text
✅ **Choose colors** = Background and text colors
✅ **Create multiple slides** = Feature different products

❌ **Don't select product** = Only banner shows (no product card)

---

## Screenshot of What You'll See:

### Admin Form:
```
┌─────────────────────────────────────┐
│ Title: [Your text here...]          │
│ Subtitle: [More text...]            │
│ Image: [Upload button]              │
│ Link to Product: [Dropdown ▼]       │ ← SELECT PRODUCT HERE
│   → JR-OH1 Headphone                │
│   → Baby Dress                       │
│   → Puzzle Game                      │
│ Button: [Shop Now]                   │
│ Colors: [🎨] [🎨]                   │
└─────────────────────────────────────┘
```

### Homepage Result:
```
┌────────────────────────────────────────┐
│                                         │
│  Your Text      [Product Image]        │
│  Goes Here  →   Shows Automatically    │
│                 With Name & Price       │
│  [Button]                               │
│                                         │
└────────────────────────────────────────┘
```

---

## That's It!

**Simple Rule**: 
- You write the text (left side)
- You select the product (right side auto-fills)
- Users see both together on homepage

**Try it now**: Go to `/admin/hero-slides` and click "+ Add New Slide"! 🚀
