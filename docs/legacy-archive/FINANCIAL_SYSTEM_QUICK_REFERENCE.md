# Financial System Quick Reference

## 🚀 Using Admin Client Auth

### Import
```typescript
import { adminGet, adminPost, handleAuthError } from '@/lib/adminClientAuth';
```

### Basic Usage
```typescript
const fetchDashboard = async () => {
  setLoading(true);
  
  const response = await adminGet('/api/admin/profit-reports/dashboard');
  
  // Handle auth errors (auto-redirects to login)
  if (handleAuthError(response)) {
    return;
  }
  
  // Handle API errors
  if (!response.success) {
    setError(response.error || 'Failed to fetch data');
    setLoading(false);
    return;
  }
  
  // Show data quality notices
  if (response.notices && response.notices.length > 0) {
    setNotices(response.notices);
  }
  
  // Success - use data
  setData(response.data);
  setLoading(false);
};
```

### POST Request
```typescript
const generateReport = async (orderId: string) => {
  const response = await adminPost('/api/admin/profit-reports', {
    orderId
  });
  
  if (handleAuthError(response)) return;
  
  if (response.success) {
    toast.success('Report generated successfully');
    if (response.notices?.length > 0) {
      // Show notices
    }
  } else {
    toast.error(response.error || 'Failed to generate report');
  }
};
```

## 📊 Querying Financial Ledger

### Get Ledger Entries (Paginated)
```typescript
const response = await adminGet(
  '/api/admin/financial/ledger?page=1&limit=50&sourceType=ORDER'
);

// Response structure:
{
  success: true,
  notices: [],
  data: {
    view: 'list',
    entries: [...],
    pagination: {
      page: 1,
      limit: 50,
      total: 150,
      totalPages: 3,
      hasMore: true
    },
    summary: {
      pageCredits: 50000,
      pageDebits: 30000,
      pageBalance: 20000
    }
  }
}
```

### Calculate Period Balance
```typescript
const response = await adminGet(
  '/api/admin/financial/ledger?view=balance&startDate=2026-01-01&endDate=2026-01-31'
);

// Response:
{
  data: {
    view: 'balance',
    period: { start: '...', end: '...' },
    balance: {
      totalCredits: 150000,
      totalDebits: 80000,
      netBalance: 70000,
      entries: 250
    }
  }
}
```

### Get Unreconciled Entries
```typescript
const response = await adminGet(
  '/api/admin/financial/ledger?view=unreconciled&limit=100'
);

// Response:
{
  data: {
    view: 'unreconciled',
    entries: [...],
    count: 45
  }
}
```

## 🔄 Reconciliation

### Reconcile Specific Entries
```typescript
const response = await adminPost('/api/admin/financial/ledger/reconcile', {
  action: 'reconcile',
  entryIds: ['entry_id_1', 'entry_id_2', 'entry_id_3']
});

// Response:
{
  success: true,
  notices: ['Successfully reconciled 3 ledger entries'],
  data: {
    reconciledCount: 3
  }
}
```

### Compare Ledger vs Orders
```typescript
const response = await adminPost('/api/admin/financial/ledger/reconcile', {
  action: 'compare',
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});

// Response:
{
  success: true,
  notices: ['Ledger entries match order totals perfectly'], // or discrepancy notices
  data: {
    period: { start: '...', end: '...' },
    ledger: {
      revenue: 150000,
      cogs: 80000,
      entryCount: 250
    },
    orders: {
      revenue: 150000,
      cogs: 80000,
      orderCount: 125
    },
    reconciliation: {
      revenueMatches: true,
      cogsMatches: true,
      revenueDifference: 0,
      cogsDifference: 0,
      overallMatch: true
    }
  }
}
```

## 🎨 Displaying Notices in UI

### Example Component
```tsx
interface NoticesBannerProps {
  notices: string[];
}

function NoticesBanner({ notices }: NoticesBannerProps) {
  if (!notices || notices.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Data Quality Notices
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc list-inside space-y-1">
              {notices.map((notice, index) => (
                <li key={index}>{notice}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Usage:
export default function DashboardPage() {
  const [notices, setNotices] = useState<string[]>([]);
  
  // In your fetch function:
  const response = await adminGet('/api/admin/profit-reports/dashboard');
  if (response.success && response.notices) {
    setNotices(response.notices);
  }
  
  return (
    <div>
      <NoticesBanner notices={notices} />
      {/* Rest of your page */}
    </div>
  );
}
```

## 🔍 Filter Parameters

### All Financial Endpoints Support:
- `period` - today, week, month, quarter, year, custom
- `startDate` / `endDate` - Custom date range (YYYY-MM-DD)
- `format` - summary, detailed (some endpoints)

