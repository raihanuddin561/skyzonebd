# Admin Activity Tracking & Order Cancellation System

## 📋 Overview

A comprehensive activity tracking and order management system has been implemented to track all admin actions and provide order cancellation functionality.

## ✨ Features Implemented

### 1. **Activity Logging System**

Track all admin activities including:
- ✅ Product creation
- ✅ Product updates  
- ✅ Product deletion
- ✅ Order status changes
- ✅ Order cancellations

### 2. **Order Cancellation**

- Admins can cancel orders from the orders management page
- Customers can cancel their own orders (if not delivered)
- Stock is automatically restored when an order is cancelled
- Cancellation reasons are tracked

### 3. **Activity Logs Dashboard**

View comprehensive activity logs with:
- **Filters**: By action type, entity type, date range
- **Statistics**: Action counts, entity counts, top admins
- **Details**: Admin name, IP address, timestamp, description
- **Pagination**: Navigate through large log datasets

---

## 🗄️ Database Changes

### New Model: ActivityLog

```prisma
model ActivityLog {
  id            String         @id @default(cuid())
  userId        String         // Admin who performed the action
  userName      String         // Store name for quick reference
  action        ActivityAction // Type of action performed
  entityType    String         // Product, Order, Category, User, etc.
  entityId      String?        // ID of the affected entity
  entityName    String?        // Name/title of the affected entity
  description   String         // Human-readable description
  metadata      Json?          // Additional data (old values, new values, etc.)
  ipAddress     String?        // IP address of the admin
  userAgent     String?        // Browser/device info
  createdAt     DateTime       @default(now())
}
```

### Updated Model: Order

Added cancellation tracking:
```prisma
cancelledAt     DateTime?
cancelledBy     String?       // userId of who cancelled
cancellationReason String?
```

---

## 🔧 API Endpoints

### Activity Logs

#### Get Activity Logs
```
GET /api/admin/activity-logs
Authorization: Bearer <admin_token>

Query Parameters:
- page: number (default: 1)
- limit: number (default: 50)
- userId: string (optional)
- action: ActivityAction (optional)
- entityType: string (optional)
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)

Response:
{
  "success": true,
  "data": {
    "logs": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### Get Activity Statistics
```
GET /api/admin/activity-logs/stats
Authorization: Bearer <admin_token>

Query Parameters:
- userId: string (optional)
- startDate: ISO date string (optional)
- endDate: ISO date string (optional)

Response:
{
  "success": true,
  "data": {
    "actionCounts": [
      { "action": "CREATE", "count": 25 },
      { "action": "UPDATE", "count": 15 },
      { "action": "DELETE", "count": 5 }
    ],
    "entityCounts": [
      { "entityType": "Product", "count": 30 },
      { "entityType": "Order", "count": 15 }
    ],
    "topAdmins": [
      { "userId": "...", "userName": "Admin Name", "activityCount": 45 }
    ]
  }
}
```

### Order Cancellation

#### Cancel Order
```
POST /api/orders/cancel
Authorization: Bearer <token>

Body:
{
  "orderId": "string",
  "reason": "string (optional)"
}

