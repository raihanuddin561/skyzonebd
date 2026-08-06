# Permission System Documentation

## Overview
Granular role-based access control (RBAC) system for managing user privileges across sensitive business operations including inventory, employees, salaries, costs, and profit/loss reports.

## Features
- ✅ **Module-level permissions** with granular action control
- ✅ **Six permission actions**: view, create, edit, delete, approve, export
- ✅ **30+ permission modules** covering all business areas
- ✅ **Predefined roles** for common positions
- ✅ **Permission expiration** support
- ✅ **Super admin** bypass (ADMIN role has all permissions)
- ✅ **Middleware integration** for API protection

---

## Permission Modules

### Inventory Management
- `INVENTORY_VIEW` - View inventory data
- `INVENTORY_MANAGE` - Manage stock levels
- `INVENTORY_REPORTS` - Generate inventory reports

### Employee Management
- `EMPLOYEES_VIEW` - View employee data
- `EMPLOYEES_MANAGE` - Create/edit/delete employees
- `EMPLOYEES_REPORTS` - Generate employee reports

### Salary Management
- `SALARIES_VIEW` - View salary data
- `SALARIES_MANAGE` - Create/edit salary records
- `SALARIES_PROCESS` - Process salary payments
- `SALARIES_APPROVE` - Approve salary disbursements
- `SALARIES_REPORTS` - Generate salary reports

### Cost Management
- `COSTS_VIEW` - View operational costs
- `COSTS_MANAGE` - Create/edit cost entries
- `COSTS_APPROVE` - Approve cost payments
- `COSTS_REPORTS` - Generate cost reports

### Profit & Loss
- `PROFIT_LOSS_VIEW` - View P&L reports
- `PROFIT_LOSS_REPORTS` - Generate detailed P&L reports

### Product Management
- `PRODUCTS_VIEW` - View products
- `PRODUCTS_MANAGE` - Create/edit products
- `PRODUCTS_APPROVE` - Approve new products

### Order Management
- `ORDERS_VIEW` - View orders
- `ORDERS_MANAGE` - Manage orders
- `ORDERS_APPROVE` - Approve orders
- `ORDERS_REPORTS` - Generate order reports

### Customer Management
- `CUSTOMERS_VIEW` - View customer data
- `CUSTOMERS_MANAGE` - Manage customer accounts
- `CUSTOMERS_REPORTS` - Generate customer reports

### System Management
- `CATEGORIES_MANAGE` - Manage product categories
- `USERS_MANAGE` - Manage user accounts
- `PERMISSIONS_MANAGE` - Manage user permissions
- `SETTINGS_MANAGE` - Manage system settings
- `REPORTS_VIEW` - View system reports
- `ANALYTICS_VIEW` - View analytics dashboard

---

## Permission Actions

Each module can have these actions:
- **view**: Read-only access
- **create**: Create new records
- **edit**: Modify existing records
- **delete**: Remove records
- **approve**: Approve actions/payments
- **export**: Export data

---

## Predefined Roles

### 1. Inventory Manager
**Purpose**: Manage stock and inventory operations

**Permissions**:
- INVENTORY_VIEW (all actions)
- INVENTORY_MANAGE (all actions)
- INVENTORY_REPORTS (view, export)
- PRODUCTS_VIEW (view)
- ORDERS_VIEW (view)

### 2. HR Manager
**Purpose**: Manage employees and attendance

**Permissions**:
- EMPLOYEES_VIEW (all actions)
- EMPLOYEES_MANAGE (all actions)
- EMPLOYEES_REPORTS (view, export)
- SALARIES_VIEW (view)

### 3. Finance Manager
**Purpose**: Manage finances, salaries, and costs

**Permissions**:
- SALARIES_VIEW (all actions)
- SALARIES_MANAGE (all actions)
- SALARIES_PROCESS (all actions)
- SALARIES_APPROVE (all actions)
- SALARIES_REPORTS (view, export)
- COSTS_VIEW (all actions)
- COSTS_MANAGE (all actions)
- COSTS_APPROVE (all actions)
- COSTS_REPORTS (view, export)
- PROFIT_LOSS_VIEW (all actions)
- PROFIT_LOSS_REPORTS (view, export)

