# SkyzoneBD Design System & Component Tokens

> **Version**: 1.0.0  
> **Target Audience**: B2B Wholesale Electrical Hardware Buyers, Sellers, Contractors & Wholesalers in Bangladesh  
> **Currency Standard**: Bangladeshi Taka (`৳` / `BDT`)  
> **Accessibility Target**: WCAG 2.1 AA Compliance (Contrast ≥ 4.5:1, Touch Targets ≥ 44px)

---

## 1. Brand Identity & Aesthetic Principles

SkyzoneBD is Bangladesh's premier B2B wholesale marketplace for electrical hardware (LED lights, bulbs, wires, switches, capacitors, regulators, and plugs). The visual design must project **authority, enterprise reliability, financial transparency, and modern industrial polish**.

### Core Tenets
1. **High Information Density with Clarity**: Wholesale buyers care about MOQ, pack size, tiered volume prices, real-time inventory, and profit margins. Information is presented in organized, scannable structures rather than consumer-style whitespace fluff.
2. **Transparent Financial Polish**: Every price, discount, VAT, courier charge, and margin is mathematically precise and clearly itemized. Zero hidden fees.
3. **Responsive Industrial Elegance**: Clean borders, subtle shadows, and crisp typography built for shop owners checking stock on 360px Android phones as well as corporate purchasing managers on 1920px office monitors.
4. **Bilingual Harmony (English & Bangla)**: Clear English terminology paired with familiar Bangla wholesale terms (যেমন: *ন্যূনতম অর্ডার*, *কার্টন মূল্য*, *ক্যাশ অন ডেলিভারি*).

---

## 2. Color Palette & Semantic Tokens

```
================================================================================
TOKEN                  HEX        RGB              USAGE
================================================================================
Brand Primary (Navy)
--brand-navy-950       #081225    rgb(8, 18, 37)   Deep canvas, footer background
--brand-navy-900       #0B192C    rgb(11, 25, 44)  Hero gradient, dark navigation
--brand-navy-800       #1E3E62    rgb(30, 62, 98)  Primary interactive elements
--brand-navy-700       #1D4ED8    rgb(29, 78, 216) Vibrant primary buttons, links
--brand-navy-50        #EFF6FF    rgb(239, 246, 255) Tinted badges, active tabs

Profit & Success (Emerald / Teal)
--brand-emerald-700    #047857    rgb(4, 120, 87)  Text badges for profit/savings
--brand-emerald-600    #059669    rgb(5, 150, 105) Success banners, confirmed status
--brand-emerald-500    #10B981    rgb(16, 185, 129) Live stock indicators
--brand-emerald-50     #ECFDF5    rgb(236, 253, 245) Free delivery unlocked badge

Wholesale & VIP (Amber / Gold)
--brand-amber-700      #B45309    rgb(180, 83, 9)  Wholesale tier indicators
--brand-amber-600      #D97706    rgb(217, 119, 6) Bulk discount tags, carton icons
--brand-amber-500      #F59E0B    rgb(245, 158, 11) Star ratings, highlight pills
--brand-amber-50       #FFFBEB    rgb(255, 251, 235) MOQ alert banners, warning boxes

Danger / Shortage (Crimson)
--brand-red-600        #DC2626    rgb(220, 38, 38) Low stock, out of stock, errors
--brand-red-50         #FEF2F2    rgb(254, 242, 242) Error alerts, deletion dialogs

Neutral Surfaces (Slate Scale)
--surface-white        #FFFFFF    rgb(255, 255, 255) Card surfaces, modals
--surface-50           #F8FAFC    rgb(248, 250, 252) App background canvas
--surface-100          #F1F5F9    rgb(241, 245, 249) Secondary panel background
--border-200           #E2E8F0    rgb(226, 232, 240) Divider lines, default borders
--border-300           #CBD5E1    rgb(203, 213, 225) Focused input borders
--text-muted           #64748B    rgb(100, 116, 139) Subtitles, metadata, SKU labels
--text-secondary       #334155    rgb(51, 65, 85)   Body copy, labels
--text-primary         #0F172A    rgb(15, 23, 42)   Headlines, primary prices
================================================================================
```

---

## 3. Typography Scale & Hierarchy

- **Font Family (Latin)**: `Inter`, `Geist Sans`, system-ui, -apple-system, sans-serif
- **Font Family (Bangla)**: `'Hind Siliguri'`, `'Noto Sans Bengali'`, sans-serif
- **Font Family (Monospace)**: `Geist Mono`, `JetBrains Mono`, `ui-monospace`, monospace (used for SKUs, TrxIDs, Bin numbers, and Poisha financial audits)

