# Admin Panel Documentation

## Overview
Complete admin panel for managing all aspects of the Skyzone e-commerce platform, similar to Alibaba's comprehensive admin system.

## 🎯 Features

### 1. Dashboard (`/admin`)
- **Real-time Statistics**
  - Total Revenue
  - Orders Count
  - Users Count
  - Products Count
- **Recent Orders Table**
  - Last 5 orders with quick overview
  - Direct links to order details
- **Pending B2B Verifications**
  - Awaiting approval applications
  - Quick action buttons
- **Quick Actions Grid**
  - Add Product
  - View Orders
  - Manage Users
  - Reports

### 2. Order Management (`/admin/orders`)
- **Order Overview**
  - Comprehensive order table
  - Search by order number, customer name
  - Filter by status (pending, confirmed, processing, shipped, delivered, cancelled)
  - Filter by payment status (paid, pending, failed)
- **Order Statistics**
  - Pending Orders
  - Processing Orders
  - Shipped Orders
  - Delivered Orders
- **Bulk Operations**
  - Select multiple orders
  - Mark as Confirmed
  - Mark as Processing
  - Export selected
- **Order Details**
  - Customer information (Guest/Retail/Wholesale)
  - Order items
  - Payment method
  - Status tracking
  - Real-time status updates

### 3. Product Management (`/admin/products`)
- **Product Catalog**
  - Full product listing with images
  - Search and filter capabilities
  - Availability status badges
  - Quick edit/delete actions
- **Bulk Operations**
  - Select multiple products
  - Bulk delete
  - Bulk status change
  - Export products
- **Product Creation** (`/admin/products/new`)
  - Basic Information (name, description, brand, SKU)
  - B2C Retail Pricing
  - B2B Wholesale Tiers
    - Tier 1 (1-10 units)
    - Tier 2 (11-50 units)
    - Tier 3 (51+ units)
  - Inventory Management
  - Product Specifications (dynamic fields)
  - SEO & Tags

### 4. User Management (`/admin/users`)
- **User Directory**
  - All users (Admin, Seller, Buyer)
  - User roles and types (Retail/Wholesale)
  - Business verification status
  - Activity tracking
- **Statistics**
  - Total Users
  - Retail Buyers
  - Wholesale Buyers
  - Sellers
  - Pending Verifications
- **Filters**
  - By role (Admin, Seller, Buyer)
  - By type (Retail, Wholesale)
  - By status (Active, Pending, Suspended)
- **User Actions**
  - Edit user details
  - Change status
  - View user orders
  - Suspend/Activate account
- **Bulk Operations**
  - Activate multiple users
  - Suspend accounts
  - Export user data
  - Delete users

### 5. B2B Verification System (`/admin/verification`)
- **Application Queue**
  - Pending applications
  - Under review applications
  - Approved history
  - Rejected history
- **Verification Stats**
  - Pending Review
  - Under Review
  - Approved (lifetime)
  - Rejected (lifetime)
- **Application Review**
  - Applicant information
  - Business details
  - Registration numbers
  - Tax information
  - Document viewer
    - Trade License
    - Tax Certificate
    - Business Registration
    - Additional documents
- **Actions**
  - Mark Under Review
  - Approve Application
  - Reject with Reason
  - Request Additional Information

## 📁 File Structure

```
src/app/admin/
├── layout.tsx                 # Admin layout with sidebar
├── page.tsx                   # Dashboard
├── orders/
│   ├── page.tsx              # Orders management
│   └── [id]/
│       └── page.tsx          # Order details (to be created)
├── products/
│   ├── page.tsx              # Products list
│   ├── new/
│   │   └── page.tsx          # Create product
│   └── [id]/
│       └── page.tsx          # Edit product (to be created)
├── users/
│   ├── page.tsx              # Users list
│   ├── new/
│   │   └── page.tsx          # Add user (to be created)
│   └── [id]/
│       └── page.tsx          # Edit user (to be created)
├── verification/
│   └── page.tsx              # B2B verifications
├── categories/
│   └── page.tsx              # Categories (to be created)
├── analytics/
│   └── page.tsx              # Reports (to be created)
└── settings/
    └── page.tsx              # Settings (to be created)
```

## 🔐 Access Control

### Authentication Required
- All admin routes check for authentication
- Redirects to `/auth/login` if not authenticated

### Role-Based Authorization
```typescript
if (!user || user.role !== 'admin') {
  router.push('/');
  return null;
}
```

### Protected Pages
- Only users with `role: 'admin'` can access
- Middleware checks on every page load

## 🎨 UI Components

### Sidebar Navigation
- **Overview**: Dashboard
- **E-Commerce**:
  - Products
  - Categories
  - Orders
  - Reviews
- **Customer Management**:
  - Users
  - B2B Verification
  - Customer Groups
- **Content**:
  - Pages
  - Media Library
  - Blog
- **Settings**:
  - General
  - Payments
  - Shipping
  - Notifications

### Status Badges
```typescript
// Order Status
pending      → Yellow badge
confirmed    → Blue badge
processing   → Purple badge
shipped      → Indigo badge
delivered    → Green badge
cancelled    → Red badge

// Payment Status
pending      → Yellow badge
paid         → Green badge
failed       → Red badge

// User Status
active       → Green badge
suspended    → Red badge
pending      → Yellow badge

// Verification Status
pending      → Yellow badge
under_review → Blue badge
approved     → Green badge
rejected     → Red badge
```

### Customer Type Badges
```typescript
guest        → Gray badge + 👤
retail       → Blue badge + 🛍️
wholesale    → Purple badge + 🏢
```

## 🔄 Data Flow

