/**
 * @jest-environment node
 */
// __tests__/deletion/deletion-transitions.test.ts
// Rewritten for P2-7. The previous version asserted literal values it had
// just declared in the same test (e.g. `const newStatus = action ===
// 'approve' ? 'PROCESSING' : 'REJECTED'; expect(newStatus).toBe('PROCESSING')`)
// — it never called the real admin data-deletion-request routes, so it
// provided zero regression protection. It now calls the real PATCH
// (approve/reject) and execute (anonymization) handlers.
//
// One deliberate finding from this rewrite: the old file had a test titled
// "should require rejectionReason when rejecting" asserting a >=10-character
// minimum. The real route (admin/data-deletion-requests/[id]/route.ts)
// enforces no such rule at all — `notes` is optional and free-form. That
// old test was asserting a rule that was never actually implemented; this
// rewrite does not carry it forward as if it were real. Duplicate-pending-
// request prevention is enforced by the *creation* route, not this one —
// already covered for real in __tests__/data-deletion/data-deletion-
// requests-consolidation.test.ts (P1-6).

const mockPrismaClient = {
  dataDeletionRequest: { findUnique: jest.fn(), update: jest.fn() },
  dataDeletionAuditLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockRequireAdmin = jest.fn();
const mockRequireAuth = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
  requireAuth: (...args: any[]) => mockRequireAuth(...args),
}));

import { PATCH } from '@/app/api/admin/data-deletion-requests/[id]/route';
import { POST as executeDeletion } from '@/app/api/admin/data-deletion-requests/[id]/execute/route';

function req(body: any) {
  return { json: async () => body } as any;
}

const params = Promise.resolve({ id: 'req-1' });

beforeEach(() => {
  // resetAllMocks (not clearAllMocks): clearAllMocks leaves queued
  // mockResolvedValueOnce/mockImplementationOnce implementations in place,
  // so an unconsumed one from a prior test (e.g. a test whose route call
  // short-circuits before ever calling this mock) leaks into the next
  // test's call to the same mock. resetAllMocks wipes implementations too.
  jest.resetAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1', name: 'Admin', email: 'admin@example.com' });
  // execute requires SUPER_ADMIN specifically (permanent PII anonymization
  // is at least as destructive as other SUPER_ADMIN-gated actions in this
  // codebase) — default to a super admin here; the dedicated 403 test below
  // overrides this to a plain ADMIN.
  mockRequireAuth.mockResolvedValue({ id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'SUPER_ADMIN' });
});

describe('PATCH /api/admin/data-deletion-requests/[id] (approve/reject)', () => {
  it('rejects an unknown action (400)', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({ status: 'PENDING' });
    const res = await PATCH(req({ action: 'delete' }), { params });
    expect(res.status).toBe(400);
  });

  it('404s when the request does not exist', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce(null);
    const res = await PATCH(req({ action: 'approve' }), { params });
    expect(res.status).toBe(404);
  });

  it('only allows approve/reject from PENDING — rejects a request already PROCESSING', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({ status: 'PROCESSING' });
    const res = await PATCH(req({ action: 'approve' }), { params });
    expect(res.status).toBe(400);
    expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('approve transitions PENDING -> PROCESSING and logs the audit entry inside one transaction', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({ status: 'PENDING' });
    const updated = jest.fn().mockResolvedValue({ id: 'req-1', status: 'PROCESSING' });
    const auditCreate = jest.fn().mockResolvedValue({});
    mockPrismaClient.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({ dataDeletionRequest: { update: updated }, dataDeletionAuditLog: { create: auditCreate } })
    );

    const res = await PATCH(req({ action: 'approve' }), { params });

    expect(res.status).toBe(200);
    expect(updated).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PROCESSING' }) })
    );
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'APPROVE', newStatus: 'PROCESSING' }) })
    );
  });

  it('reject transitions PENDING -> REJECTED and records the rejection reason', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({ status: 'PENDING' });
    const updated = jest.fn().mockResolvedValue({ id: 'req-1', status: 'REJECTED' });
    const auditCreate = jest.fn().mockResolvedValue({});
    mockPrismaClient.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({ dataDeletionRequest: { update: updated }, dataDeletionAuditLog: { create: auditCreate } })
    );

    const res = await PATCH(req({ action: 'reject', notes: 'User has unresolved orders' }), { params });

    expect(res.status).toBe(200);
    expect(updated).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'REJECTED',
          rejectionReason: 'User has unresolved orders',
        }),
      })
    );
  });
});

