# Financial Ledger Implementation Guide

## Overview
The `FinancialLedger` model is an **append-only** audit log for all financial transactions in the system. This ensures complete financial traceability and accountability.

## Schema Changes Summary

### New Model: FinancialLedger

```prisma
model FinancialLedger {
  id              String               @id @default(cuid())
  
  // Transaction Source
  sourceType      LedgerSourceType     // Type of transaction
  sourceId        String               // Reference ID
  sourceName      String?              // Human-readable reference
  
  // Financial Data
  amount          Float                // Always positive
  direction       LedgerDirection      // DEBIT or CREDIT
  currency        String               @default("BDT")
  
  // Categorization
  category        String?
  subcategory     String?
  
  // Parties
  partyId         String?
  partyName       String?
  partyType       String?
  
  // Metadata
  description     String?
  notes           String?
  metadata        Json?
  
  // Audit
  createdAt       DateTime             @default(now())
  createdBy       String?
  fiscalYear      Int?
  fiscalMonth     Int?
  
  // Reconciliation
  isReconciled    Boolean              @default(false)
  reconciledAt    DateTime?
  reconciledBy    String?
  
  // Relations
  order           Order?
}
```

### New Enums

```prisma
enum LedgerSourceType {
  ORDER          // Revenue from customer order
  EXPENSE        // Operational expense
  SALARY         // Employee salary payment
  ADJUSTMENT     // Manual correction/adjustment
  REFUND         // Customer refund
  PURCHASE       // Inventory purchase
  RETURN         // Customer return
  FEE            // Platform/transaction fees
  COMMISSION     // Partner commission payout
  INVESTMENT     // Capital investment
  WITHDRAWAL     // Capital withdrawal
  TAX            // Tax payment
  UTILITY        // Utility bills
  RENT           // Rent payment
  MARKETING      // Marketing expenses
  SHIPPING       // Shipping costs
  OTHER          // Miscellaneous
}

enum LedgerDirection {
  DEBIT          // Money out (expenses, costs)
  CREDIT         // Money in (revenue, income)
}
```

## Key Principles

### 1. **Append-Only**
- ❌ **NEVER** update existing entries
- ❌ **NEVER** delete entries
- ✅ **ALWAYS** create new entries for corrections
- ✅ Use ADJUSTMENT entries to fix mistakes

### 2. **Double-Entry Bookkeeping**
Each transaction should create TWO entries:

**Example: Order Completed**
```typescript
// Entry 1: Revenue (Credit)
{
  sourceType: 'ORDER',
  sourceId: orderId,
  amount: 13500,
  direction: 'CREDIT',
  category: 'REVENUE',
  description: 'Order #ORD-123456 revenue'
}

// Entry 2: Cost (Debit)
{
  sourceType: 'ORDER',
  sourceId: orderId,
  amount: 8000,
  direction: 'DEBIT',
  category: 'COGS',
  description: 'Order #ORD-123456 cost of goods'
}
```

### 3. **Backward Compatible**
- ✅ Existing profit fields remain unchanged
- ✅ Order, ProfitReport models unaffected
- ✅ Ledger is additive - runs parallel to existing system

## Migration Steps

### Step 1: Run Prisma Migration

```bash
# Generate migration
npx prisma migrate dev --name add_financial_ledger

# Apply to production
npx prisma migrate deploy
```

### Step 2: No Code Changes Required Yet
The ledger is ready but not yet integrated. Future prompts will add:
- Automatic ledger entry creation
- Ledger query APIs
- Financial reports from ledger

## Example Usage Patterns

### Recording an Order
```typescript
await prisma.financialLedger.create({
  data: {
    sourceType: 'ORDER',
    sourceId: order.id,
    sourceName: order.orderNumber,
    amount: order.total,
    direction: 'CREDIT',
    category: 'REVENUE',
    subcategory: 'WHOLESALE_SALES',
    partyId: order.userId,
    partyName: customer.name,
    partyType: 'CUSTOMER',
    description: `Revenue from order ${order.orderNumber}`,
    fiscalYear: new Date().getFullYear(),
    fiscalMonth: new Date().getMonth() + 1,
    createdAt: new Date()
  }
});
```