Response:
{
  "success": true,
  "data": {
    "order": {...},
    "message": "Order cancelled successfully. Stock has been restored."
  }
}
```

---

## 🎨 UI Components

### 1. Activity Logs Page (`/admin/activity-logs`)

**Features:**
- Real-time activity feed
- Advanced filtering (action, entity, date range)
- Statistics dashboard with charts
- Detailed log entries with admin info and IP tracking
- Pagination for large datasets

**Access:**
- Admin sidebar → Settings → Activity Logs
- Or navigate to: `/admin/activity-logs`

### 2. Order Cancellation Button

**Location:** Admin Orders page (`/admin/orders`)

**Behavior:**
- Appears for orders that are not "cancelled" or "delivered"
- Prompts admin for cancellation reason
- Updates order status to CANCELLED
- Restores product stock automatically
- Logs the cancellation activity

---

## 🔐 Activity Actions Tracked

| Action | Description | Icon |
|--------|-------------|------|
| CREATE | New entity created | ➕ |
| UPDATE | Entity modified | ✏️ |
| DELETE | Entity deleted | 🗑️ |
| STATUS_CHANGE | Order status changed | 🔄 |
| CANCEL | Order cancelled | ❌ |
| RESTORE | Item restored | ♻️ |
| EXPORT | Data exported | 📤 |
| IMPORT | Data imported | 📥 |
| LOGIN | Admin login | 🔐 |
| LOGOUT | Admin logout | 🚪 |

---

## 📊 Metadata Tracked

### Product Activities
- Product ID, SKU
- Category name
- Price changes
- Stock changes
- Status changes (active/inactive)

### Order Activities
- Order number
- Old status → New status
- Payment status changes
- Cancellation details (who, when, why)
- Order total and items count

---

## 🚀 Usage Examples

### Tracking Product Deletion

When an admin deletes a product, the system automatically logs:

```javascript
{
  action: 'DELETE',
  entityType: 'Product',
  entityId: 'cm123abc',
  entityName: 'Samsung Galaxy S24',
  description: 'Deleted product "Samsung Galaxy S24" (SKU: SAM-S24-001)',
  metadata: {
    productId: 'cm123abc',
    sku: 'SAM-S24-001'
  },
  ipAddress: '192.168.1.1',
  userName: 'John Admin'
}
```

### Tracking Order Status Change

When an order status is updated:

```javascript
{
  action: 'STATUS_CHANGE',
  entityType: 'Order',
  entityId: 'cm456def',
  entityName: 'ORD-1700000001',
  description: 'Updated order ORD-1700000001: Order status: PENDING → PROCESSING',
  metadata: {
    orderId: 'cm456def',
    orderNumber: 'ORD-1700000001',
    oldStatus: 'PENDING',
    newStatus: 'PROCESSING'
  }
}
```

### Cancelling an Order

1. Navigate to `/admin/orders`
2. Find the order you want to cancel
3. Click the "Cancel" button
4. Enter a cancellation reason
5. System will:
   - Update order status to CANCELLED
   - Restore product stock
   - Log the cancellation with reason
   - Track who cancelled (admin ID)

---

## 🔍 Filtering & Search

### Activity Logs Filters

1. **Action Type**: Filter by specific actions (CREATE, UPDATE, DELETE, etc.)
2. **Entity Type**: Filter by entity (Product, Order, Category, User)
3. **Date Range**: Filter activities between specific dates
4. **Admin User**: Filter by specific admin (optional)

### Clear Filters

Use the "Clear Filters" button to reset all filters and view all activities.

---

## 📈 Statistics Dashboard

The Activity Logs page shows:

1. **Actions by Type**: Bar chart showing count of each action type
2. **Entities Modified**: Breakdown of which entities were affected
3. **Top Admins**: Most active administrators by action count

---

## 🛡️ Security Features

1. **Admin-Only Access**: Activity logs are only accessible to admins
2. **IP Tracking**: Records IP address for each activity
3. **User Agent Tracking**: Records browser/device information
4. **Immutable Logs**: Activity logs cannot be edited or deleted
5. **Authorization Checks**: All cancellation requests are authorized

---

## 🔄 Stock Management

When an order is cancelled:
1. System fetches all order items
2. For each item, increments product stock by order quantity
3. Updates product availability if stock becomes available
4. Logs the stock restoration

---

## 📝 Notes

- Activity logs are permanent and cannot be deleted
- Only admins can view activity logs
- Customers can cancel their own orders (before delivery)
- Stock is automatically restored on cancellation
- All cancellations require a reason (tracked in metadata)
- IP addresses support proxy headers (X-Forwarded-For, X-Real-IP, CF-Connecting-IP)

---

## 🎯 Future Enhancements

Potential improvements:
- Export activity logs to CSV/PDF
- Email notifications for critical activities
- Real-time activity feed with WebSocket
- Advanced analytics and reporting
- Activity log retention policies
- Role-based activity visibility

---

## 💡 Best Practices

1. **Regular Monitoring**: Check activity logs daily for suspicious activities
2. **Filter by Date**: Use date filters to review recent activities
3. **Track Cancellations**: Monitor cancellation reasons for patterns
4. **Export Reports**: Generate monthly reports for auditing
5. **User Training**: Train admins on proper reason documentation

---

## 🐛 Troubleshooting

### Activity Not Logged
- Verify admin is properly authenticated
- Check JWT token is valid
- Ensure database connection is active
- Verify Prisma client is properly initialized

### Order Cancellation Failed
- Check order status (cannot cancel delivered orders)
- Verify user authorization (admin or order owner)
- Ensure order exists in database
- Check stock update permissions

### Statistics Not Loading
- Verify date range is valid
- Check database queries for performance
- Ensure proper aggregation queries
- Verify Prisma groupBy is supported

---

## 📚 Related Files

### Backend
- `prisma/schema.prisma` - Database schema
- `src/lib/activityLogger.ts` - Activity logging utility
- `src/app/api/orders/cancel/route.ts` - Order cancellation API
- `src/app/api/admin/activity-logs/route.ts` - Activity logs API
- `src/app/api/admin/activity-logs/stats/route.ts` - Statistics API
- `src/app/api/products/route.ts` - Product creation/deletion logging
- `src/app/api/products/[id]/route.ts` - Product update/delete logging
- `src/app/api/orders/route.ts` - Order status change logging

### Frontend
- `src/app/admin/activity-logs/page.tsx` - Activity logs UI
- `src/app/admin/orders/page.tsx` - Orders management with cancel button
- `src/app/admin/layout.tsx` - Admin navigation with Activity Logs link

---

## ✅ Implementation Complete

All requested features have been successfully implemented:
- ✅ Track who deleted products
- ✅ Track who inserted products
- ✅ Track who changed order status
- ✅ Order cancellation option
- ✅ Stock restoration on cancellation
- ✅ Comprehensive activity logs dashboard
- ✅ Advanced filtering and statistics

The system is now production-ready and follows Alibaba/Amazon-style e-commerce best practices!
