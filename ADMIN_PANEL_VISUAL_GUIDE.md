# Admin Panel Visual Guide

## 🎨 Complete Admin Interface Overview

This guide provides a visual representation of the admin panel structure and features.

---

## 📐 Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  🏢 Skyzone Admin Panel                        👤 Admin ▼       │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                       │
│ SIDEBAR  │              MAIN CONTENT AREA                       │
│          │                                                       │
│ Overview │  ┌─────────────────────────────────────────────┐    │
│ ─────────│  │                                             │    │
│          │  │         PAGE-SPECIFIC CONTENT               │    │
│ 🛒 E-Com │  │                                             │    │
│ Products │  │      (Dashboard, Orders, Products, etc.)    │    │
│ Category │  │                                             │    │
│ Orders   │  │                                             │    │
│ Reviews  │  │                                             │    │
│          │  └─────────────────────────────────────────────┘    │
│ 👥 Users │                                                       │
│ Users    │                                                       │
│ B2B Ver. │                                                       │
│ Groups   │                                                       │
│          │                                                       │
│ 📝 Cont. │                                                       │
│ Pages    │                                                       │
│ Media    │                                                       │
│ Blog     │                                                       │
│          │                                                       │
│ ⚙️ Sett. │                                                       │
│ General  │                                                       │
│ Payment  │                                                       │
│ Shipping │                                                       │
│ Notify   │                                                       │
│          │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

---

