// __tests__/auth/auth-guards.test.ts - Auth guard tests

import { requireAuth, requireAdmin, authenticateUser } from '@/lib/auth';
import jwt from 'jsonwebtoken';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '@/lib/prisma';

// Mock NextRequest
class MockHeaders {
  private headers: Map<string, string>;

  constructor(init?: Record<string, string>) {
    this.headers = new Map(Object.entries(init || {}));
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }
}

class MockNextRequest {
  public url: string;
  public headers: MockHeaders;

  constructor(url: string, options?: { headers?: Record<string, string> }) {
    this.url = url;
    const normalizedHeaders: Record<string, string> = {};
    if (options?.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        normalizedHeaders[key.toLowerCase()] = value;
      });
    }
    this.headers = new MockHeaders(normalizedHeaders);
  }
}

describe('Auth Guards', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateUser', () => {
    it('should return user when valid token is provided', async () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, JWT_SECRET);
      
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        userType: 'B2C',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      const result = await authenticateUser(request);

      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        id: userId,
        email: 'test@example.com',
        role: 'USER',
      });
    });

    it('should fail when no token is provided', async () => {
      const request = new MockNextRequest('http://localhost:3000/api/test') as any;

      const result = await authenticateUser(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('token');
    });

    it('should fail when invalid token is provided', async () => {
      const request = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      }) as any;

      const result = await authenticateUser(request);
      
      expect(result.success).toBe(false);
    });

    it('should fail when user is not found', async () => {
      const userId = 'nonexistent';
      const token = jwt.sign({ userId }, JWT_SECRET);

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      const result = await authenticateUser(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should fail when user is inactive', async () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, JWT_SECRET);

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        userType: 'B2C',
        isActive: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      const result = await authenticateUser(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('inactive');
    });
  });

  describe('requireAdmin', () => {
    it('should allow ADMIN role', async () => {
      const userId = 'admin123';
      const token = jwt.sign({ userId }, JWT_SECRET);

      const mockAdmin = {
        id: userId,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN',
        userType: 'B2C',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);

      const request = new MockNextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      const user = await requireAdmin(request);

      expect(user.role).toBe('ADMIN');
      expect(user.id).toBe(userId);
    });

    it('should allow SUPER_ADMIN role', async () => {
      const userId = 'superadmin123';
      const token = jwt.sign({ userId }, JWT_SECRET);

      const mockSuperAdmin = {
        id: userId,
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        userType: 'B2C',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockSuperAdmin);

      const request = new MockNextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      const user = await requireAdmin(request);

      expect(user.role).toBe('SUPER_ADMIN');
      expect(user.id).toBe(userId);
    });

    it('should reject USER role', async () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, JWT_SECRET);

      const mockUser = {
        id: userId,
        email: 'user@example.com',
        name: 'Regular User',
        role: 'USER',
        userType: 'B2C',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new MockNextRequest('http://localhost:3000/api/admin/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      await expect(requireAdmin(request)).rejects.toThrow();
    });

    it('should reject when no token provided', async () => {
      const request = new MockNextRequest('http://localhost:3000/api/admin/test') as any;

      await expect(requireAdmin(request)).rejects.toThrow();
    });
  });

  describe('Token extraction', () => {
    it('should extract token from Authorization header', async () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, JWT_SECRET);

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        userType: 'B2C',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }) as any;

      const result = await authenticateUser(request);
      expect(result.success).toBe(true);
    });

    it('should handle lowercase authorization header', async () => {
      const userId = 'user123';
      const token = jwt.sign({ userId }, JWT_SECRET);

      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        userType: 'B2C',
        isActive: true,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = new MockNextRequest('http://localhost:3000/api/test', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      }) as any;

      const result = await authenticateUser(request);
      expect(result.success).toBe(true);
    });
  });
});
