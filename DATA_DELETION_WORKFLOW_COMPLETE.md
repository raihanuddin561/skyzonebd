# Data Deletion Request System - Complete Implementation

## Overview
Complete GDPR/CCPA compliant data deletion request workflow with customer submission, admin approval, and automated anonymization/deletion process.

---

## System Architecture

### Status Flow
```
PENDING → PROCESSING → COMPLETED
   ↓
REJECTED (terminal state)
```

### Policy
- **Anonymize** user PII while retaining business-critical data
- **Delete** personal information (name, email, phone, addresses)
- **Retain** order records for legal/tax compliance (anonymized)
- **Preserve** audit trails for fraud prevention

---

## Database Schema

### DataDeletionRequest Model
```prisma
model DataDeletionRequest {
  id             String   @id @default(cuid())
  userId         String
  email          String
  phone          String?
  reason         String?
  status         DeletionRequestStatus @default(PENDING)
  requestedAt    DateTime @default(now())
  processedAt    DateTime?
  completedAt    DateTime?
  rejectedAt     DateTime?
  rejectionReason String?
  processedBy    String?
  notes          String?
  ipAddress      String?
  userAgent      String?
  
  user           User @relation(fields: [userId], references: [id])
  auditLogs      DataDeletionAuditLog[]
}

enum DeletionRequestStatus {
  PENDING      // Initial state after submission
  PROCESSING   // Approved by admin, ready for execution
  COMPLETED    // Data has been deleted/anonymized
  REJECTED     // Request denied by admin
  CANCELLED    // Cancelled by user/system
}
```

### DataDeletionAuditLog Model
```prisma
model DataDeletionAuditLog {
  id            String   @id @default(cuid())
  requestId     String
  adminId       String?
  action        String   // CREATED, APPROVED, REJECTED, EXECUTED
  previousStatus String?
  newStatus     String?
  metadata      Json?
  timestamp     DateTime @default(now())
  
  request       DataDeletionRequest @relation(fields: [requestId], references: [id])
}
```

---

## API Endpoints

### Customer Endpoints

#### 1. Submit Deletion Request
```http
POST /api/data-deletion-request
Content-Type: application/json

{
  "email": "user@example.com",
  "phone": "+880-1700-000000",
  "reason": "Optional reason for leaving" (optional)
}
```