## 📊 Dashboard Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard                                                       │
│  Overview of your business                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │ 💰 Revenue │  │ 📦 Orders  │  │ 👥 Users   │  │ 📦 Products││
│  │ ৳2,450,000 │  │    1,234   │  │    856     │  │    450     ││
│  │ +12.5% ↗   │  │  +8 today  │  │  +15 new   │  │  +23 new   ││
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘│
│                                                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐ │
│  │ Recent Orders                │  │ Pending B2B Verifications││ │
│  ├──────────────────────────────┤  ├─────────────────────────┤ │
│  │ ORD-001  Ahmed Khan  ৳12,500│  │ Noor Distributors       │ │
│  │ ORD-002  Sara Ahmed  ৳8,500 │  │ Super Store BD          │ │
│  │ ORD-003  Karim Hassan ৳4,200│  │ Ali Import & Export     │ │
│  │ ORD-004  Fatima Noor ৳18,900│  │                         │ │
│  │ ORD-005  Hassan Ali  ৳6,750 │  │ [View All Applications] │ │
│  │                              │  │                         │ │
│  │ [View All Orders]            │  └─────────────────────────┘ │
│  └──────────────────────────────┘                              │
│                                                                  │
│  Quick Actions                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ + Add    │ │ 📦 View  │ │ 👥 Manage│ │ 📊 View  │          │
│  │ Product  │ │ Orders   │ │ Users    │ │ Reports  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Orders Management Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Orders Management                  📊 Export  🖨️ Print         │
│  Manage and process customer orders                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ ⏳ Pending│  │ ⚙️ Process│  │ 🚚 Shipped│  │ ✅ Deliver│       │
│  │    12    │  │     8    │  │    15    │  │   234    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌────────────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ 🔍 Search orders...│ │All Status ▼ │ │All Payment ▼│       │
│  └────────────────────┘ └─────────────┘ └─────────────┘       │
│                                                                  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ ☐ Order      Customer      Items  Total    Status    ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃ ☐ ORD-001   Ahmed Khan      5    ৳125,000  🟡Pending┃  │
│  ┃   🏢 Wholesale  +880-1711... Bank Transfer           ┃  │
│  ┃                                                       ┃  │
│  ┃ ☐ ORD-002   Sara Ahmed      2    ৳8,500    🟣Process┃  │
│  ┃   🛍️ Retail    +880-1722... bKash     🟢Paid       ┃  │
│  ┃                                                       ┃  │
│  ┃ ☐ ORD-003   Karim Hassan    3    ৳12,500   🟦Shipped┃  │
│  ┃   👤 Guest     +880-1733... COD       🟢Paid       ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                  │
│  Showing 1-10 of 234   [◄ Previous] [1] [2] [3] [Next ►]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛍️ Product Management Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Products Management                     📊 Export  + Add Product│
│  Manage your product catalog                                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  │ 🔍 Search products │ │All Category▼│ │In Stock ▼   │        │
│  └────────────────────┘ └─────────────┘ └─────────────┘        │
│                                                                  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ ☐  Image    Product Name       Price      Stock    Status┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃ ☐ [IMG]  Wireless Headphones  ৳2,500       245   🟢 Active┃  │
│  ┃         Electronics • SKU-001                              ┃  │
│  ┃         Retail: ৳2,500 | Wholesale: ৳2,200-৳1,800         ┃  │
│  ┃                                        [Edit] [Delete]     ┃  │
│  ┃                                                            ┃  │
│  ┃ ☐ [IMG]  Baby Dress Pink       ৳850         12   🟡 Limited┃  │
│  ┃         Baby Items • SKU-002                               ┃  │
│  ┃         Retail: ৳850 | Wholesale: ৳750-৳650               ┃  │
│  ┃                                        [Edit] [Delete]     ┃  │
│  ┃                                                            ┃  │
│  ┃ ☐ [IMG]  Smart Watch           ৳4,500        0   🔴 Out    ┃  │
│  ┃         Electronics • SKU-003                              ┃  │
│  ┃         Retail: ৳4,500 | Wholesale: ৳4,200-৳3,800         ┃  │
│  ┃                                        [Edit] [Delete]     ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                  │
│  Showing 1-10 of 450   [◄ Previous] [1] [2] [3] [Next ►]      │
└─────────────────────────────────────────────────────────────────┘
```

---

## ➕ Add Product Page

```
┌─────────────────────────────────────────────────────────────────┐
│  Add New Product                                  [Cancel] [Save]│
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📝 Basic Information                                      │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Product Name:     [________________________]              │  │
│  │ Description:      [________________________]              │  │
│  │                   [________________________]              │  │
│  │ Category:         [Select Category ▼]                     │  │
│  │ Brand:            [________________________]              │  │
│  │ SKU:              [________________________]              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 💰 B2C Retail Pricing                                     │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Retail Price:     [________] BDT                          │  │
│  │ Compare Price:    [________] BDT (Optional)               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🏢 B2B Wholesale Pricing                                  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Tier 1 (1-10 units)                                       │  │
│  │   Min Qty: [5]  Price: [2,200] BDT  Discount: [12]%     │  │
│  │                                                            │  │
│  │ Tier 2 (11-50 units)                                      │  │
│  │   Min Qty: [20] Price: [2,000] BDT  Discount: [20]%     │  │
│  │                                                            │  │
│  │ Tier 3 (51+ units)                                        │  │
│  │   Min Qty: [50] Price: [1,800] BDT  Discount: [28]%     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 📦 Inventory                                              │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Stock Quantity:   [________]                              │  │
│  │ Availability:     ( ) In Stock  ( ) Limited  ( ) Out      │  │
│  │ Min Order Qty:    [1]                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Cancel]                                      [Save Product]   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👥 User Management Page