### Recording an Expense
```typescript
await prisma.financialLedger.create({
  data: {
    sourceType: 'SALARY',
    sourceId: salaryPaymentId,
    amount: 50000,
    direction: 'DEBIT',
    category: 'OPERATING_EXPENSE',
    subcategory: 'EMPLOYEE_SALARY',
    partyId: employeeId,
    partyName: 'John Doe',
    partyType: 'EMPLOYEE',
    description: 'Monthly salary - January 2026',
    fiscalYear: 2026,
    fiscalMonth: 1,
    createdBy: adminUserId
  }
});
```

### Correcting a Mistake (DO NOT UPDATE - Create Adjustment)
```typescript
// Original entry (wrong amount)
// ID: ledger_abc123, amount: 1000, direction: DEBIT

// Create reversal entry
await prisma.financialLedger.create({
  data: {
    sourceType: 'ADJUSTMENT',
    sourceId: 'ledger_abc123',
    amount: 1000,
    direction: 'CREDIT', // Opposite direction
    category: 'ADJUSTMENT',
    description: 'Reversal of incorrect entry ledger_abc123',
    metadata: { reversedEntryId: 'ledger_abc123' }
  }
});

// Create correct entry
await prisma.financialLedger.create({
  data: {
    sourceType: 'EXPENSE',
    sourceId: expenseId,
    amount: 1500, // Correct amount
    direction: 'DEBIT',
    category: 'OPERATING_EXPENSE',
    description: 'Corrected expense entry'
  }
});
```

## Querying the Ledger

### Get All Transactions for an Order
```typescript
const ledgerEntries = await prisma.financialLedger.findMany({
  where: {
    sourceType: 'ORDER',
    sourceId: orderId
  },
  orderBy: { createdAt: 'asc' }
});
```

### Calculate Balance
```typescript
const entries = await prisma.financialLedger.findMany({
  where: {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  }
});

const balance = entries.reduce((total, entry) => {
  return entry.direction === 'CREDIT' 
    ? total + entry.amount 
    : total - entry.amount;
}, 0);
```

### Monthly Profit/Loss
```typescript
const monthlyEntries = await prisma.financialLedger.groupBy({
  by: ['fiscalYear', 'fiscalMonth', 'direction'],
  where: {
    fiscalYear: 2026
  },
  _sum: {
    amount: true
  }
});

// Calculate: Credits (income) - Debits (expenses) = Net Profit
```

## Benefits

### 1. **Complete Audit Trail**
- Every financial transaction is recorded
- Immutable history (append-only)
- Full traceability from source to ledger

### 2. **Financial Accuracy**
- Double-entry bookkeeping support
- Easy reconciliation
- No data loss from updates/deletes

### 3. **Flexible Reporting**
- Query by date range, category, party, source type
- Generate custom financial reports
- Support multiple accounting periods

### 4. **Compliance Ready**
- Audit-ready financial records
- GAAP/IFRS compatible structure
- Tax reporting support

## Important Notes

### ⚠️ Critical Rules

1. **Never modify `FinancialLedger` entries**
   - No UPDATE operations
   - No DELETE operations
   - Only CREATE operations

2. **Always use positive amounts**
   - Direction field indicates in/out
   - Amount is always >= 0

3. **Create reversals for corrections**
   - Don't delete wrong entries
   - Create opposite entry to cancel
   - Then create correct entry

4. **Maintain referential integrity**
   - sourceId should reference actual entity
   - Use metadata for additional context
   - Store sourceName for human readability

### 🎯 Best Practices

1. **Consistent categorization**
   - Use predefined categories
   - Document category meanings
   - Include subcategory for detail

2. **Descriptive entries**
   - Clear description field
   - Human-readable references
   - Link to source documents

3. **Regular reconciliation**
   - Mark reconciled entries
   - Track reconciliation date/user
   - Periodic balance checks

4. **Fiscal period tracking**
   - Always set fiscalYear/fiscalMonth
   - Enables period-based reporting
   - Supports multi-year analysis

## Next Steps

The schema is ready. Future implementation phases will:

1. **Phase 2.3**: Auto-create ledger entries on order delivery
2. **Phase 2.4**: Add ledger query APIs
3. **Phase 2.5**: Build financial reports from ledger
4. **Phase 2.6**: Reconciliation tools

## Migration Command

```bash
# After reviewing this guide, run:
npx prisma migrate dev --name add_financial_ledger

# Or in production:
npx prisma migrate deploy
```

---

**Status**: ✅ Schema ready - No API changes yet  
**Backward Compatible**: ✅ Yes - All existing fields preserved  
**Breaking Changes**: ❌ None