### 4. Sales Manager
**Purpose**: Manage orders and customers

**Permissions**:
- ORDERS_VIEW (all actions)
- ORDERS_MANAGE (all actions)
- ORDERS_APPROVE (approve)
- ORDERS_REPORTS (view, export)
- CUSTOMERS_VIEW (all actions)
- CUSTOMERS_MANAGE (all actions)
- CUSTOMERS_REPORTS (view, export)
- PRODUCTS_VIEW (view)

### 5. Operations Manager
**Purpose**: Overall operational oversight

**Permissions**:
- INVENTORY_VIEW (view, export)
- EMPLOYEES_VIEW (view, export)
- ORDERS_VIEW (view, export)
- PROFIT_LOSS_VIEW (view, export)
- ANALYTICS_VIEW (view, export)
- REPORTS_VIEW (view, export)

---

## API Endpoints

### Permission Management

#### 1. Get User Permissions
```http
GET /api/admin/permissions?userId={userId}
```

**Headers**: `x-user-id: {requesterId}`

**Required Permission**: `PERMISSIONS_MANAGE` (view)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "perm123",
      "userId": "user123",
      "module": "EMPLOYEES_VIEW",
      "canView": true,
      "canCreate": false,
      "canEdit": false,
      "canDelete": false,
      "canApprove": false,
      "canExport": true,
      "grantedBy": "admin123",
      "grantedAt": "2025-01-01T00:00:00Z",
      "expiresAt": null
    }
  ]
}
```

#### 2. Grant Permission
```http
POST /api/admin/permissions
```

**Headers**: `x-user-id: {adminId}`

**Required Permission**: `PERMISSIONS_MANAGE` (create)

**Body**:
```json
{
  "userId": "user123",
  "module": "EMPLOYEES_MANAGE",
  "canView": true,
  "canCreate": true,
  "canEdit": true,
  "canDelete": false,
  "canApprove": false,
  "canExport": true,
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "perm456",
    "userId": "user123",
    "module": "EMPLOYEES_MANAGE",
    ...
  },
  "message": "Permission granted successfully"
}
```

#### 3. Grant Role Permissions
```http
POST /api/admin/permissions/grant-role
```

**Headers**: `x-user-id: {adminId}`

**Required Permission**: `PERMISSIONS_MANAGE` (create)

**Body**:
```json
{
  "userId": "user123",
  "role": "HR_MANAGER"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "role": "HR_MANAGER",
    "permissions": [...]
  },
  "message": "HR_MANAGER permissions granted successfully"
}
```

#### 4. Revoke Permission
```http
DELETE /api/admin/permissions?userId={userId}&module={module}
```

**Headers**: `x-user-id: {adminId}`

**Required Permission**: `PERMISSIONS_MANAGE` (delete)

**Response**:
```json
{
  "success": true,
  "message": "Permission revoked successfully"
}
```

#### 5. Revoke All Permissions
```http
DELETE /api/admin/permissions/revoke-all?userId={userId}
```

**Headers**: `x-user-id: {adminId}`

**Required Permission**: `PERMISSIONS_MANAGE` (delete)

**Response**:
```json
{
  "success": true,
  "message": "All permissions revoked successfully"
}
```

---

## Protected Endpoints

### Employees
- **GET /api/admin/employees** - Requires: `EMPLOYEES_VIEW` (view)
- **POST /api/admin/employees** - Requires: `EMPLOYEES_MANAGE` (create)
- **GET /api/admin/employees/[id]** - Requires: `EMPLOYEES_VIEW` (view)
- **PUT /api/admin/employees/[id]** - Requires: `EMPLOYEES_MANAGE` (edit)
- **DELETE /api/admin/employees/[id]** - Requires: `EMPLOYEES_MANAGE` (delete)

### Salaries
- **GET /api/admin/salaries** - Requires: `SALARIES_VIEW` (view)
- **POST /api/admin/salaries** - Requires: `SALARIES_MANAGE` (create)

### Costs
- **GET /api/admin/costs** - Requires: `COSTS_VIEW` (view)
- **POST /api/admin/costs** - Requires: `COSTS_MANAGE` (create)

### Profit & Loss
- **GET /api/admin/profit-loss** - Requires: `PROFIT_LOSS_VIEW` (view)

---

## Usage Examples

### 1. Assign HR Manager Role
```javascript
const response = await fetch('/api/admin/permissions/grant-role', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'admin123'
  },
  body: JSON.stringify({
    userId: 'user456',
    role: 'HR_MANAGER'
  })
});
```

### 2. Grant Custom Permission
```javascript
const response = await fetch('/api/admin/permissions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-user-id': 'admin123'
  },
  body: JSON.stringify({
    userId: 'user456',
    module: 'INVENTORY_VIEW',
    canView: true,
    canExport: true
  })
});
```

### 3. Check User Permissions
```javascript
const response = await fetch('/api/admin/permissions?userId=user456', {
  headers: {
    'x-user-id': 'admin123'
  }
});
const { data: permissions } = await response.json();
```

### 4. Revoke Specific Permission
```javascript
const response = await fetch(
  '/api/admin/permissions?userId=user456&module=INVENTORY_VIEW',
  {
    method: 'DELETE',
    headers: {
      'x-user-id': 'admin123'
    }
  }
);
```

---

## Middleware Usage

### In API Routes
```typescript
import { checkPermission } from '@/middleware/permissionMiddleware';

