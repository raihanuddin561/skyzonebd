/**
 * @jest-environment node
 */
// __tests__/user/business-info-addresses.test.ts
//
// /api/user/business-info and /api/user/addresses power the profile page's
// new "Business Verification" and "Saved Addresses" sections — previously
// these backends existed but had zero frontend caller anywhere in the app.
// Also covers the auth-error-masking bug fixed in the same pass: both route
// families used to catch requireAuth()'s thrown 401 Response and swallow it
// into a generic 500.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  businessInfo: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
  address: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  $disconnect: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { GET as getBusinessInfo, POST as postBusinessInfo } from '@/app/api/user/business-info/route';
import { GET as getAddresses, POST as postAddress } from '@/app/api/user/addresses/route';
import { PUT as putAddress, DELETE as deleteAddress } from '@/app/api/user/addresses/[id]/route';

function req(token: string | null, body?: any) {
  return {
    headers: { get: (n: string) => (token && n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

const userToken = () => sign({ userId: 'user-1' }, JWT_SECRET);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'user-1', email: 'buyer@example.com', name: 'Buyer', role: 'BUYER', userType: 'WHOLESALE', isActive: true,
  });
});

describe('GET /api/user/business-info', () => {
  it('returns a real 401, not a masked 500, when unauthenticated', async () => {
    const res: any = await getBusinessInfo(req(null));
    expect(res.status).toBe(401);
  });

  it('returns null businessInfo when none has been submitted yet', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue(null);
    const res: any = await getBusinessInfo(req(userToken()));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.businessInfo).toBeNull();
  });
});

describe('POST /api/user/business-info', () => {
  it('creates business info for a first-time submission', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue(null);
    mockPrismaClient.businessInfo.create.mockResolvedValue({ id: 'bi-1', userId: 'user-1', companyType: 'retailer' });

    const res: any = await postBusinessInfo(req(userToken(), { companyType: 'retailer', registrationNumber: 'REG-1' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockPrismaClient.businessInfo.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'user-1', companyType: 'retailer' }) })
    );
  });

  it('updates existing business info on resubmission instead of duplicating', async () => {
    mockPrismaClient.businessInfo.findUnique.mockResolvedValue({ id: 'bi-1', userId: 'user-1' });
    mockPrismaClient.businessInfo.update.mockResolvedValue({ id: 'bi-1', userId: 'user-1', companyType: 'distributor' });

    const res: any = await postBusinessInfo(req(userToken(), { companyType: 'distributor' }));

    expect(res.status).toBe(200);
    expect(mockPrismaClient.businessInfo.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.businessInfo.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });

  it('rejects an unauthenticated submission with a real 401', async () => {
    const res: any = await postBusinessInfo(req(null, { companyType: 'retailer' }));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/user/addresses', () => {
  it('returns a real 401, not a masked 500, when unauthenticated', async () => {
    const res: any = await getAddresses(req(null));
    expect(res.status).toBe(401);
  });

  it('lists only the current user\'s addresses', async () => {
    mockPrismaClient.address.findMany.mockResolvedValue([{ id: 'addr-1', userId: 'user-1', street: 'Road 1' }]);
    const res: any = await getAddresses(req(userToken()));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.addresses).toHaveLength(1);
    expect(mockPrismaClient.address.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } })
    );
  });
});

describe('POST /api/user/addresses', () => {
  it('rejects a submission missing required fields', async () => {
    const res: any = await postAddress(req(userToken(), { city: 'Dhaka' }));
    expect(res.status).toBe(400);
  });

  it('automatically makes the first address the default', async () => {
    mockPrismaClient.address.count.mockResolvedValue(0);
    mockPrismaClient.address.create.mockResolvedValue({ id: 'addr-1', isDefault: true });

    await postAddress(req(userToken(), { street: 'Road 1', city: 'Dhaka', country: 'Bangladesh' }));

    expect(mockPrismaClient.address.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: true }) })
    );
  });

  it('unsets other defaults when a new address is explicitly marked default', async () => {
    mockPrismaClient.address.count.mockResolvedValue(2);
    mockPrismaClient.address.create.mockResolvedValue({ id: 'addr-3', isDefault: true });

    await postAddress(req(userToken(), { street: 'Road 2', city: 'Dhaka', country: 'Bangladesh', isDefault: true }));

    expect(mockPrismaClient.address.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', isDefault: true } })
    );
  });
});

describe('PUT /api/user/addresses/[id] — used for both edits and "set as default"', () => {
  it('lets a bare { isDefault: true } call set default without requiring the full address payload', async () => {
    mockPrismaClient.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-1', isDefault: false });
    mockPrismaClient.address.update.mockResolvedValue({ id: 'addr-1', isDefault: true });

    const res: any = await putAddress(req(userToken(), { isDefault: true }), { params: Promise.resolve({ id: 'addr-1' }) });

    expect(res.status).toBe(200);
    expect(mockPrismaClient.address.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', isDefault: true, NOT: { id: 'addr-1' } } })
    );
  });

  it('404s when the address does not belong to the requesting user', async () => {
    mockPrismaClient.address.findFirst.mockResolvedValue(null);
    const res: any = await putAddress(req(userToken(), { isDefault: true }), { params: Promise.resolve({ id: 'not-mine' }) });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/user/addresses/[id]', () => {
  it('promotes another address to default when the deleted one was the default', async () => {
    mockPrismaClient.address.findFirst.mockResolvedValue({ id: 'addr-1', userId: 'user-1', isDefault: true });
    mockPrismaClient.address.delete.mockResolvedValue({ id: 'addr-1' });
    mockPrismaClient.address.findFirst.mockResolvedValueOnce({ id: 'addr-1', userId: 'user-1', isDefault: true });
    mockPrismaClient.address.findFirst.mockResolvedValueOnce({ id: 'addr-2', userId: 'user-1', isDefault: false });

    const res: any = await deleteAddress(req(userToken()), { params: Promise.resolve({ id: 'addr-1' }) });

    expect(res.status).toBe(200);
    expect(mockPrismaClient.address.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'addr-2' }, data: { isDefault: true } })
    );
  });
});