### Current Implementation (Mock Data)
All pages currently use mock data for demonstration:
```typescript
useEffect(() => {
  // Mock data - replace with actual API call
  setOrders([...mockOrders]);
}, []);
```

### API Integration (To Do)
Replace mock data with actual API calls:

#### Orders API
```typescript
// GET /api/admin/orders
const response = await fetch('/api/admin/orders?status=pending');
const orders = await response.json();

// PUT /api/admin/orders/:id
await fetch(`/api/admin/orders/${id}`, {
  method: 'PUT',
  body: JSON.stringify({ status: 'confirmed' })
});
```

#### Products API
```typescript
// GET /api/admin/products
// POST /api/admin/products
// PUT /api/admin/products/:id
// DELETE /api/admin/products/:id
```

#### Users API
```typescript
// GET /api/admin/users
// PUT /api/admin/users/:id
// DELETE /api/admin/users/:id
```

#### Verification API
```typescript
// GET /api/admin/verification
// PUT /api/admin/verification/:id/approve
// PUT /api/admin/verification/:id/reject
```

## 🚀 Quick Start

### 1. Access Admin Panel
```
Navigate to: http://localhost:3000/admin
```

### 2. Login Requirements
- User must be authenticated
- User role must be 'admin'

### 3. Create Admin User
```typescript
// In Prisma seed or database
{
  email: "admin@skyzone.com",
  role: "admin",
  userType: "retail"
}
```

## 📊 Statistics & Analytics

### Dashboard Metrics
- Revenue (current month)
- Order count (all time)
- User count (all time)
- Product count (active)

### Order Statistics
- Pending (requires action)
- Processing (in progress)
- Shipped (in transit)
- Delivered (completed)

### User Statistics
- Total registered users
- Retail buyers
- Wholesale buyers
- Active sellers
- Pending verifications

### Verification Statistics
- Pending review (new)
- Under review (being processed)
- Approved (lifetime)
- Rejected (lifetime)

## 🔧 Customization

### Adding New Menu Items
Edit `src/app/admin/layout.tsx`:
```typescript
const menuItems = [
  {
    category: "New Category",
    items: [
      { name: "New Page", href: "/admin/new-page", icon: "🆕" }
    ]
  }
];
```

### Creating New Admin Pages
1. Create page file: `src/app/admin/[page-name]/page.tsx`
2. Add to sidebar menu
3. Implement authentication check
4. Add API endpoints if needed

## 🎯 Best Practices

### 1. Always Check Authentication
```typescript
const { user } = useAuth();
if (!user || user.role !== 'admin') {
  router.push('/');
  return null;
}
```

### 2. Use Consistent Status Management
- Follow existing badge color schemes
- Use standardized status values
- Implement dropdown for status changes

### 3. Implement Proper Loading States
```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState([]);

useEffect(() => {
  fetchData().then(setData).finally(() => setLoading(false));
}, []);
```

### 4. Add Confirmation Dialogs
- Before deleting items
- Before bulk operations
- Before status changes affecting users

## 🔜 Next Steps

### High Priority
1. **API Integration**
   - Create admin API routes
   - Connect to Prisma database
   - Implement CRUD operations

2. **Order Details Page**
   - Full order information
   - Order history
   - Refund management
   - Print invoice

3. **Product Edit Page**
   - Edit existing products
   - Image management
   - Variant management

4. **User Edit Page**
   - Edit user details
   - Password reset
   - Role management

### Medium Priority
5. **Categories Management**
   - Create/edit categories
   - Category hierarchy
   - Image upload

6. **Analytics Dashboard**
   - Sales charts
   - Revenue trends
   - Customer analytics
   - Product performance

7. **Settings Pages**
   - General settings
   - Payment gateway config
   - Shipping methods
   - Email templates

### Low Priority
8. **Media Library**
   - Image upload
   - File management
   - CDN integration

9. **Blog/CMS**
   - Content management
   - SEO tools
   - Publishing workflow

## 📝 Notes

- All forms include client-side validation
- Mock data is used for demonstration
- Real API integration pending
- File uploads not yet implemented
- Email notifications not yet implemented
- Real-time updates not yet implemented

## 🐛 Known Limitations

1. **Mock Data**: All data is hardcoded mock data
2. **No Persistence**: Changes don't persist (no API)
3. **No File Upload**: Document/image upload UI only
4. **No Real-time**: No WebSocket/real-time updates
5. **No Pagination**: Pagination UI only, not functional
6. **No Search**: Search inputs don't filter results yet

## 🎨 Design System

### Colors
- Primary: Blue (#2563eb)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Danger: Red (#ef4444)
- Gray: Neutral grays

### Typography
- Headings: Bold, large
- Body: Regular, readable
- Small text: Gray, uppercase labels

### Spacing
- Consistent padding: 4, 6, 8 units
- Card spacing: 4-6 units
- Section spacing: 6 units

## 🚀 Performance Tips

1. **Lazy Loading**: Load data as needed
2. **Pagination**: Implement server-side pagination
3. **Caching**: Cache frequently accessed data
4. **Debouncing**: Debounce search inputs
5. **Virtual Scrolling**: For large lists

## 🔒 Security Considerations

1. **Authentication**: Always verify user role
2. **Authorization**: Check permissions for actions
3. **Input Validation**: Validate all form inputs
4. **SQL Injection**: Use Prisma parameterized queries
5. **XSS Protection**: Sanitize user inputs
6. **CSRF Protection**: Implement CSRF tokens

---

**Last Updated**: October 2024  
**Version**: 1.0.0  
**Status**: UI Complete, API Integration Pending