```
┌─────────────────────────────────────────────────────────────────┐
│  User Management                           📊 Export  + Add User │
│  Manage customers, sellers, and admins                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐             │
│  │👥Total│  │🛍️Retail│  │🏢Whole│  │🏪Seller│  │⏳Pending│             │
│  │ 1,247│  │  856  │  │  312 │  │  68  │  │  11  │             │
│  └──────┘  └──────┘  └──────┘  └──────┘  └──────┘             │
│                                                                  │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │🔍 Search...  │ │All Roles▼│ │All Types▼│ │All Status▼│      │
│  └──────────────┘ └──────────┘ └──────────┘ └──────────┘      │
│                                                                  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃ ☐  User          Role    Type     Business      Status   ┃  │
│  ┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫  │
│  ┃ ☐  [A] Ahmed Khan 🛒Buyer 🏢Whole  Khan Trading   🟢Active┃  │
│  ┃    ahmed@example            ✓ Verified                   ┃  │
│  ┃    +880-1711...            45 orders • ৳2.35M            ┃  │
│  ┃                                        [Edit] [Orders]    ┃  │
│  ┃                                                           ┃  │
│  ┃ ☐  [S] Sara Ahmed  🛒Buyer 🛍️Retail  -             🟢Active┃  │
│  ┃    sara@example                                          ┃  │
│  ┃    +880-1722...            12 orders • ৳85K              ┃  │
│  ┃                                        [Edit] [Orders]    ┃  │
│  ┃                                                           ┃  │
│  ┃ ☐  [F] Fatima Noor 🛒Buyer 🏢Whole  Noor Distri.  🟡Pending┃  │
│  ┃    fatima@noord...         ⚠ Pending                     ┃  │
│  ┃    +880-1744...            0 orders • ৳0                 ┃  │
│  ┃                                        [Edit] [Orders]    ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                  │
│  Showing 1-10 of 1,247  [◄ Previous] [1] [2] [3] [Next ►]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ B2B Verification Page

```
┌─────────────────────────────────────────────────────────────────┐
│  B2B Verification                                               │
│  Review and approve wholesale business applications             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ ⏳ Pending│  │ 🔍 Review │  │ ✅ Approved│  │ ❌ Rejected│       │
│  │     8    │  │     3    │  │    156   │  │    12    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                  │
│  ┌───────────┐ ┌──────────────┐                                │
│  │🔍 Search..│ │ All Status ▼ │                                │
│  └───────────┘ └──────────────┘                                │
│                                                                  │
│  ┌─────────────┐  ┌─────────────────────────────────────────┐  │
│  │Applications │  │ Application Details                     │  │
│  ├─────────────┤  ├─────────────────────────────────────────┤  │
│  │┌───────────┐│  │ Noor Distributors Ltd.      🟡 Pending │  │
│  ││Noor Dist. ││  │ Wholesale Distributor                   │  │
│  ││Fatima Noor││  │                                         │  │
│  ││📧 fatima@ ││  │ 👤 Applicant Information               │  │
│  ││📱 +880-17 ││  │ Name: Fatima Noor                      │  │
│  ││🏢 Wholesal││  │ Email: fatima@noordist.com             │  │
│  ││📄 3 docs  ││  │ Phone: +880-1744-456789                │  │
│  ││🟡 Pending ││  │ Submitted: Oct 20, 2024                │  │
│  │└───────────┘│  │                                         │  │
│  │┌───────────┐│  │ 🏢 Business Information                │  │
│  ││Super Store││  │ Reg No: BD-REG-2024-001234             │  │
│  ││Kamal Rahma││  │ Tax No: TIN-987654321                  │  │
│  ││📧 kamal@  ││  │ Address: House 45, Road 12, Dhanmondi  │  │
│  ││🔍 Review  ││  │ City: Dhaka, Bangladesh                │  │
│  │└───────────┘│  │ Website: www.noordist.com              │  │
│  │┌───────────┐│  │                                         │  │
│  ││Ali Import ││  │ 📄 Uploaded Documents                  │  │
│  ││Rashid Ali ││  │ ┌─────────────────────────────────────┐│  │
│  ││🟡 Pending ││  │ │📄 Trade License                     ││  │
│  │└───────────┘│  │ │   trade_license.pdf                 ││  │
│  │             │  │ │   Uploaded: Oct 20, 2024     [View] ││  │
│  │             │  │ ├─────────────────────────────────────┤│  │
│  │             │  │ │📄 Tax Certificate                   ││  │
│  │             │  │ │   tax_cert.pdf                      ││  │
│  │             │  │ │   Uploaded: Oct 20, 2024     [View] ││  │
│  │             │  │ ├─────────────────────────────────────┤│  │
│  │             │  │ │📄 Business Registration             ││  │
│  │             │  │ │   business_reg.pdf                  ││  │
│  │             │  │ │   Uploaded: Oct 20, 2024     [View] ││  │
│  │             │  │ └─────────────────────────────────────┘│  │
│  │             │  │                                         │  │
│  │             │  │ [Mark Under Review] [✓ Approve] [✕ Reject]│
│  └─────────────┘  └─────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Status Badge Legend

