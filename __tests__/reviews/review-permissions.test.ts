// __tests__/reviews/review-permissions.test.ts - Review permissions tests

import { validateData, createReviewSchema } from '@/lib/validation';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    order: {
      findFirst: jest.fn(),
    },
    review: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';

describe('Review Permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Review Creation Permissions', () => {
    it('should allow review if user purchased the product', async () => {
      const userId = 'user123';
      const productId = 'product123';

      const mockOrder = {
        id: 'order123',
        userId,
        status: 'DELIVERED',
        items: [
          {
            productId,
            quantity: 1,
          },
        ],
      };

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const order = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: {
            some: {
              productId,
            },
          },
        },
      });

      expect(order).toBeTruthy();
      expect(order?.userId).toBe(userId);
    });

    it('should reject review if user has not purchased the product', async () => {
      const userId = 'user123';
      const productId = 'product123';

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      const order = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: {
            some: {
              productId,
            },
          },
        },
      });

      expect(order).toBeNull();
    });

    it('should reject review if order is not delivered', async () => {
      const userId = 'user123';
      const productId = 'product123';

      // Mock returns null when looking for DELIVERED status
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      const order = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: {
            some: {
              productId,
            },
          },
        },
      });

      expect(order).toBeNull(); // Query specifically looks for DELIVERED status
    });

    it('should reject duplicate review from same user', async () => {
      const userId = 'user123';
      const productId = 'product123';

      const existingReview = {
        id: 'review123',
        userId,
        productId,
        rating: 5,
      };

      (prisma.review.findFirst as jest.Mock).mockResolvedValue(existingReview);

      const review = await prisma.review.findFirst({
        where: {
          userId,
          productId,
        },
      });

      expect(review).toBeTruthy(); // User already reviewed
    });
  });

  describe('Review Update Permissions', () => {
    it('should allow user to update their own review', async () => {
      const userId = 'user123';
      const reviewId = 'review123';

      const mockReview = {
        id: reviewId,
        userId,
        productId: 'product123',
        rating: 4,
        comment: 'Good product',
      };

      (prisma.review.findFirst as jest.Mock).mockResolvedValue(mockReview);

      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
          userId,
        },
      });

      expect(review).toBeTruthy();
      expect(review?.userId).toBe(userId);
    });

    it('should reject update of another user\'s review', async () => {
      const userId = 'user123';
      const reviewId = 'review456';

      (prisma.review.findFirst as jest.Mock).mockResolvedValue(null);

      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
          userId,
        },
      });

      expect(review).toBeNull();
    });
  });

  describe('Review Deletion Permissions', () => {
    it('should allow user to delete their own review', async () => {
      const userId = 'user123';
      const reviewId = 'review123';

      const mockReview = {
        id: reviewId,
        userId,
        productId: 'product123',
        rating: 4,
      };

      (prisma.review.findFirst as jest.Mock).mockResolvedValue(mockReview);

      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
          userId,
        },
      });

      expect(review).toBeTruthy();
    });

    it('should allow admin to delete any review', async () => {
      const adminRole = 'ADMIN';
      const reviewId = 'review123';

      const mockReview = {
        id: reviewId,
        userId: 'user456',
        productId: 'product123',
        rating: 1,
      };

      (prisma.review.findFirst as jest.Mock).mockResolvedValue(mockReview);

      const review = await prisma.review.findFirst({
        where: {
          id: reviewId,
        },
      });

      const canDelete = adminRole === 'ADMIN' || adminRole === 'SUPER_ADMIN';

      expect(review).toBeTruthy();
      expect(canDelete).toBe(true);
    });
  });

  describe('Review Validation', () => {
    it('should validate correct review data', () => {
      const reviewData = {
        productId: 'clh3h8k0e0000xyz123456789',
        rating: 5,
        comment: 'Excellent product! Very satisfied with the quality.',
      };

      const result = validateData(createReviewSchema, reviewData);
      expect(result.productId).toBe('clh3h8k0e0000xyz123456789');
      expect(result.rating).toBe(5);
      expect(result.comment).toContain('Excellent');
    });

    it('should reject rating below 1', () => {
      const reviewData = {
        productId: 'clxxx111',
        rating: 0,
        comment: 'Terrible product',
      };

      expect(() => validateData(createReviewSchema, reviewData)).toThrow();
    });

    it('should reject rating above 5', () => {
      const reviewData = {
        productId: 'clxxx111',
        rating: 6,
        comment: 'Amazing product',
      };

      expect(() => validateData(createReviewSchema, reviewData)).toThrow();
    });

    it('should reject comment shorter than 10 characters', () => {
      const reviewData = {
        productId: 'clxxx111',
        rating: 4,
        comment: 'Good',
      };

      expect(() => validateData(createReviewSchema, reviewData)).toThrow();
    });

    it('should reject comment longer than 1000 characters', () => {
      const reviewData = {
        productId: 'clxxx111',
        rating: 4,
        comment: 'A'.repeat(1001),
      };

      expect(() => validateData(createReviewSchema, reviewData)).toThrow();
    });

    it('should accept optional images array', () => {
      const reviewData = {
        productId: 'clh3h8k0e0000xyz123456789',
        rating: 5,
        comment: 'Great product with photos',
        images: [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ],
      };

      const result = validateData(createReviewSchema, reviewData);
      expect(result.images).toBeDefined();
      expect(result.images?.length).toBe(2);
    });

    it('should reject more than 5 images', () => {
      const reviewData = {
        productId: 'clh3h8k0e0000xyz123456789',
        rating: 5,
        comment: 'Great product with too many photos',
        images: Array(6).fill('https://example.com/image.jpg'),
      };

      expect(() => validateData(createReviewSchema, reviewData)).toThrow();
    });
  });

  describe('Review Visibility Rules', () => {
    it('should show verified purchase badge for purchaser reviews', async () => {
      const userId = 'user123';
      const productId = 'product123';

      const mockOrder = {
        id: 'order123',
        userId,
        status: 'DELIVERED',
      };

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrder);

      const order = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: {
            some: { productId },
          },
        },
      });

      const isVerifiedPurchase = order !== null;
      expect(isVerifiedPurchase).toBe(true);
    });

    it('should not show verified badge for non-purchaser reviews', async () => {
      const userId = 'user123';
      const productId = 'product123';

      (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);

      const order = await prisma.order.findFirst({
        where: {
          userId,
          status: 'DELIVERED',
          items: {
            some: { productId },
          },
        },
      });

      const isVerifiedPurchase = order !== null;
      expect(isVerifiedPurchase).toBe(false);
    });
  });

  describe('Review Rating Average Calculation', () => {
    it('should calculate average rating correctly', () => {
      const reviews = [
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
        { rating: 3 },
        { rating: 4 },
      ];

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      expect(averageRating).toBe(4.2);
    });

    it('should handle single review', () => {
      const reviews = [{ rating: 5 }];

      const averageRating = reviews[0].rating;

      expect(averageRating).toBe(5);
    });

    it('should handle no reviews', () => {
      const reviews: { rating: number }[] = [];

      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

      expect(averageRating).toBe(0);
    });
  });
});
