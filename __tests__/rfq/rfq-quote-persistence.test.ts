/**
 * @jest-environment node
 */
// __tests__/rfq/rfq-quote-persistence.test.ts
// Verifies the Amazon-Style Wholesale Platform Gap Closure — Phase 4 part 3
// fix: POST /api/rfq/[id]/respond previously accepted `response`/`quotedPrice`
// in the request body and only ever persisted `status` — the quote itself
// was silently discarded. It now persists quotedPrice/responseMessage/
// respondedBy/respondedAt and sends a best-effort notification email.

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient = {
  user: { findUnique: jest.fn() },
  rFQ: { update: jest.fn() },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

const sendRFQQuote = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendRFQQuote: (...args: any[]) => sendRFQQuote(...args) },
}));

import { prisma } from '@/lib/prisma';
import { POST } from '@/app/api/rfq/[id]/respond/route';

class MockHeaders {
  private headers: Map<string, string>;
  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}));
  }
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }
}

class MockNextRequest {
  public headers: MockHeaders;
  private body: any;

  constructor(options?: { headers?: Record<string, string>; body?: any }) {
    const normalized: Record<string, string> = {};
    Object.entries(options?.headers || {}).forEach(([k, v]) => { normalized[k.toLowerCase()] = v; });
    this.headers = new MockHeaders(normalized);
    this.body = options?.body;
  }

  async json() {
    return this.body;
  }
}

function tokenFor(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET);
}

function mockAdmin(id: string) {
  (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({
    id, email: `${id}@example.com`, name: 'Admin', role: 'ADMIN', userType: 'WHOLESALE', isActive: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/rfq/[id]/respond — quote persistence', () => {
  const params = Promise.resolve({ id: 'rfq-1' });

  it('persists quotedPrice, responseMessage, respondedBy, and respondedAt', async () => {
    mockAdmin('admin-1');
    (prisma.rFQ.update as jest.Mock).mockResolvedValueOnce({
      id: 'rfq-1', rfqNumber: 'RFQ-000001', quotedPrice: 95.5,
      user: { name: 'Customer', email: 'customer@example.com' },
    });

    const request = new MockNextRequest({
      headers: { Authorization: `Bearer ${tokenFor('admin-1')}` },
      body: { response: 'Here is your quote', quotedPrice: 95.5 },
    }) as any;
    const res = await POST(request, { params });

    expect(res.status).toBe(200);
    expect(prisma.rFQ.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quotedPrice: 95.5,
          responseMessage: 'Here is your quote',
          respondedBy: 'admin-1',
          respondedAt: expect.any(Date),
        }),
      })
    );
  });

  it('sends a best-effort quote email to the customer after persisting', async () => {
    mockAdmin('admin-1');
    (prisma.rFQ.update as jest.Mock).mockResolvedValueOnce({
      id: 'rfq-1', rfqNumber: 'RFQ-000001', quotedPrice: 95.5,
      user: { name: 'Customer', email: 'customer@example.com' },
    });

    const request = new MockNextRequest({
      headers: { Authorization: `Bearer ${tokenFor('admin-1')}` },
      body: { response: 'Here is your quote', quotedPrice: 95.5 },
    }) as any;
    await POST(request, { params });

    expect(sendRFQQuote).toHaveBeenCalledWith('customer@example.com', 'RFQ-000001', 95.5, 'Here is your quote');
  });

  it('still returns success (200) even if the notification email fails', async () => {
    mockAdmin('admin-1');
    sendRFQQuote.mockResolvedValueOnce({ success: false, error: 'provider down' });
    (prisma.rFQ.update as jest.Mock).mockResolvedValueOnce({
      id: 'rfq-1', rfqNumber: 'RFQ-000001', quotedPrice: null,
      user: { name: 'Customer', email: 'customer@example.com' },
    });

    const request = new MockNextRequest({
      headers: { Authorization: `Bearer ${tokenFor('admin-1')}` },
      body: { response: 'No price yet, still reviewing' },
    }) as any;
    const res = await POST(request, { params });

    expect(res.status).toBe(200);
  });

  it('persists a null quotedPrice when no price is given (response-only quote)', async () => {
    mockAdmin('admin-1');
    (prisma.rFQ.update as jest.Mock).mockResolvedValueOnce({
      id: 'rfq-1', rfqNumber: 'RFQ-000001', quotedPrice: null,
      user: { name: 'Customer', email: 'customer@example.com' },
    });

    const request = new MockNextRequest({
      headers: { Authorization: `Bearer ${tokenFor('admin-1')}` },
      body: { response: 'Still reviewing your request' },
    }) as any;
    const res = await POST(request, { params });

    expect(res.status).toBe(200);
    expect(prisma.rFQ.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ quotedPrice: null }) })
    );
  });
});
