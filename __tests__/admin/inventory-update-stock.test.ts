/**
 * @jest-environment node
 */
// __tests__/admin/inventory-update-stock.test.ts
//
// Amazon-style gap-closure Phase 0: PATCH /api/admin/inventory/[id] never
// wrote an InventoryLog entry, and the only UI caller
// (src/app/admin/inventory/page.tsx) sent `{ stock: newStock }` while this
// route read `body.stockQuantity` — so the "Update Stock" button was
// silently broken end-to-end (always 400). Fixed: the frontend now sends
// the matching field name, and the route records the movement.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  product: { findUnique: jest.fn(), update: jest.fn() },
  inventoryLog: { create: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { PATCH } from '@/app/api/admin/inventory/[id]/route';

function req(body: any) {
  const token = jwt.sign({ userId: 'admin-1', role: 'ADMIN' }, JWT_SECRET);
  return {
    headers: { get: (n: string) => (n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

const params = Promise.resolve({ id: 'p1' });

beforeEach(() => {
  jest.clearAllMocks();
  (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({
    id: 'admin-1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
  mockPrismaClient.$transaction.mockImplementation(async (cb: any) => cb(mockPrismaClient));
});

it('records the stock change in InventoryLog with the correct previous/new quantities', async () => {
  (mockPrismaClient.product.findUnique as jest.Mock).mockResolvedValueOnce({ stockQuantity: 20, name: 'Widget' });
  (mockPrismaClient.product.update as jest.Mock).mockResolvedValueOnce({ id: 'p1', name: 'Widget', stockQuantity: 35, availability: 'in_stock' });

  const res = await PATCH(req({ stockQuantity: 35 }), { params });
  expect(res.status).toBe(200);

  expect(mockPrismaClient.inventoryLog.create).toHaveBeenCalledWith({
    data: expect.objectContaining({
      productId: 'p1',
      action: 'ADJUSTMENT',
      quantity: 15,
      previousStock: 20,
      newStock: 35,
      performedBy: 'admin-1',
    }),
  });
});

it('returns 404 without writing a log entry if the product does not exist', async () => {
  (mockPrismaClient.product.findUnique as jest.Mock).mockResolvedValueOnce(null);

  const res = await PATCH(req({ stockQuantity: 10 }), { params });

  expect(res.status).toBe(404);
  expect(mockPrismaClient.inventoryLog.create).not.toHaveBeenCalled();
  expect(mockPrismaClient.product.update).not.toHaveBeenCalled();
});
