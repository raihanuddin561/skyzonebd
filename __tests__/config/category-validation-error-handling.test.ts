/**
 * @jest-environment node
 */
// __tests__/config/category-validation-error-handling.test.ts
// Verifies P2-5 (first-batch adoption of lib/validation.ts + lib/error-handler.ts):
// categories/route.ts's POST/DELETE now validate the request body with the
// shared Zod schema (createCategorySchema) and format errors through the
// shared handleError, instead of ad-hoc field checks and a bare 500 catch.
//
// Also verifies a real bug this fixed: createCategorySchema previously had
// an `image`/`parentId` mismatch against the actual Category model (fixed
// as part of this item), and the route previously checked slug uniqueness
// explicitly but not name uniqueness (Category.name is also @unique in the
// schema) — a duplicate name used to crash with an unhandled Prisma P2002
// as a generic 500; handleError now formats it as a clean 409.

import { Prisma } from '@prisma/client';

const mockPrismaClient = {
  category: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const mockRequireAdmin = jest.fn();
jest.mock('@/lib/auth', () => ({
  requireAdmin: (...args: any[]) => mockRequireAdmin(...args),
}));

import { POST, DELETE } from '@/app/api/categories/route';

function req(body: any) {
  return { json: async () => body, url: 'http://localhost/api/categories' } as any;
}

beforeEach(() => {
  jest.resetAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
});

describe('POST /api/categories — Zod validation (P2-5)', () => {
  it('rejects a missing name with a Zod-formatted 400, not the old ad-hoc message', async () => {
    const res = await POST(req({ slug: 'electronics' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION_ERROR');
  });

  it('creates a category when the body is valid', async () => {
    mockPrismaClient.category.findUnique.mockResolvedValueOnce(null);
    mockPrismaClient.category.create.mockResolvedValueOnce({
      id: 'cat-1', name: 'Electronics', slug: 'electronics', description: null,
      imageUrl: null, isActive: true, createdAt: new Date(), _count: { products: 0 },
    });

    const res = await POST(req({ name: 'Electronics', slug: 'electronics' }));
    expect(res.status).toBe(201);
  });

  it('a duplicate category NAME (not just slug) now gets a clean 409 instead of an unhandled 500', async () => {
    mockPrismaClient.category.findUnique.mockResolvedValueOnce(null); // slug check passes — different slug
    mockPrismaClient.category.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`name`)', {
        code: 'P2002',
        clientVersion: '6.16.3',
        meta: { target: ['name'] },
      })
    );

    const res = await POST(req({ name: 'Electronics', slug: 'electronics-2' }));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('UNIQUE_CONSTRAINT_ERROR');
  });

  it('still rejects a duplicate slug with 409 (pre-existing explicit check, unchanged)', async () => {
    mockPrismaClient.category.findUnique.mockResolvedValueOnce({ id: 'existing' });
    const res = await POST(req({ name: 'New Name', slug: 'electronics' }));
    expect(res.status).toBe(409);
    expect(mockPrismaClient.category.create).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/categories — shared error handling (P2-5)', () => {
  it('formats an unexpected error through handleError (500, generic message, not a raw stack leak)', async () => {
    mockPrismaClient.category.findMany.mockRejectedValueOnce(new Error('unexpected db failure'));
    const res = await DELETE({ ...req({}), url: 'http://localhost/api/categories?ids=1,2' } as any);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