| Level | Size | Weight | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display Hero** | 36px / 44px (sm: 48px) | 800 (Extrabold) | 1.15 | Homepage hero headline, mega promotions |
| **Heading 1** | 28px / 32px | 700 (Bold) | 1.25 | Page titles (Catalog, Checkout, Admin) |
| **Heading 2** | 22px / 24px | 700 (Bold) | 1.3 | Card sections, Drawer headers |
| **Heading 3** | 18px / 20px | 600 (Semibold) | 1.4 | Product grid titles, summary headers |
| **Subheading** | 15px / 16px | 600 (Semibold) | 1.4 | Line item titles, filter group titles |
| **Body Default** | 14px / 15px | 400 / 500 | 1.5 | General descriptions, table cells |
| **Caption / Meta** | 12px / 13px | 500 (Medium) | 1.4 | SKU codes, MOQ labels, date stamps |
| **Micro Tag** | 11px | 700 (Bold) | 1.2 | Pills, status chips, tier range tags |

---

## 4. Elevation, Radii & Grid

- **Base Spacing Grid**: `4px` base increments: `4px` (1), `8px` (2), `12px` (3), `16px` (4), `24px` (6), `32px` (8), `48px` (12), `64px` (16).
- **Border Radii**:
  - `rounded-lg`: `8px` (input fields, table cells, smaller buttons)
  - `rounded-xl`: `12px` (cards, zone selectors, category chips)
  - `rounded-2xl`: `16px` (modal dialogues, order summary sidebar, hero banners)
  - `rounded-full`: `9999px` (pills, badges, avatar containers)
- **Shadow Tokens**:
  - `shadow-sm`: `0 1px 2px 0 rgba(15, 23, 42, 0.05)` (cards at rest)
  - `shadow-md`: `0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` (card hover, active dropdown)
  - `shadow-lg`: `0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.05)` (floating sticky bars, modals)

---

## 5. Wholesale Component Tokens & Specifications

### 5.1 Volume Tier Pricing Matrix (PDP & Catalog Preview)
```tsx
// Active Tier: Bold emerald background with high-contrast indicator
<div className="grid grid-cols-3 gap-2">
  <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-center">
    <div className="text-xs text-gray-500 font-medium">1 - 49 pcs</div>
    <div className="text-sm font-bold text-gray-900 mt-0.5">৳120 / pc</div>
  </div>
  <div className="p-2.5 rounded-xl border-2 border-emerald-600 bg-emerald-50 text-center shadow-xs">
    <div className="text-xs text-emerald-800 font-semibold">50 - 199 pcs</div>
    <div className="text-sm font-bold text-emerald-900 mt-0.5">৳110 / pc</div>
    <span className="text-[10px] text-emerald-700 font-bold">Save 8%</span>
  </div>
  <div className="p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-center">
    <div className="text-xs text-gray-500 font-medium">200+ pcs</div>
    <div className="text-sm font-bold text-gray-900 mt-0.5">৳95 / pc</div>
    <span className="text-[10px] text-amber-700 font-bold">Save 21%</span>
  </div>
</div>
```

### 5.2 Minimum Order Quantity (MOQ) Badge
- Format: `MOQ: {qty} units`
- Design: Clean slate background with lock or carton icon:
  `bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded-md text-xs font-semibold`

### 5.3 Live Stock & Fulfillment Indicator
- In stock: `text-emerald-700 bg-emerald-50 border border-emerald-200` with pulse dot: `In Stock: 540 units`
- Low stock: `text-amber-800 bg-amber-50 border border-amber-200`: `Low Stock: 12 units remaining`
- Out of stock: `text-red-700 bg-red-50 border border-red-200`: `Temporarily Sold Out`

### 5.4 Delivery Zone Selector Card
- Selected: `border-2 border-blue-600 bg-blue-50/60 shadow-xs`
- Unselected: `border border-gray-200 hover:border-gray-300 bg-white`
- Includes: Zone title, estimated business days, and courier charge (or `FREE` badge in bold emerald).

### 5.5 Currency Format Standard
- Symbol: `৳`
- Number Format: Bangladeshi format with standard commas: `৳1,50,000` or `৳150,000`.
- Poisha math is strictly computed server-side and presented to 2 decimals only when poisha exists, or rounded integer taka for clean catalog display.

---

## 6. Accessibility & Responsiveness Checklist

- [x] All body copy passes WCAG AA contrast ratio (≥ 4.5:1 against background).
- [x] All touch controls have a minimum height of `44px` on mobile screens (`max-width: 1023px`).
- [x] All inputs maintain `16px` font size on mobile to prevent Safari viewport auto-zoom.
- [x] Keyboard focus rings are prominent and use high-contrast blue outline (`focus:ring-2 focus:ring-blue-600`).
- [x] Clear screen-reader labels on buttons with icons (`aria-label`).
- [x] Tested across 360px (mobile), 768px (tablet), 1280px (laptop), and 1920px (desktop).