describe('POST /api/admin/data-deletion-requests/[id]/execute', () => {
  it('only allows execution from PROCESSING — rejects a request still PENDING', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({
      status: 'PENDING', userId: 'user-1',
    });
    const res = await executeDeletion(req({}), { params });
    expect(res.status).toBe(400);
    expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('anonymizes the user, disassociates their products, and marks the request COMPLETED', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({
      status: 'PROCESSING',
      userId: 'user-1',
      user: { id: 'user-1', email: 'real@example.com', name: 'Real User', orders: [], products: [] },
    });

    const userUpdate = jest.fn().mockResolvedValue({});
    const businessInfoDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const addressDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const rfqUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const userPermissionDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const productUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const partnerUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const orderUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
    const requestUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const requestFindUniqueOrThrow = jest.fn().mockResolvedValue({ id: 'req-1', status: 'COMPLETED' });
    const auditCreate = jest.fn().mockResolvedValue({});

    mockPrismaClient.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({
        user: { update: userUpdate },
        businessInfo: { deleteMany: businessInfoDeleteMany },
        address: { deleteMany: addressDeleteMany },
        rFQ: { updateMany: rfqUpdateMany },
        userPermission: { deleteMany: userPermissionDeleteMany },
        product: { updateMany: productUpdateMany },
        partner: { updateMany: partnerUpdateMany },
        order: { updateMany: orderUpdateMany },
        dataDeletionRequest: { updateMany: requestUpdateMany, findUniqueOrThrow: requestFindUniqueOrThrow },
        dataDeletionAuditLog: { create: auditCreate },
      })
    );

    const res = await executeDeletion(req({}), { params });

    expect(res.status).toBe(200);

    // PII embedded in historical order addresses is redacted — orders
    // themselves (totals, line items, payments) are never touched here.
    expect(orderUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: expect.objectContaining({
        shippingAddress: expect.any(String),
        billingAddress: expect.any(String),
      }),
    });

    // Anonymization: email/name change, PII cleared, account deactivated —
    // never just left as the real user's data.
    const userUpdateData = userUpdate.mock.calls[0][0].data;
    expect(userUpdateData.email).not.toBe('real@example.com');
    expect(userUpdateData.email).toContain('deleted_user-1');
    expect(userUpdateData.name).not.toBe('Real User');
    expect(userUpdateData.phone).toBeNull();
    expect(userUpdateData.isActive).toBe(false);

    // Hard-deleted data.
    expect(businessInfoDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(addressDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(userPermissionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1' } });

    // Retained-but-anonymized / disassociated, not deleted.
    expect(rfqUpdateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user-1' } }));
    expect(productUpdateMany).toHaveBeenCalledWith({
      where: { sellerId: 'user-1' },
      data: { sellerId: null },
    });
    // Any Partner record linked to this user (ADR-008) is unlinked, not deleted.
    expect(partnerUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      data: { userId: null },
    });

    expect(requestUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'req-1', status: 'PROCESSING' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      })
    );
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'EXECUTED', newStatus: 'COMPLETED' }) })
    );
  });

  it('rejects a plain ADMIN (403) — only SUPER_ADMIN may execute a deletion', async () => {
    mockRequireAuth.mockResolvedValueOnce({ id: 'admin-1', name: 'Admin', email: 'admin@example.com', role: 'ADMIN' });

    const res = await executeDeletion(req({}), { params });

    expect(res.status).toBe(403);
    expect(mockPrismaClient.dataDeletionRequest.findUnique).not.toHaveBeenCalled();
    expect(mockPrismaClient.$transaction).not.toHaveBeenCalled();
  });

  it('returns 500 instead of double-executing when a concurrent request already completed it', async () => {
    mockPrismaClient.dataDeletionRequest.findUnique.mockResolvedValueOnce({
      status: 'PROCESSING',
      userId: 'user-1',
      user: { id: 'user-1', email: 'real@example.com', name: 'Real User', orders: [], products: [] },
    });
    const requestUpdateMany = jest.fn().mockResolvedValue({ count: 0 }); // lost the race
    mockPrismaClient.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({ dataDeletionRequest: { updateMany: requestUpdateMany } })
    );

    const res = await executeDeletion(req({}), { params });

    expect(res.status).toBe(500);
    expect(requestUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'req-1', status: 'PROCESSING' } })
    );
  });
});
