# 🚀 Quick Start Guide - New Features

## Authentication System

### Basic Usage

```typescript
import { requireAuth, requireAdmin } from '@/lib/auth';

// In any API route that needs authentication
export async function GET(request: NextRequest) {
  const user = await requireAuth(request);
  // user.id, user.email, user.role, user.userType available
  
  // Your authenticated logic here
}

// For admin-only routes
export async function DELETE(request: NextRequest) {
  await requireAdmin(request);  // Throws 403 if not admin
  
  // Admin-only logic here
}
```

### Client-Side: Sending Authenticated Requests

```typescript
// Get token from localStorage
const token = localStorage.getItem('token');

// Make authenticated API call
const response = await fetch('/api/user/profile', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Logging System

### Replace console.log

**Before:**
```typescript
console.log('User logged in:', userId);
console.error('Error updating profile:', error);
```

**After:**
```typescript
import { logInfo, logError } from '@/lib/logger';

logInfo('User logged in', 'Auth');
logError('Error updating profile', error, 'Profile');
```

### Full Logger API

```typescript
import { logger } from '@/lib/logger';

// Debug (dev only)
logger.debug('Processing order', {
  context: 'Orders',
  metadata: { orderId: '123', items: 5 }
});

// Info
logger.info('Payment processed', { context: 'Payments' });

// Warning
logger.warn('Stock running low', { context: 'Inventory' });

// Error
logger.error('Database connection failed', error, { context: 'DB' });

// API Request logging
logger.logRequest('POST', '/api/orders', 201, 150); // 150ms
```

---

## Email Notifications

### Send Emails

```typescript
import { emailService } from '@/lib/email';

// Welcome email
await emailService.sendWelcomeEmail(
  'user@example.com',
  'John Doe',
  'WHOLESALE'  // or 'RETAIL'
);

// Order confirmation
await emailService.sendOrderConfirmation(
  'user@example.com',
  'ORD-12345',
  15000,
  [
    { name: 'Product 1', quantity: 2, price: 5000 },
    { name: 'Product 2', quantity: 1, price: 5000 }
  ]
);

// Password reset
await emailService.sendPasswordReset(
  'user@example.com',
  'reset_token_here'
);

// Business verification
await emailService.sendBusinessVerificationStatus(
  'user@example.com',
  'John Doe',
  'APPROVED' // or 'REJECTED'
);

// Custom email
await emailService.sendEmail({
  to: 'user@example.com',
  subject: 'Your Custom Subject',
  html: '<h1>Hello!</h1><p>Your HTML content</p>',
  from: 'Custom Sender <sender@skyzonebd.com>',  // Optional
  replyTo: 'reply@skyzonebd.com',  // Optional
  cc: ['cc@example.com'],  // Optional
  bcc: ['bcc@example.com']  // Optional
});
```

### Email in Development

In development mode (no RESEND_API_KEY), emails are logged to console:

```
📧 Email Preview (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: SkyzoneBD <noreply@skyzonebd.com>
To: user@example.com
Subject: Welcome to SkyzoneBD!
HTML: <!DOCTYPE html><html>...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Environment Setup

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-here"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_token"

# Email (get from resend.com)
RESEND_API_KEY="re_your_key"

# Site URL
NEXT_PUBLIC_SITE_URL="https://yourdomain.com"

# Node Environment
NODE_ENV="production"
```

### Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Or in Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Common Patterns

### Protected API Route with Error Handling

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logError, logInfo } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await requireAuth(request);
    
    // Parse body
    const body = await request.json();
    const { productId, quantity } = body;
    
    // Validate
    if (!productId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Business logic
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        productId,
        quantity
      }
    });
    
    // Log success
    logInfo(`Order created: ${order.id}`, 'Orders');
    
    return NextResponse.json({ success: true, order });
    
  } catch (error) {
    logError('Failed to create order', error, 'Orders');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Send Email After User Registration

```typescript
import { emailService } from '@/lib/email';
import { logInfo, logError } from '@/lib/logger';

// After creating user in database
try {
  await emailService.sendWelcomeEmail(
    newUser.email,
    newUser.name,
    newUser.userType
  );
  
  logInfo(`Welcome email sent to ${newUser.email}`, 'Auth');
} catch (error) {
  // Log error but don't fail registration
  logError('Failed to send welcome email', error, 'Email');
}
```

---

## Testing

### Test Authentication

```bash
# Get a token (login first)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"password"}'

# Use token in protected route
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Email (Development)

```typescript
// In development, emails log to console
import { emailService } from '@/lib/email';

await emailService.sendWelcomeEmail(
  'test@example.com',
  'Test User',
  'WHOLESALE'
);

// Check your terminal/console for the email preview
```

---

## Troubleshooting

### Authentication Issues

**Problem:** "Invalid or expired token"
```typescript
// Check token format
const token = localStorage.getItem('token');
console.log('Token:', token);

// Make sure it's sent correctly
headers: {
  'Authorization': `Bearer ${token}`  // Note the "Bearer " prefix
}
```

**Problem:** "User not found"
```typescript
// Token is valid but user doesn't exist in DB
// Check if user was deleted or database was reset
```

### Email Not Sending

**Development:**
- Emails log to console (this is normal)
- Check terminal output for email preview

**Production:**
```bash
# Check if RESEND_API_KEY is set
echo $RESEND_API_KEY

# Verify API key is valid at resend.com
# Check Vercel environment variables
```

### Logging Not Working

```typescript
// Make sure logger is imported correctly
import { logger, logInfo } from '@/lib/logger';

// Check NODE_ENV
console.log('Environment:', process.env.NODE_ENV);

// Debug logs only show in development
logger.debug('This only shows in dev');
```

---

## Migration Checklist

### Replace Old Patterns

- [ ] Replace `console.log` with `logger.info`
- [ ] Replace `console.error` with `logError`
- [ ] Add authentication to protected routes
- [ ] Send welcome emails on registration
- [ ] Send order confirmations
- [ ] Update error handling

### Update .env

- [ ] Copy .env.example to .env
- [ ] Set DATABASE_URL
- [ ] Generate and set JWT_SECRET
- [ ] Get and set RESEND_API_KEY
- [ ] Set NEXT_PUBLIC_SITE_URL

### Test Everything

- [ ] Test login/logout
- [ ] Test protected routes
- [ ] Test email sending
- [ ] Test logging output
- [ ] Test error scenarios

---

## Performance Tips

1. **Caching:** Cache frequently accessed user data
2. **Rate Limiting:** Add rate limiting to prevent abuse
3. **Database Indexes:** Ensure userId fields are indexed
4. **Email Queues:** For bulk emails, use a queue (Bull, BullMQ)
5. **Monitoring:** Add Sentry or similar for error tracking

---

## Need Help?

- Check inline documentation in each file
- Review [IMPLEMENTATION_COMPLETION_REPORT.md](IMPLEMENTATION_COMPLETION_REPORT.md)
- Check TypeScript types for available options
- Review example code in existing API routes

---

**All systems ready for production! 🚀**