### Ledger-Specific Filters:
- `sourceType` - ORDER, EXPENSE, SALARY, COMMISSION, etc.
- `direction` - CREDIT, DEBIT
- `orderId` - Filter by specific order
- `fiscalYear` / `fiscalMonth` - Fiscal period
- `reconciled` - true/false
- `view` - list, balance, unreconciled

### Example: Get All January 2026 Order Revenue
```typescript
const response = await adminGet(
  '/api/admin/financial/ledger?' +
  'sourceType=ORDER&' +
  'direction=CREDIT&' +
  'fiscalYear=2026&' +
  'fiscalMonth=1&' +
  'limit=100'
);
```

## 📝 Creating Manual Ledger Entries

If you need to manually create ledger entries (e.g., for one-time adjustments):

```typescript
import { createLedgerEntry } from '@/lib/financialLedger';

// Create a manual adjustment
await createLedgerEntry({
  sourceType: 'ADJUSTMENT',
  sourceId: 'manual_adjustment_001',
  sourceName: 'Inventory correction',
  amount: 5000,
  direction: 'DEBIT',
  category: 'ADJUSTMENT',
  description: 'Correcting inventory valuation error',
  notes: 'Approved by CEO',
  createdBy: adminUserId,
});

// Record utility bill
await createLedgerEntry({
  sourceType: 'UTILITY',
  sourceId: utilityBillId,
  amount: 12000,
  direction: 'DEBIT',
  category: 'OPERATING_EXPENSE',
  subcategory: 'ELECTRICITY',
  description: 'January 2026 electricity bill',
  metadata: {
    billNumber: 'ELEC-2026-01-001',
    dueDate: '2026-01-15'
  }
});
```

## 🎯 Common Patterns

### Pattern 1: Fetch with Error Handling
```typescript
async function fetchWithErrorHandling(endpoint: string) {
  try {
    const response = await adminGet(endpoint);
    
    if (handleAuthError(response)) {
      return null; // Will redirect
    }
    
    if (!response.success) {
      console.error('API Error:', response.error);
      toast.error(response.error || 'Request failed');
      return null;
    }
    
    // Success
    return response.data;
  } catch (error) {
    console.error('Request failed:', error);
    toast.error('Network error');
    return null;
  }
}
```

### Pattern 2: Loading State with Notices
```typescript
const [loading, setLoading] = useState(true);
const [data, setData] = useState(null);
const [notices, setNotices] = useState<string[]>([]);
const [error, setError] = useState('');

async function loadData() {
  setLoading(true);
  setError('');
  setNotices([]);
  
  const response = await adminGet('/api/admin/financial/revenue-analytics');
  
  if (handleAuthError(response)) {
    return;
  }
  
  if (response.success) {
    setData(response.data);
    setNotices(response.notices || []);
  } else {
    setError(response.error || 'Failed to load data');
  }
  
  setLoading(false);
}
```

### Pattern 3: Pagination
```typescript
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

async function loadPage(pageNum: number) {
  const response = await adminGet(
    `/api/admin/financial/ledger?page=${pageNum}&limit=50`
  );
  
  if (response.success) {
    setData(response.data.entries);
    setHasMore(response.data.pagination.hasMore);
  }
}

// Next page
const handleNextPage = () => {
  if (hasMore) {
    const nextPage = page + 1;
    setPage(nextPage);
    loadPage(nextPage);
  }
};
```

## 🛠️ Debugging Tips

### Check if Token is Set
```typescript
import { getAuthToken } from '@/lib/adminClientAuth';

const token = getAuthToken();
if (!token) {
  console.log('No auth token found - user needs to login');
}
```

### Inspect API Response
```typescript
const response = await adminGet('/api/admin/financial/ledger');
console.log('Success:', response.success);
console.log('Status:', response.statusCode);
console.log('Notices:', response.notices);
console.log('Error:', response.error);
console.log('Data:', response.data);
```

### Test Endpoint in Browser Console
```javascript
// Copy this into browser console on admin page
const response = await fetch('/api/admin/profit-reports/dashboard', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
});
const data = await response.json();
console.log(data);
```

## 📚 Additional Resources

- **Full Implementation Guide**: `FINANCIAL_SYSTEM_IMPLEMENTATION.md`
- **Ledger Specification**: `FINANCIAL_LEDGER_GUIDE.md`
- **Schema Reference**: `prisma/schema.prisma` - FinancialLedger model

---

**Quick Links:**
- Auth Helper: `src/lib/adminClientAuth.ts`
- Ledger Utilities: `src/lib/financialLedger.ts`
- Ledger API: `src/app/api/admin/financial/ledger/route.ts`
- Reconciliation API: `src/app/api/admin/financial/ledger/reconcile/route.ts`
