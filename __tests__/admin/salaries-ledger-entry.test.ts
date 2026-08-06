/**
 * @jest-environment node
 */
// __tests__/admin/salaries-ledger-entry.test.ts
//
// Amazon-style gap-closure Phase 2 part 1: POST /api/admin/salaries used to
// create a Salary row with zero trace in FinancialLedger —
// createSalaryEntry existed but was dead code. Now a PAID/PARTIAL salary
// posts a DEBIT ledger entry inside the same transaction; a PENDING salary
// (not yet actually paid) does not.

const mockPrismaClient: any = {
  salary: { create: jest.fn() },
  financialLedger: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

jest.mock('@/middleware/permissionMiddleware', () => ({
  checkPermission: jest.fn().mockResolvedValue({ authorized: true, userId: 'admin-1' }),
}));

import { POST } from '@/app/api/admin/salaries/route';

function req(body: any) {
  return { json: async () => body } as any;
}

const baseBody = { employeeId: 'emp-1', month: 8, year: 2026, baseSalary: 30000 };

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.$transaction.mockImplementation((cb: any) => cb(mockPrismaClient));
});

it('posts a DEBIT ledger entry when a salary is created as PAID', async () => {
  mockPrismaClient.salary.create.mockResolvedValue({
    id: 'sal-1', employeeId: 'emp-1', netSalary: 28500, month: 8, year: 2026,
    employee: { employeeId: 'E1', firstName: 'Jane', lastName: 'Doe' },
  });

  const res = await POST(req({ ...baseBody, paymentStatus: 'PAID' }));

  expect(res!.status).toBe(201);
  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
  const entry = mockPrismaClient.financialLedger.create.mock.calls[0][0].data;
  expect(entry.sourceType).toBe('SALARY');
  expect(entry.direction).toBe('DEBIT');
  expect(entry.amount).toBe(28500);
  expect(entry.partyName).toBe('Jane Doe');
});

it('posts a DEBIT ledger entry when a salary is created as PARTIAL', async () => {
  mockPrismaClient.salary.create.mockResolvedValue({
    id: 'sal-2', employeeId: 'emp-2', netSalary: 15000, month: 8, year: 2026, employee: null,
  });

  await POST(req({ ...baseBody, employeeId: 'emp-2', paymentStatus: 'PARTIAL' }));

  expect(mockPrismaClient.financialLedger.create).toHaveBeenCalledTimes(1);
});

it('does not post a ledger entry for a PENDING salary', async () => {
  mockPrismaClient.salary.create.mockResolvedValue({
    id: 'sal-3', employeeId: 'emp-3', netSalary: 30000, month: 8, year: 2026, employee: null,
  });

  const res = await POST(req({ ...baseBody, employeeId: 'emp-3', paymentStatus: 'PENDING' }));

  expect(res!.status).toBe(201);
  expect(mockPrismaClient.financialLedger.create).not.toHaveBeenCalled();
});