### Order Status
- 🟡 **Pending** - New order, awaiting confirmation
- 🔵 **Confirmed** - Order confirmed by admin
- 🟣 **Processing** - Order being prepared
- 🟦 **Shipped** - Order in transit
- 🟢 **Delivered** - Order completed successfully
- 🔴 **Cancelled** - Order cancelled

### Payment Status
- 🟡 **Pending** - Payment not received
- 🟢 **Paid** - Payment confirmed
- 🔴 **Failed** - Payment failed

### User Status
- 🟢 **Active** - User can place orders
- 🟡 **Pending** - Awaiting verification
- 🔴 **Suspended** - Account suspended

### Customer Types
- 👤 **Guest** - Checkout without account
- 🛍️ **Retail** - B2C individual customer
- 🏢 **Wholesale** - B2B business customer

### User Roles
- 👑 **Admin** - Full system access
- 🏪 **Seller** - Can manage own products
- 🛒 **Buyer** - Can purchase products

---

## 🎯 User Flows

### Approve B2B Application Flow
```
1. Go to B2B Verification page
2. Click pending application
3. Review business information
4. View uploaded documents
5. Click "Mark Under Review" (optional)
6. Click "Approve Application"
7. User gets email notification
8. User can now access wholesale prices
```

### Process Order Flow
```
1. Go to Orders page
2. Filter by "Pending"
3. Click order to view details
4. Verify payment status
5. Change status to "Confirmed"
6. Prepare items
7. Change status to "Processing"
8. Ship items
9. Change status to "Shipped"
10. Upon delivery, mark as "Delivered"
```

### Add Product Flow
```
1. Go to Products page
2. Click "Add Product"
3. Fill basic information
4. Set retail price (B2C)
5. Configure wholesale tiers (B2B)
6. Set inventory and availability
7. Add specifications
8. Add SEO tags
9. Click "Save Product"
10. Product appears in catalog
```

---

## 🔐 Access Levels

```
┌─────────────────────────────────────┐
│         ADMIN (Full Access)         │
├─────────────────────────────────────┤
│ ✓ Dashboard                         │
│ ✓ Orders (All)                      │
│ ✓ Products (All)                    │
│ ✓ Users (All)                       │
│ ✓ B2B Verification                  │
│ ✓ Categories                        │
│ ✓ Analytics                         │
│ ✓ Settings                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│      SELLER (Limited Access)        │
├─────────────────────────────────────┤
│ ✓ Dashboard (Own stats)             │
│ ✓ Orders (Own products)             │
│ ✓ Products (Own only)               │
│ ✗ Users                             │
│ ✗ B2B Verification                  │
│ ✗ Categories                        │
│ ✓ Analytics (Own only)              │
│ ✗ Settings                          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│       BUYER (No Admin Access)       │
├─────────────────────────────────────┤
│ ✗ No admin panel access             │
│ ✓ Can browse products               │
│ ✓ Can place orders                  │
│ ✓ Can view own orders               │
│ ✓ Can manage profile                │
└─────────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop View (1920px+)
- Full sidebar visible
- Multi-column layouts
- Large tables with all columns
- Spacious cards

### Tablet View (768px - 1919px)
- Collapsible sidebar
- 2-column layouts
- Scrollable tables
- Compact cards

### Mobile View (< 768px)
- Hidden sidebar (hamburger menu)
- Single column layouts
- Mobile-optimized tables (cards)
- Stack elements vertically

---

## 🎨 Color Scheme

```
Primary:   #2563eb (Blue)    - Primary buttons, links
Secondary: #64748b (Slate)   - Secondary text
Success:   #10b981 (Green)   - Success states, delivered
Warning:   #f59e0b (Yellow)  - Warnings, pending items
Danger:    #ef4444 (Red)     - Errors, cancelled items
Info:      #3b82f6 (Blue)    - Info badges
Purple:    #9333ea (Purple)  - Wholesale, processing
Gray:      #6b7280 (Gray)    - Borders, disabled
```

---

**Last Updated**: October 2024  
**Version**: 1.0.0  
**Created By**: Skyzone Admin Team