**Response (201)**:
```json
{
  "success": true,
  "message": "Data deletion request submitted successfully",
  "data": {
    "requestId": "clxxx...",
    "status": "PENDING",
    "requestedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

**Validations**:
- Email format validation
- User must exist in database
- Prevents duplicate PENDING requests
- Captures IP address and user agent for audit

**Errors**:
- `400` - Invalid email format or missing fields
- `404` - User not found
- `409` - Existing PENDING request already exists

---

#### 2. Check Request Status
```http
GET /api/data-deletion-request?email=user@example.com
```

**Response (200)**:
```json
{
  "hasPendingRequest": true,
  "request": {
    "id": "clxxx...",
    "status": "PENDING",
    "requestedAt": "2025-01-15T10:00:00.000Z",
    "processedAt": null
  }
}
```

---

### Admin Endpoints

#### 1. List All Deletion Requests
```http
GET /api/admin/data-deletion-requests
Authorization: Bearer <admin_token>
```

**Query Parameters**:
- `status` - Filter by status (PENDING, PROCESSING, COMPLETED, REJECTED, CANCELLED)

**Response (200)**:
```json
{
  "requests": [
    {
      "id": "clxxx...",
      "userId": "user123",
      "email": "user@example.com",
      "phone": "+880-1700-000000",
      "status": "PENDING",
      "requestedAt": "2025-01-15T10:00:00.000Z",
      "reason": "No longer need account",
      "user": {
        "name": "John Doe",
        "email": "user@example.com",
        "userType": "B2C"
      }
    }
  ]
}
```

---

#### 2. Get Single Request Details
```http
GET /api/admin/data-deletion-requests/:id
Authorization: Bearer <admin_token>
```

**Response (200)**:
```json
{
  "id": "clxxx...",
  "userId": "user123",
  "email": "user@example.com",
  "phone": "+880-1700-000000",
  "status": "PENDING",
  "requestedAt": "2025-01-15T10:00:00.000Z",
  "reason": "No longer need account",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "user": {
    "name": "John Doe",
    "email": "user@example.com",
    "userType": "B2C",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "auditLogs": [
    {
      "id": "log1",
      "action": "CREATED",
      "previousStatus": null,
      "newStatus": "PENDING",
      "timestamp": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

#### 3. Approve/Reject Request
```http
PATCH /api/admin/data-deletion-requests/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "action": "approve",  // or "reject"
  "rejectionReason": "Required for reject action",
  "notes": "Optional admin notes"
}
```

**Approve Response (200)**:
```json
{
  "success": true,
  "message": "Deletion request approved",
  "request": {
    "id": "clxxx...",
    "status": "PROCESSING",
    "processedAt": "2025-01-15T11:00:00.000Z"
  }
}
```

**Reject Response (200)**:
```json
{
  "success": true,
  "message": "Deletion request rejected",
  "request": {
    "id": "clxxx...",
    "status": "REJECTED",
    "rejectedAt": "2025-01-15T11:00:00.000Z",
    "rejectionReason": "Pending transactions"
  }
}
```

**Status Transitions**:
- Only `PENDING` requests can be approved/rejected
- Approve: `PENDING` → `PROCESSING`
- Reject: `PENDING` → `REJECTED`

**Errors**:
- `400` - Invalid action or request not in PENDING status
- `404` - Request not found

---

#### 4. Execute Data Deletion
```http
POST /api/admin/data-deletion-requests/:id/execute
Authorization: Bearer <admin_token>
```

**Response (200)**:
```json
{
  "success": true,
  "message": "User data has been successfully deleted and anonymized",
  "request": {
    "id": "clxxx...",
    "status": "COMPLETED",
    "completedAt": "2025-01-15T12:00:00.000Z"
  }
}
```

**Deletion Process** (Transaction-based):
1. **Anonymize User**:
   - Email → `deleted_{userId}@anonymous.local`
   - Name → `Deleted User {userId}`
   - Phone → `null`
   - Password → `'DELETED'`
   - Set `isActive` to `false`

2. **Delete Related Data**:
   - BusinessInfo (company details)
   - Addresses (shipping/billing)
   - UserPermissions (access controls)

3. **Anonymize Data** (Keep for audit/legal):
   - RFQs: Keep request but anonymize contact info
   - Activity Logs: Retain for fraud prevention

4. **Transfer Ownership**:
   - Products: Set `createdBy` to `null`

5. **Retain** (Legal/Tax Compliance):
   - Orders: Keep for 7 years (tax law)
   - Transactions: Business records
   - Payment history: Accounting compliance

6. **Update Request**:
   - Status → `COMPLETED`
   - Set `completedAt` timestamp

7. **Create Audit Log**:
   - Action: `EXECUTED`
   - Previous status: `PROCESSING`
   - New status: `COMPLETED`

**Status Transitions**:
- Only `PROCESSING` requests can be executed
- Execute: `PROCESSING` → `COMPLETED`

**Errors**:
- `400` - Request not in PROCESSING status
- `404` - Request or user not found
- `500` - Transaction failure (rollback occurs)

---

## User Interface

### Customer Pages

#### 1. Information Page (`/data-deletion`)
**Features**:
- Overview of data deletion process
- List of data that will be deleted
- List of data retained for legal compliance
- Timeline of deletion process (submission → verification → deletion → confirmation)
- Important warnings about permanent deletion
- Two submission options:
  1. Online form (recommended)
  2. Email request
- Contact information for privacy team

**Route**: `/data-deletion`

---

#### 2. Request Submission Page (`/data-deletion/request`)
**Features**:
- Form fields:
  * Account email (required, validated)
  * Confirm email (required, must match)
  * Phone number (required, for verification)
  * Reason for deletion (optional, helps improve service)
- Warning banner about permanent action
- Acknowledgment checkbox with terms:
  * Action is permanent
  * All data will be deleted
  * Immediate loss of access
  * Forfeiture of loyalty points
  * Some data retained (anonymized)
- Submit and Cancel buttons
- Real-time validation
- Toast notifications for success/error

**Route**: `/data-deletion/request`

**Validations**:
- Email format check
- Email confirmation match
- Phone number required
- Terms acknowledgment required

**Navigation**:
- "Delete My Data" link in user menu (desktop + mobile)
- Accessible after login

---

### Admin Pages

#### 1. List View (`/admin/data-deletion-requests`)
**Features**:
- **Stats Dashboard** (Top Cards):
  * Total Requests
  * Pending Requests
  * Processing Requests
  * Completed Requests
  * Rejected Requests
- **Status Filters**:
  * ALL, PENDING, PROCESSING, COMPLETED, REJECTED, CANCELLED
  * Active filter highlighted
- **Requests Table**:
  * User name and email
  * Contact info (phone)
  * User type badge (B2C/B2B)
  * Status badge (color-coded)
  * Requested date
  * Reason (truncated with tooltip)
  * "View Details" button
- **Auto-refresh** on mount
- **Privacy compliance banner** (30-day processing requirement)
- **Empty state** with helpful message

**Route**: `/admin/data-deletion-requests`

**Status Badge Colors**:
- PENDING: Yellow
- PROCESSING: Blue
- COMPLETED: Green
- REJECTED: Red
- CANCELLED: Gray

---

#### 2. Detail View (`/admin/data-deletion-requests/[id]`)
**Features**:
- **Header**:
  * Request ID
  * Status badge
  * Back to list button
  
- **User Information Card**:
  * Name, email, phone
  * User type badge
  * Account created date
  * User ID (for reference)
  
- **Request Details Card**:
  * Reason for deletion
  * Requested date
  * Processed date (if applicable)
  * Completed date (if applicable)
  * Rejected date and reason (if rejected)
  * Admin notes
  * IP address (audit)
  * User agent (audit)
  
- **Action Buttons** (Status-dependent):
  * **PENDING**:
    - "Approve Request" (green button)
    - "Reject Request" (red button)
  * **PROCESSING**:
    - "Execute Data Deletion" (red button with warning)
  * **COMPLETED/REJECTED**:
    - No actions (terminal states)
  
- **Rejection Modal**:
  * Reason field (required)
  * Warning message
  * Confirm/Cancel buttons
  
- **Audit Trail**:
  * Timeline of all actions
  * Action type, admin, status changes
  * Metadata display
  * Timestamps
  
- **Confirmation Dialogs**:
  * Required for approve action
  * Extra warning for execute action (permanent)
  * Loading states during operations

**Route**: `/admin/data-deletion-requests/[id]`

---

## Navigation

### Customer Access
**Desktop Menu** (Header):
```
User Dropdown Menu:
├── Profile
├── My Orders
├── ─────────────
├── Delete My Data  ← NEW
└── Logout
```

**Mobile Menu** (Header):
```
User Section:
├── Profile
├── My Orders
├── ─────────────
├── Delete My Data  ← NEW
└── Logout
```

---

### Admin Access
**Admin Sidebar**:
```
Customer Management:
├── Users
├── B2B Verification
├── RFQ Requests
└── Data Deletion  ← NEW (Icon: 🗑️)
```

---

## Security & Compliance

### Authentication
- **Customer endpoints**: User authentication required
- **Admin endpoints**: Admin/Super Admin role required
- JWT token validation on all protected routes

### Audit Trail
- All actions logged in `DataDeletionAuditLog`
- Captures:
  * Admin ID performing action
  * Action type (CREATED, APPROVED, REJECTED, EXECUTED)
  * Status transitions
  * Timestamps
  * Metadata (IP, user agent, reason)

### Data Retention
**Deleted Immediately**:
- User credentials (password → 'DELETED')
- Personal information (name → 'Deleted User {id}')
- Contact details (email → 'deleted_{id}@anonymous.local')
- Business information
- Saved addresses
- User permissions

**Anonymized & Retained**:
- RFQ requests (for business audit)
- Activity logs (for fraud prevention)
- Product ownership transferred (for catalog integrity)

**Retained As-Is** (Legal Compliance):
- Order history (7 years for tax law)
- Transaction records (accounting)
- Payment history (financial compliance)
- Invoice data (business records)

### GDPR/CCPA Compliance
- ✅ Right to deletion honored
- ✅ 30-day processing timeline
- ✅ Email confirmation sent
- ✅ Audit trail maintained
- ✅ Legal data retention respected
- ✅ Anonymization over hard deletion
- ✅ User notification of process

---

## Email Notifications

### Customer Notifications
1. **Request Received**:
   - Sent immediately after submission
   - Confirms receipt of request
   - Provides timeline estimate
   - Includes request ID for tracking

2. **Request Approved** (Future Enhancement):
   - Notifies user of approval
   - Explains next steps
   - Final warning about permanence

3. **Deletion Completed**:
   - Final confirmation email
   - Explains what was deleted
   - Provides privacy team contact
   - Mentions retained data (anonymized)

### Admin Notifications
- Log entry for each new request
- Can be extended to email admin team

---

## Testing Checklist

### Customer Flow
- [ ] Submit deletion request with valid email
- [ ] Verify duplicate request prevention
- [ ] Check email notification sent
- [ ] Verify request appears in admin panel
- [ ] Test invalid email format
- [ ] Test missing required fields
- [ ] Test email confirmation mismatch
- [ ] Verify status check endpoint

### Admin Flow
- [ ] View all deletion requests
- [ ] Filter by status (PENDING, PROCESSING, etc.)
- [ ] View single request details
- [ ] Approve PENDING request → status changes to PROCESSING
- [ ] Reject PENDING request with reason → status changes to REJECTED
- [ ] Execute PROCESSING request → status changes to COMPLETED
- [ ] Verify cannot approve non-PENDING request
- [ ] Verify cannot execute non-PROCESSING request
- [ ] Check audit log created for each action
- [ ] Verify admin ID captured in audit logs

### Data Deletion
- [ ] Execute deletion for test user
- [ ] Verify user email anonymized
- [ ] Verify user name anonymized
- [ ] Verify password set to 'DELETED'
- [ ] Verify isActive set to false
- [ ] Verify BusinessInfo deleted
- [ ] Verify Addresses deleted
- [ ] Verify UserPermissions deleted
- [ ] Verify RFQs anonymized but retained
- [ ] Verify Orders retained (not deleted)
- [ ] Verify Product ownership transferred to null
- [ ] Verify Activity logs retained
- [ ] Verify audit log created
- [ ] Check request status updated to COMPLETED
- [ ] Verify completedAt timestamp set

### UI Testing
- [ ] Customer info page loads correctly
- [ ] Request form validates fields
- [ ] Acknowledgment checkbox required
- [ ] Submit button disabled while loading
- [ ] Success/error toast notifications show
- [ ] Admin list view displays stats correctly
- [ ] Filter buttons work (ALL, PENDING, etc.)
- [ ] Table displays all request data
- [ ] Status badges colored correctly
- [ ] Detail view shows all information
- [ ] Action buttons appear based on status
- [ ] Approve confirmation dialog works
- [ ] Reject modal requires reason
- [ ] Execute confirmation extra warning shown
- [ ] Audit trail timeline displays correctly
- [ ] Navigation links work (customer menu, admin sidebar)

### Edge Cases
- [ ] User deletes account while having pending orders
- [ ] Admin tries to approve already approved request
- [ ] Admin tries to execute already completed request
- [ ] Multiple admins access same request simultaneously
- [ ] User submits multiple requests in quick succession
- [ ] Transaction rollback on deletion error
- [ ] Network failure during submission
- [ ] Invalid request ID in URL

---

## Performance Considerations

### Database Queries
- Indexed fields: `userId`, `email`, `status`
- Include user data in list query (single query vs N+1)
- Pagination for large request lists (future enhancement)

### Transaction Management
- All deletion operations in single transaction
- Automatic rollback on any error
- Prevents partial data deletion

### Caching
- Stats dashboard could be cached (future enhancement)
- Request list refresh on mount (current)

---

## Future Enhancements

### Phase 2
- [ ] Pagination for admin list view
- [ ] Search by email/name in admin panel
- [ ] Export deletion logs to CSV
- [ ] Bulk deletion operations
- [ ] Schedule deletion (grace period)
- [ ] Email confirmation before deletion
- [ ] Downloadable data export before deletion
- [ ] Customer dashboard to track request status
- [ ] Automated email reminders to admins
- [ ] SLA monitoring (30-day compliance)
- [ ] Admin notes and communication log
- [ ] Reason analytics (why users leave)

### Phase 3
- [ ] Multi-language support
- [ ] Regional compliance variations (GDPR vs CCPA)
- [ ] Anonymous feedback after deletion
- [ ] Account reactivation option (within grace period)
- [ ] Deletion impact preview for admin
- [ ] Integration with customer support ticketing

---

## Compliance Documentation

### Legal References
- **GDPR Article 17**: Right to erasure ("right to be forgotten")
- **CCPA Section 1798.105**: Right to deletion
- **Bangladesh Digital Security Act**: Data privacy provisions
- **Tax Law**: 7-year retention of financial records

### Processing Timeline
1. **0-2 days**: Identity verification
2. **3-7 days**: Admin review and approval
3. **7-30 days**: Data deletion execution
4. **30 days**: Confirmation email sent

### Data Classification
| Data Type | Action | Retention | Reason |
|-----------|--------|-----------|--------|
| Email, Name, Phone | Anonymize | 0 days | PII removal |
| Password | Delete | 0 days | Security |
| Addresses | Delete | 0 days | PII removal |
| Business Info | Delete | 0 days | PII removal |
| Orders | Retain | 7 years | Tax compliance |
| Transactions | Retain | 7 years | Accounting |
| RFQs | Anonymize | Indefinite | Business audit |
| Activity Logs | Retain | Indefinite | Fraud prevention |
| Products Created | Transfer | Indefinite | Catalog integrity |

---

## API Error Codes

| Code | Meaning | Cause |
|------|---------|-------|
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | No authentication token |
| 403 | Forbidden | Not admin role |
| 404 | Not Found | Request/User doesn't exist |
| 409 | Conflict | Duplicate pending request |
| 500 | Server Error | Database/transaction failure |

---

## Files Modified/Created

### Backend (API)
- ✅ `/api/data-deletion-request/route.ts` (Customer endpoint - pre-existing)
- ✅ `/api/admin/data-deletion-requests/route.ts` (Admin list - pre-existing)
- ✅ `/api/admin/data-deletion-requests/[id]/route.ts` (Admin detail - pre-existing)
- ✅ `/api/admin/data-deletion-requests/[id]/execute/route.ts` (Execute - pre-existing)

### Frontend (Customer)
- ✅ `/data-deletion/page.tsx` (Info page - pre-existing)
- ✅ `/data-deletion/request/page.tsx` (Submission form - pre-existing)

### Frontend (Admin)
- ✅ `/admin/data-deletion-requests/page.tsx` (List view - NEW)
- ✅ `/admin/data-deletion-requests/[id]/page.tsx` (Detail view - NEW)

### Navigation
- ✅ `/admin/layout.tsx` (Added sidebar link - UPDATED)
- ✅ `/components/Header.tsx` (Added user menu links - UPDATED)

### Database
- ✅ `prisma/schema.prisma` (Models already exist - pre-existing)

---

## Quick Reference

### Status Meanings
- **PENDING**: Awaiting admin review
- **PROCESSING**: Approved, ready for deletion
- **COMPLETED**: Data deleted/anonymized
- **REJECTED**: Request denied by admin
- **CANCELLED**: Request cancelled

### Admin Actions
| Current Status | Available Actions | Result Status |
|----------------|-------------------|---------------|
| PENDING | Approve | PROCESSING |
| PENDING | Reject | REJECTED |
| PROCESSING | Execute | COMPLETED |
| COMPLETED | None | Terminal |
| REJECTED | None | Terminal |

### Customer Access Points
- **Header Menu** → "Delete My Data"
- **Direct URL** → `/data-deletion`
- **Submit Form** → `/data-deletion/request`

### Admin Access Points
- **Sidebar** → Customer Management → "Data Deletion"
- **Direct URL** → `/admin/data-deletion-requests`

---

## Support & Maintenance

### Privacy Team Contact
- **Email**: privacy@skyzonebd.com
- **Support**: support@skyzonebd.com
- **Phone**: +880-1700-000000
- **Hours**: 9 AM - 6 PM (Saturday - Thursday)

### Log Monitoring
- Check `DataDeletionRequest` table for status changes
- Monitor `DataDeletionAuditLog` for action history
- Review activity logs for deletion execution errors
- Track processing time (SLA: 30 days)

### Troubleshooting
**Issue**: Deletion fails during execution
- **Solution**: Check logs, verify transaction rollback, retry execution

**Issue**: User can't submit request
- **Solution**: Check for existing PENDING request, verify email format

**Issue**: Admin can't approve/reject
- **Solution**: Verify request status is PENDING, check admin permissions

**Issue**: Email not sent
- **Solution**: Check email service configuration, review email queue

---

## Version History
- **v1.0** (2025-01-15): Initial implementation
  * Customer submission endpoint
  * Admin approval/rejection workflow
  * Automated deletion/anonymization
  * Customer and admin UI
  * Complete audit trail

---

**Implementation Status**: ✅ COMPLETE

All features implemented and ready for testing. System is GDPR/CCPA compliant with proper audit trails, data retention policies, and user-friendly interfaces for both customers and administrators.
