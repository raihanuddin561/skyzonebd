/**
 * @jest-environment node
 */
// __tests__/admin/verify-admin-token-retirement.test.ts
// Verifies P2-4 / ADR-009: the 9 routes that previously used the deprecated,
// JWT-only `verifyAdminToken` (no database active-status check) now use the
// canonical `requireAdmin` (re-verifies the account against the database,
// throws a Response on failure). For each route's admin-protected verb(s),
// confirms a requireAdmin rejection is propagated as the HTTP response
// (proving the auth gate still runs before any business logic), without
// needing to mock every route's unrelated business-logic Prisma calls.

const mockPrismaClient = {
  category: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
  unit: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  heroSlide: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  product: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
  order: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
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
  getJwtSecret: () => 'test-secret',
}));

jest.mock('@/lib/activityLogger', () => ({ logActivity: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/utils/wholesaleValidation', () => ({
  validateWholesalePricing: jest.fn().mockReturnValue({ isValid: true }),
  formatValidationErrors: jest.fn(),
}));
jest.mock('@/utils/profitReportGeneration', () => ({
  autoGenerateProfitReport: jest.fn().mockResolvedValue({ success: false }),
}));

import * as categoriesRoute from '@/app/api/categories/route';
import * as categoryByIdRoute from '@/app/api/categories/[id]/route';
import * as adminOrdersCreateRoute from '@/app/api/admin/orders/create/route';
import * as unitsRoute from '@/app/api/units/route';
import * as heroSlideByIdRoute from '@/app/api/hero-slides/[id]/route';
import * as heroSlidesRoute from '@/app/api/hero-slides/route';
import * as productsRoute from '@/app/api/products/route';
import * as productByIdRoute from '@/app/api/products/[id]/route';
import * as orderByIdRoute from '@/app/api/orders/[id]/route';

const REJECT = new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403 });
const idParams = Promise.resolve({ id: 'x1' });

function req(body: any = {}) {
  return {
    headers: { get: () => 'Bearer faketoken' },
    json: async () => body,
    url: 'http://localhost/api/resource',
    nextUrl: new URL('http://localhost/api/resource'),
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAdmin.mockRejectedValue(REJECT);
});

describe('admin-protected verbs reject when requireAdmin rejects (P2-4)', () => {
  const cases: Array<[string, () => Promise<Response>]> = [
    ['categories POST', () => categoriesRoute.POST(req())],
    ['categories DELETE', () => categoriesRoute.DELETE({ ...req(), url: 'http://localhost/api/categories?ids=1' } as any)],
    ['categories/[id] PUT', () => categoryByIdRoute.PUT(req(), { params: idParams })],
    ['categories/[id] DELETE', () => categoryByIdRoute.DELETE(req(), { params: idParams })],
    ['admin/orders/create POST', () => adminOrdersCreateRoute.POST(req({ items: [] }))],
    ['units POST', () => unitsRoute.POST(req())],
    ['units PUT', () => unitsRoute.PUT(req())],
    ['units DELETE', () => unitsRoute.DELETE({ ...req(), url: 'http://localhost/api/units?id=1' } as any)],
    ['hero-slides/[id] PUT', () => heroSlideByIdRoute.PUT(req(), { params: idParams })],
    ['hero-slides/[id] DELETE', () => heroSlideByIdRoute.DELETE(req(), { params: idParams })],
    ['hero-slides POST', () => heroSlidesRoute.POST(req())],
    ['products POST', () => productsRoute.POST(req())],
    ['products DELETE', () => productsRoute.DELETE({ ...req(), url: 'http://localhost/api/products?ids=1' } as any)],
    ['products/[id] PUT', () => productByIdRoute.PUT(req(), { params: idParams })],
    ['products/[id] DELETE', () => productByIdRoute.DELETE(req(), { params: idParams })],
    ['orders/[id] PATCH', () => orderByIdRoute.PATCH(req(), { params: idParams })],
    ['orders/[id] DELETE', () => orderByIdRoute.DELETE(req(), { params: idParams })],
  ];

  it.each(cases)('%s propagates the requireAdmin rejection', async (_name, invoke) => {
    const response = await invoke();
    expect(response.status).toBe(403);
    expect(mockRequireAdmin).toHaveBeenCalled();
  });
});

describe('orders/[id] GET is unaffected (still uses requireAuth, not requireAdmin)', () => {
  it('does not call requireAdmin for guest-order reads', async () => {
    mockPrismaClient.order.findUnique.mockResolvedValueOnce({
      id: 'x1', userId: null, orderItems: [], createdAt: new Date(), updatedAt: new Date(),
    });

    await orderByIdRoute.GET(req(), { params: idParams });

    expect(mockRequireAdmin).not.toHaveBeenCalled();
  });
});