export async function GET(request: NextRequest) {
  // Check permission
  const permCheck = await checkPermission(
    request, 
    'EMPLOYEES_VIEW', 
    'view'
  );
  
  if (!permCheck.authorized) {
    return permCheck.response; // Returns 403 Forbidden
  }
  
  const userId = permCheck.userId;
  
  // Continue with authorized logic
  // ...
}
```

### Alternative: Require Permission (throws error)
```typescript
import { requirePermission } from '@/middleware/permissionMiddleware';

export async function POST(request: NextRequest) {
  try {
    const userId = await requirePermission(
      request,
      'EMPLOYEES_MANAGE',
      'create'
    );
    
    // Continue with authorized logic
    // ...
  } catch (error) {
    if (error instanceof PermissionError) {
      return error.response;
    }
    throw error;
  }
}
```

---

## Utility Functions

### Check Permission
```typescript
import { hasPermission } from '@/utils/permissions';

const canEdit = await hasPermission(
  'user123',
  'EMPLOYEES_MANAGE',
  'edit'
);
```

### Check Multiple Permissions
```typescript
import { hasAnyPermission, hasAllPermissions } from '@/utils/permissions';

// User needs ANY of these
const hasAny = await hasAnyPermission('user123', [
  { module: 'EMPLOYEES_VIEW', action: 'view' },
  { module: 'EMPLOYEES_MANAGE', action: 'view' }
]);

// User needs ALL of these
const hasAll = await hasAllPermissions('user123', [
  { module: 'SALARIES_VIEW', action: 'view' },
  { module: 'SALARIES_MANAGE', action: 'edit' }
]);
```

### Grant/Revoke Permissions
```typescript
import { 
  grantPermission, 
  revokePermission 
} from '@/utils/permissions';

// Grant
await grantPermission(
  'user123',
  'INVENTORY_VIEW',
  'admin123',
  {
    canView: true,
    canExport: true
  }
);

// Revoke
await revokePermission('user123', 'INVENTORY_VIEW');
```

---

## Database Schema

### UserPermission Model
```prisma
model UserPermission {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  module      PermissionModule
  
  // Granular actions
  canView     Boolean  @default(false)
  canCreate   Boolean  @default(false)
  canEdit     Boolean  @default(false)
  canDelete   Boolean  @default(false)
  canApprove  Boolean  @default(false)
  canExport   Boolean  @default(false)
  
  // Audit
  grantedBy   String?
  grantedAt   DateTime @default(now())
  expiresAt   DateTime?
  
  @@unique([userId, module])
  @@map("user_permissions")
}
```

### PermissionModule Enum
```prisma
enum PermissionModule {
  // Inventory
  INVENTORY_VIEW
  INVENTORY_MANAGE
  INVENTORY_REPORTS
  
  // Employees
  EMPLOYEES_VIEW
  EMPLOYEES_MANAGE
  EMPLOYEES_REPORTS
  
