# Permission System Quick Reference

## Quick Start

### 1. Grant Predefined Role (Fastest)
```bash
# Give user HR Manager role
curl -X POST http://localhost:3000/api/admin/permissions/grant-role \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-admin-id" \
  -d '{
    "userId": "target-user-id",
    "role": "HR_MANAGER"
  }'
```

**Available Roles**:
- `INVENTORY_MANAGER` - Manage inventory and stock
- `HR_MANAGER` - Manage employees
- `FINANCE_MANAGER` - Manage salaries, costs, and P&L
- `SALES_MANAGER` - Manage orders and customers
- `OPERATIONS_MANAGER` - View all reports

---

### 2. Grant Custom Permission
```bash
curl -X POST http://localhost:3000/api/admin/permissions \
  -H "Content-Type: application/json" \
  -H "x-user-id: your-admin-id" \
  -d '{
    "userId": "target-user-id",
    "module": "EMPLOYEES_VIEW",
    "canView": true,
    "canExport": true
  }'
```

---

### 3. Check User Permissions
```bash
curl -X GET "http://localhost:3000/api/admin/permissions?userId=target-user-id" \
  -H "x-user-id: your-admin-id"
```

---

### 4. Revoke Permission
```bash
curl -X DELETE "http://localhost:3000/api/admin/permissions?userId=target-user-id&module=EMPLOYEES_VIEW" \
  -H "x-user-id: your-admin-id"
```

---

## Common Modules

### Employee Management
- `EMPLOYEES_VIEW` - View employee data
- `EMPLOYEES_MANAGE` - Create/edit/delete employees

### Salary Management
- `SALARIES_VIEW` - View salary records
- `SALARIES_MANAGE` - Create/edit salaries
- `SALARIES_APPROVE` - Approve salary payments

### Inventory
- `INVENTORY_VIEW` - View inventory
- `INVENTORY_MANAGE` - Manage stock levels

### Costs
- `COSTS_VIEW` - View operational costs
- `COSTS_MANAGE` - Create/edit costs
- `COSTS_APPROVE` - Approve cost payments

### Profit & Loss
- `PROFIT_LOSS_VIEW` - View P&L reports

---

## Permission Actions

Each module can have:
- `canView` - Read access
- `canCreate` - Create new records
- `canEdit` - Modify records
- `canDelete` - Remove records
- `canApprove` - Approve payments/actions
- `canExport` - Export data

---

## Protected Endpoints

### Employees
```
GET    /api/admin/employees       → Needs: EMPLOYEES_VIEW (view)
POST   /api/admin/employees       → Needs: EMPLOYEES_MANAGE (create)
PUT    /api/admin/employees/[id]  → Needs: EMPLOYEES_MANAGE (edit)
DELETE /api/admin/employees/[id]  → Needs: EMPLOYEES_MANAGE (delete)
```

### Salaries
```
GET  /api/admin/salaries  → Needs: SALARIES_VIEW (view)
POST /api/admin/salaries  → Needs: SALARIES_MANAGE (create)
```

### Costs
```
GET  /api/admin/costs  → Needs: COSTS_VIEW (view)
POST /api/admin/costs  → Needs: COSTS_MANAGE (create)
```

### Profit & Loss
```
GET /api/admin/profit-loss  → Needs: PROFIT_LOSS_VIEW (view)
```

---

## Example Workflows

### Scenario 1: New HR Manager
```bash
# Grant HR Manager role (includes employee management permissions)
curl -X POST http://localhost:3000/api/admin/permissions/grant-role \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin123" \
  -d '{"userId": "hr-user-id", "role": "HR_MANAGER"}'
```

**Permissions Granted**:
- ✅ View employees
- ✅ Create employees
- ✅ Edit employees
- ✅ Delete employees
- ✅ Export employee reports
- ✅ View salary information (read-only)

---

### Scenario 2: Limited Inventory Access
```bash
# Give view-only inventory access
curl -X POST http://localhost:3000/api/admin/permissions \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin123" \
  -d '{
    "userId": "warehouse-staff-id",
    "module": "INVENTORY_VIEW",
    "canView": true,
    "canExport": false
  }'
```

---

### Scenario 3: Finance Manager
```bash
# Grant complete finance access
curl -X POST http://localhost:3000/api/admin/permissions/grant-role \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin123" \
  -d '{"userId": "finance-user-id", "role": "FINANCE_MANAGER"}'
```

**Permissions Granted**:
- ✅ Full salary management
- ✅ Full cost management
- ✅ P&L report access
- ✅ Approve payments

---

### Scenario 4: Temporary Access (30 days)
```bash
# Grant temporary permission with expiration
curl -X POST http://localhost:3000/api/admin/permissions \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin123" \
  -d '{
    "userId": "contractor-id",
    "module": "INVENTORY_VIEW",
    "canView": true,
    "canExport": true,
    "expiresAt": "2025-02-01T00:00:00Z"
  }'
```

---

## Error Codes

- `401` - `AUTH_REQUIRED` - No user ID in request header
- `403` - `PERMISSION_DENIED` - User lacks required permission
- `500` - `PERMISSION_CHECK_ERROR` - System error checking permission

---

## Testing

### Test as Admin (should work)
```bash
# Admin has all permissions by default
curl -X GET http://localhost:3000/api/admin/employees \
  -H "x-user-id: admin-id"
```

### Test as Unprivileged User (should fail with 403)
```bash
curl -X GET http://localhost:3000/api/admin/employees \
  -H "x-user-id: regular-user-id"
```

### Grant Permission and Test Again
```bash
# 1. Grant permission
curl -X POST http://localhost:3000/api/admin/permissions \
  -H "Content-Type: application/json" \
  -H "x-user-id: admin-id" \
  -d '{
    "userId": "regular-user-id",
    "module": "EMPLOYEES_VIEW",
    "canView": true
  }'

# 2. Test again (should now work)
curl -X GET http://localhost:3000/api/admin/employees \
  -H "x-user-id: regular-user-id"
```

---

## Next Steps

1. **Run Migration**: `npm run build` (or restart dev server)
2. **Assign First Manager**: Use grant-role API
3. **Test Permissions**: Try accessing protected endpoints
4. **Build Admin UI**: Create permission management interface

---

## Important Notes

- ⚠️ Users with `role: "ADMIN"` bypass all permission checks
- ⚠️ The dev server may need restart after schema changes
- ⚠️ Permission checks use header `x-user-id` (replace with JWT in production)
- ⚠️ Permissions are checked at the module-action level (e.g., EMPLOYEES_MANAGE + edit)

---

## Full Documentation

See [PERMISSION_SYSTEM.md](./PERMISSION_SYSTEM.md) for complete documentation.
