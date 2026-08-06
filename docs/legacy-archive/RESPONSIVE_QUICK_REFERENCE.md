# 🚀 Quick Reference - Responsive Design Patterns

## Most Common Responsive Patterns

### 1. **Responsive Spacing**
```tsx
// Padding
p-3 sm:p-4 lg:p-6
px-3 sm:px-4 lg:px-6
py-2.5 sm:py-2 lg:py-3

// Margin
m-3 sm:m-4 lg:m-6
mb-4 sm:mb-6 lg:mb-8

// Gap
gap-3 sm:gap-4 lg:gap-6
space-y-4 sm:space-y-6
```

### 2. **Responsive Text**
```tsx
// Headings
text-2xl sm:text-3xl lg:text-4xl
text-xl sm:text-2xl lg:text-3xl

// Body Text
text-sm sm:text-base lg:text-lg
text-xs sm:text-sm

// Font Weight
font-medium sm:font-semibold lg:font-bold
```

### 3. **Responsive Grid**
```tsx
// 1 column mobile, 2 tablet, 4 desktop
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4

// Auto-fit pattern
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
```

### 4. **Responsive Flex**
```tsx
// Stack on mobile, row on desktop
flex flex-col sm:flex-row

// Reverse direction
flex flex-col-reverse sm:flex-row
```

### 5. **Show/Hide Elements**
```tsx
// Show only on mobile
className="block lg:hidden"

// Show only on desktop
className="hidden lg:block"

// Complex visibility
className="hidden sm:block lg:hidden xl:block"
```

### 6. **Responsive Width**
```tsx
// Full width on mobile, auto on desktop
w-full sm:w-auto

// Specific widths
w-full sm:w-1/2 lg:w-1/3

// Max widths
max-w-full sm:max-w-md lg:max-w-2xl
```

### 7. **Touch-Optimized Buttons**
```tsx
<button className="
  px-4 py-2.5 sm:py-2
  text-sm sm:text-base
  touch-manipulation
  min-h-[44px]
  hover:scale-105 active:scale-95
  transition-all
">
  Button
</button>
```

### 8. **Responsive Cards**
```tsx
<div className="
  p-3 sm:p-4 lg:p-6
  rounded-lg sm:rounded-xl
  shadow-sm hover:shadow-lg
  transition-all
">
  Card Content
</div>
```

### 9. **Mobile Menu Pattern**
```tsx
{/* Hamburger Toggle */}
<button 
  onClick={() => setOpen(!open)}
  className="lg:hidden p-2 touch-manipulation"
>
  <MenuIcon />
</button>

{/* Backdrop */}
{isMobile && open && (
  <div className="fixed inset-0 bg-black/50 z-40" onClick={close} />
)}

{/* Sliding Menu */}
<nav className={`
  fixed top-0 left-0 h-full
  transition-transform duration-300
  ${open ? 'translate-x-0' : '-translate-x-full'}
  lg:relative lg:translate-x-0
`}>
  {/* Menu Items */}
</nav>
```

### 10. **Responsive Tables**
```tsx
{/* Mobile Card View */}
<div className="lg:hidden">
  {data.map(item => (
    <div className="p-4 border-b">
      <div className="font-semibold">{item.name}</div>
      <div className="text-sm text-gray-600">{item.details}</div>
    </div>
  ))}
</div>

{/* Desktop Table View */}
<div className="hidden lg:block overflow-x-auto">
  <table>...</table>
</div>
```

---

## Breakpoint Reference

```tsx
sm:   640px   // Small tablets portrait
md:   768px   // Tablets landscape
lg:   1024px  // Laptops & desktops
xl:   1280px  // Large screens
2xl:  1536px  // Extra large screens
```

---

## Common Component Patterns

### Responsive Container
```tsx
<div className="
  max-w-7xl mx-auto
  px-3 sm:px-4 lg:px-6
  py-4 sm:py-6 lg:py-8
">
  {children}
</div>
```

### Responsive Image
```tsx
<Image
  src={src}
  alt={alt}
  width={300}
  height={200}
  className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-lg"
/>
```

### Responsive Form Input
```tsx
<input
  type="text"
  className="
    w-full
    px-3 sm:px-4
    py-2.5 sm:py-2
    text-sm sm:text-base
    border border-gray-300 rounded-lg
    focus:ring-2 focus:ring-blue-500
  "
/>
```

---

## Quick Tips

1. **Always start mobile-first** - Design for smallest screen first
2. **Use `touch-manipulation`** - On all interactive elements
3. **Minimum 44px touch targets** - For mobile buttons
4. **16px font-size on inputs** - Prevents iOS zoom
5. **Use `overflow-hidden`** - On body when menu is open
6. **Test on real devices** - Simulators aren't enough
7. **Use semantic HTML** - Better accessibility
8. **Add loading states** - Improve perceived performance

---

## Copy-Paste Templates

### Responsive Page Layout
```tsx
export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">
          Page Title
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Content */}
        </div>
      </div>
    </main>
  );
}
```

### Responsive Button
```tsx
<button className="
  w-full sm:w-auto
  px-4 sm:px-6
  py-2.5 sm:py-3
  bg-blue-600 text-white
  rounded-lg
  font-semibold
  text-sm sm:text-base
  hover:bg-blue-700
  active:scale-95
  touch-manipulation
  transition-all
">
  Click Me
</button>
```

### Responsive Card Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
  {items.map(item => (
    <div key={item.id} className="
      p-3 sm:p-4 lg:p-5
      bg-white
      rounded-lg sm:rounded-xl
      border border-gray-200
      shadow-sm hover:shadow-lg
      transition-all
      cursor-pointer
    ">
      {/* Card Content */}
    </div>
  ))}
</div>
```

---

*Last updated: November 9, 2025*