  // Salaries
  SALARIES_VIEW
  SALARIES_MANAGE
  SALARIES_PROCESS
  SALARIES_APPROVE
  SALARIES_REPORTS
  
  // Costs
  COSTS_VIEW
  COSTS_MANAGE
  COSTS_APPROVE
  COSTS_REPORTS
  
  // Profit/Loss
  PROFIT_LOSS_VIEW
  PROFIT_LOSS_REPORTS
  
  // Products
  PRODUCTS_VIEW
  PRODUCTS_MANAGE
  PRODUCTS_APPROVE
  
  // Orders
  ORDERS_VIEW
  ORDERS_MANAGE
  ORDERS_APPROVE
  ORDERS_REPORTS
  
  // Customers
  CUSTOMERS_VIEW
  CUSTOMERS_MANAGE
  CUSTOMERS_REPORTS
  
  // System
  CATEGORIES_MANAGE
  USERS_MANAGE
  PERMISSIONS_MANAGE
  SETTINGS_MANAGE
  REPORTS_VIEW
  ANALYTICS_VIEW
}
```

---

## Migration & Setup

### 1. Run Database Migration
```bash
npm run build  # Auto-runs migrations
```

### 2. Grant Admin Permissions
Users with `role: "ADMIN"` automatically have all permissions. No setup needed.

### 3. Assign First Manager
```bash
# Via API or admin panel
curl -X POST http://localhost:3000/api/admin/permissions/grant-role \
  -H "x-user-id: admin-id" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "HR_MANAGER"}'
```

---

## Security Notes

1. **Super Admin Bypass**: Users with `role = 'ADMIN'` bypass all permission checks
2. **Permission Expiration**: Set `expiresAt` for temporary access
3. **Audit Trail**: All permissions track `grantedBy` and `grantedAt`
4. **Unique Constraint**: One permission per user per module (upsert behavior)
5. **Cascade Delete**: Permissions deleted when user is deleted

---

## Testing

### Test Permission Check
```typescript
// Should return true for admin
const adminAccess = await hasPermission('admin-id', 'EMPLOYEES_MANAGE', 'delete');

// Should return false for user without permission
const userAccess = await hasPermission('user-id', 'EMPLOYEES_MANAGE', 'delete');

// Grant permission and test again
await grantPermission('user-id', 'EMPLOYEES_MANAGE', 'admin-id', {
  canDelete: true
});
const newAccess = await hasPermission('user-id', 'EMPLOYEES_MANAGE', 'delete');
// Should now return true
```

### Test Middleware
```bash
# Without permission - should return 403
curl -X GET http://localhost:3000/api/admin/employees \
  -H "x-user-id: user-without-permission"

# With permission - should return 200
curl -X GET http://localhost:3000/api/admin/employees \
  -H "x-user-id: user-with-permission"
```

---

## Frontend Integration (To Do)

### 1. Permission Management UI
- User list with permission indicators
- Permission assignment modal
- Role selection dropdown
- Custom permission toggles
- Permission expiration date picker

### 2. Protected Routes
```typescript
// Check permission before rendering admin pages
const canViewEmployees = await hasPermission(
  currentUserId,
  'EMPLOYEES_VIEW',
  'view'
);

if (!canViewEmployees) {
  redirect('/unauthorized');
}
```

### 3. Conditional UI Elements
```tsx
{hasPermission(userId, 'EMPLOYEES_MANAGE', 'create') && (
  <button>Add Employee</button>
)}
```

---

## Next Steps

1. ✅ Permission system implementation
2. ✅ Middleware integration
3. ✅ API protection added
4. ⏳ Run database migration
5. ⏳ Create admin UI for permission management
6. ⏳ Add permission checks to remaining APIs (products, orders, customers)
7. ⏳ Add frontend permission indicators
8. ⏳ Test permission workflows

---

## Support

For issues or questions about the permission system:
1. Check `PERMISSION_SYSTEM.md` (this file)
2. Review `src/utils/permissions.ts` for utility functions
3. Check `src/middleware/permissionMiddleware.ts` for middleware usage
4. Review API files for implementation examples
