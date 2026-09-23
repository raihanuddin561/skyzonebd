/**
 * @jest-environment node
 */
// __tests__/reviews/review-helpful-vote.test.ts
//
// ReviewCard's "Was this helpful? Yes/No" buttons were fully built in the UI
// (helpfulCount/notHelpfulCount rendered, click handlers wired) but nothing
// ever passed onHelpful/onNotHelpful from ReviewList, and no backend route
// existed to record a vote — clicking them silently did nothing. This tests
// the new PATCH /api/reviews/[id] endpoint that now backs those buttons.

import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only';

const mockPrismaClient: any = {
  user: { findUnique: jest.fn() },
  review: { update: jest.fn(), findUniqueOrThrow: jest.fn() },
  reviewVote: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  $disconnect: jest.fn().mockResolvedValue(undefined),
  $transaction: jest.fn((cb: any) => cb(mockPrismaClient)),
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrismaClient,
  default: mockPrismaClient,
}));

import { PATCH } from '@/app/api/reviews/[id]/route';

function req(token: string | null, body: any) {
  return {
    headers: { get: (n: string) => (token && n.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    json: async () => body,
  } as any;
}

const userToken = () => sign({ userId: 'user-1' }, JWT_SECRET);
const params = Promise.resolve({ id: 'review-1' });

beforeEach(() => {
  jest.clearAllMocks();
  mockPrismaClient.user.findUnique.mockResolvedValue({
    id: 'user-1', email: 'buyer@example.com', name: 'Buyer', role: 'BUYER', userType: 'WHOLESALE', isActive: true,
  });
  // Default: no prior vote from this user on this review.
  mockPrismaClient.reviewVote.findUnique.mockResolvedValue(null);
});

describe('PATCH /api/reviews/[id]', () => {
  it('increments helpfulCount for a first-time "helpful" vote and records a ReviewVote', async () => {
    mockPrismaClient.review.update.mockResolvedValue({ id: 'review-1', helpfulCount: 6, notHelpfulCount: 1 });

    const res: any = await PATCH(req(userToken(), { vote: 'helpful' }), { params });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockPrismaClient.reviewVote.create).toHaveBeenCalledWith({
      data: { reviewId: 'review-1', userId: 'user-1', vote: true },
    });
    expect(mockPrismaClient.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: { helpfulCount: { increment: 1 } },
      select: { id: true, helpfulCount: true, notHelpfulCount: true },
    });
    expect(body.review.helpfulCount).toBe(6);
  });

  it('increments notHelpfulCount for a first-time "not_helpful" vote', async () => {
    mockPrismaClient.review.update.mockResolvedValue({ id: 'review-1', helpfulCount: 5, notHelpfulCount: 2 });

    await PATCH(req(userToken(), { vote: 'not_helpful' }), { params });

    expect(mockPrismaClient.reviewVote.create).toHaveBeenCalledWith({
      data: { reviewId: 'review-1', userId: 'user-1', vote: false },
    });
    expect(mockPrismaClient.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: { notHelpfulCount: { increment: 1 } },
      select: { id: true, helpfulCount: true, notHelpfulCount: true },
    });
  });

  it('no-ops (does not double-increment) when the same user casts the same vote again', async () => {
    mockPrismaClient.reviewVote.findUnique.mockResolvedValue({ id: 'rv-1', reviewId: 'review-1', userId: 'user-1', vote: true });
    mockPrismaClient.review.findUniqueOrThrow.mockResolvedValue({ id: 'review-1', helpfulCount: 6, notHelpfulCount: 1 });

    const res: any = await PATCH(req(userToken(), { vote: 'helpful' }), { params });

    expect(res.status).toBe(200);
    expect(mockPrismaClient.reviewVote.create).not.toHaveBeenCalled();
    expect(mockPrismaClient.review.update).not.toHaveBeenCalled();
  });

  it('moves the count between buckets when a user switches their vote', async () => {
    mockPrismaClient.reviewVote.findUnique.mockResolvedValue({ id: 'rv-1', reviewId: 'review-1', userId: 'user-1', vote: true });
    mockPrismaClient.review.update.mockResolvedValue({ id: 'review-1', helpfulCount: 5, notHelpfulCount: 2 });

    await PATCH(req(userToken(), { vote: 'not_helpful' }), { params });

    expect(mockPrismaClient.reviewVote.update).toHaveBeenCalledWith({
      where: { id: 'rv-1' },
      data: { vote: false },
    });
    expect(mockPrismaClient.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: { notHelpfulCount: { increment: 1 }, helpfulCount: { decrement: 1 } },
      select: { id: true, helpfulCount: true, notHelpfulCount: true },
    });
  });

  it('rejects an invalid vote value', async () => {
    const res: any = await PATCH(req(userToken(), { vote: 'love_it' }), { params });
    expect(res.status).toBe(400);
    expect(mockPrismaClient.review.update).not.toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    const res: any = await PATCH(req(null, { vote: 'helpful' }), { params });
    expect(res.status).toBe(401);
    expect(mockPrismaClient.review.update).not.toHaveBeenCalled();
  });
});
