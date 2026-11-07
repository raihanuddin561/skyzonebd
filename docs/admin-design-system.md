# SkyzoneBD Admin Panel — Design System & Futuristic Component Standards
**Document:** `docs/admin-design-system.md`  
**Date:** November 2026  
**Auditor / Product Designer:** Senior Design Technologist & Frontend Lead  
**Design Philosophy:** High-Tech Cyber-Industrial (Dark-First with Polished Light Alternative, Glassmorphism, Tabular Numerals)  

---

## 1. Design Tokens & Palette

### 1.1 Color Palettes

#### Dark Theme (Default)
- **Background Root:** `#0B0F19` (Deep Obsidian Navy)
- **Background Surface / Cards:** `#111827` / `#162032` (Graphite Navy with 60% opacity backdrop blur)
- **Card Borders:** `rgba(255, 255, 255, 0.08)` (Subtle translucent hairline borders)
- **Primary Accent (Skyzone Cyan / Electric Blue):** `#0EA5E9` (Hover: `#38BDF8`, Glow: `rgba(14, 165, 233, 0.25)`)
- **Secondary Accent (Violet Laser):** `#8B5CF6`
- **Text Primary:** `#F8FAFC`
- **Text Secondary / Muted:** `#94A3B8`
- **Semantic Colors:**
  - Success: `#10B981` (Emerald Glow: `rgba(16, 185, 129, 0.2)`)
  - Warning: `#F59E0B` (Amber Glow: `rgba(245, 158, 11, 0.2)`)
  - Danger / Error: `#EF4444` (Rose Glow: `rgba(239, 68, 68, 0.2)`)
  - Info: `#3B82F6` (Electric Blue: `rgba(59, 130, 246, 0.2)`)

#### Light Theme (Switchable)
- **Background Root:** `#F8FAFC` (Slate 50)
- **Background Surface / Cards:** `#FFFFFF` with soft elevation shadow
- **Card Borders:** `#E2E8F0`
- **Text Primary:** `#0F172A`
- **Text Secondary:** `#64748B`

---

## 2. Typography & Numerical Precision
- **Font Stack:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif.
- **Tabular Numerals:** All currencies and financial figures MUST use `font-mono tracking-tight tabular-nums` or `font-feature-settings: "tnum" 1` to guarantee vertical number column alignment without jittering during animations.
- **Bangla Currency Symbol:** `৳` (Taka symbol) formatted with non-breaking space and 2 decimal places where precision matters.

---

## 3. Glassmorphism & Elevation Standards
- **Standard Card:**
  ```css
  background: rgba(17, 24, 39, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.35);
  border-radius: 1rem;
  ```
- **Active / Hover State:**
  ```css
  border-color: rgba(14, 165, 233, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px -4px rgba(14, 165, 233, 0.2);
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  ```

---

## 4. Reusable Component Blueprint

### 4.1 Futuristic KPI Card
- Glowing top accent stripe matching semantic type.
- Animated numeral counter for BDT amounts.
- Period comparative delta badge (+12.4% vs prev period) with directional arrow.
- SVG sparkline preview or category icon with glow halo.

### 4.2 Command Palette (`Ctrl/Cmd + K`)
- Centered backdrop overlay (`backdrop-blur-md bg-black/60`).
- Floating command modal with instant search input.
- Grouped quick actions:
  - Navigation: Go to Orders, Inventory, Suppliers, Financial Ledger.
  - Entities: Quick search Order #, Customer phone, Product SKU.
  - Actions: Create Order, New Purchase Order, Adjust Stock, Export DB.

### 4.3 Data Table Component
- Sticky header with hairline glass separator.
- Bulk row checkbox selection with contextual top action bar (Batch Status Update, Batch Export).
- Density toggle (`Comfortable` 56px row height vs `Compact` 40px row height).
- Column visibility dropdown toggle.
- Empty state with high-tech isometric SVG and clear call to action.

### 4.4 Chart Integration Standards (Phase 6)
- Chart Engine: `Recharts` / SVG responsive container.
- Gradients: Translucent area fills under trend lines (`rgba(14, 165, 233, 0.25)` to `transparent`).
- Tooltips: Custom Dark Glassmorphic tooltip card showing exact BDT poisha breakdown.
- Responsive breakpoints: Automatically stacks or hides secondary axes on mobile screens (< 768px).

