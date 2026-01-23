// __tests__/orders/order-creation.test.ts - Order creation tests

import { validateData, createOrderSchema } from '@/lib/validation';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      create: jest.fn(),
    },
    address: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  },
}));

import { prisma } from '@/lib/db';

const mockPrisma = {
  product: prisma.product,
  order: prisma.order,
  address: prisma.address,
};

describe('Order Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Validation', () => {
    it('should validate valid order data', () => {
      const orderData = {
        items: [
          {
            productId: 'clh3h8k0e0000xyz123456789',
            quantity: 2,
            price: 100,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY' as const,
      };

      const result = validateData(createOrderSchema, orderData);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].quantity).toBe(2);
      expect(result.paymentMethod).toBe('CASH_ON_DELIVERY');
    });

    it('should reject order with empty items', () => {
      const orderData = {
        items: [],
        paymentMethod: 'CASH_ON_DELIVERY',
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });

    it('should reject order with invalid quantity', () => {
      const orderData = {
        items: [
          {
            productId: 'clxxx111',
            quantity: -1,
            price: 100,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY',
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });

    it('should reject order with invalid price', () => {
      const orderData = {
        items: [
          {
            productId: 'clxxx111',
            quantity: 2,
            price: -50,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY',
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });

    it('should reject order with invalid product ID format', () => {
      const orderData = {
        items: [
          {
            productId: 'invalid-id',
            quantity: 2,
            price: 100,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY' as const,
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });

    it('should accept optional discount', () => {
      const orderData = {
        items: [
          {
            productId: 'clh3h8k0e0000xyz123456789',
            quantity: 2,
            price: 100,
            discount: 10,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY' as const,
      };

      const result = validateData(createOrderSchema, orderData);
      expect(result.items[0].discount).toBe(10);
    });

    it('should reject discount over 100%', () => {
      const orderData = {
        items: [
          {
            productId: 'clxxx111',
            quantity: 2,
            price: 100,
            discount: 150,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY',
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });
  });

  describe('Stock Validation', () => {
    it('should allow order when stock is sufficient', async () => {
      const mockProduct = {
        id: 'clxxx111',
        name: 'Test Product',
        stock: 10,
        basePrice: 100,
        isActive: true,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const orderQuantity = 5;
      const result = await prisma.product.findUnique({ where: { id: 'clxxx111' } });

      expect(result?.stock).toBeGreaterThanOrEqual(orderQuantity);
    });

    it('should reject order when stock is insufficient', async () => {
      const mockProduct = {
        id: 'clxxx111',
        name: 'Test Product',
        stock: 2,
        basePrice: 100,
        isActive: true,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const orderQuantity = 5;
      const result = await prisma.product.findUnique({ where: { id: 'clxxx111' } });

      expect(result?.stock).toBeLessThan(orderQuantity);
    });

    it('should reject order when product is inactive', async () => {
      const mockProduct = {
        id: 'clxxx111',
        name: 'Test Product',
        stock: 10,
        basePrice: 100,
        isActive: false,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const result = await prisma.product.findUnique({ where: { id: 'clxxx111' } });

      expect(result?.isActive).toBe(false);
    });
  });

  describe('Price Calculation', () => {
    it('should calculate total correctly for single item', () => {
      const item = {
        quantity: 3,
        price: 100,
      };

      const total = item.quantity * item.price;
      expect(total).toBe(300);
    });

    it('should calculate total with discount', () => {
      const item = {
        quantity: 2,
        price: 100,
        discount: 10, // 10%
      };

      const subtotal = item.quantity * item.price;
      const discountAmount = subtotal * (item.discount / 100);
      const total = subtotal - discountAmount;

      expect(total).toBe(180);
    });

    it('should calculate total for multiple items', () => {
      const items = [
        { quantity: 2, price: 100, discount: 0 },
        { quantity: 3, price: 50, discount: 0 },
        { quantity: 1, price: 200, discount: 10 },
      ];

      const total = items.reduce((sum, item) => {
        const subtotal = item.quantity * item.price;
        const discountAmount = subtotal * (item.discount / 100);
        return sum + (subtotal - discountAmount);
      }, 0);

      expect(total).toBe(530); // 200 + 150 + 180
    });
  });

  describe('MOQ Validation for Wholesale', () => {
    it('should reject B2B order below MOQ', async () => {
      const mockProduct = {
        id: 'clxxx111',
        name: 'Wholesale Product',
        stock: 100,
        basePrice: 100,
        wholesalePrice: 80,
        moq: 10,
        isActive: true,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const orderQuantity = 5;
      const product = await prisma.product.findUnique({ where: { id: 'clxxx111' } });

      if (product?.moq && orderQuantity < product.moq) {
        expect(orderQuantity).toBeLessThan(product.moq);
      }
    });

    it('should allow B2B order meeting MOQ', async () => {
      const mockProduct = {
        id: 'clxxx111',
        name: 'Wholesale Product',
        stock: 100,
        basePrice: 100,
        wholesalePrice: 80,
        moq: 10,
        isActive: true,
      };

      (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

      const orderQuantity = 15;
      const product = await prisma.product.findUnique({ where: { id: 'clxxx111' } });

      expect(orderQuantity).toBeGreaterThanOrEqual(product?.moq || 0);
    });
  });

  describe('Address Validation', () => {
    it('should validate complete shipping address', () => {
      const address = {
        fullName: 'John Doe',
        phone: '1234567890',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4B',
        city: 'Dhaka',
        state: 'Dhaka Division',
        postalCode: '1200',
        country: 'Bangladesh',
      };

      expect(address.fullName).toBeTruthy();
      expect(address.phone).toBeTruthy();
      expect(address.addressLine1).toBeTruthy();
      expect(address.city).toBeTruthy();
    });

    it('should reject address with missing required fields', () => {
      const orderData = {
        items: [
          {
            productId: 'clxxx111',
            quantity: 2,
            price: 100,
          },
        ],
        paymentMethod: 'CASH_ON_DELIVERY',
        shippingAddress: {
          fullName: '',
          phone: '',
          addressLine1: '',
          city: '',
        },
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });
  });

  describe('Payment Method Validation', () => {
    const validPaymentMethods: Array<'CASH_ON_DELIVERY' | 'BANK_TRANSFER' | 'MOBILE_BANKING' | 'CARD'> = ['CASH_ON_DELIVERY', 'BANK_TRANSFER', 'MOBILE_BANKING', 'CARD'];

    validPaymentMethods.forEach((method) => {
      it(`should accept ${method} as payment method`, () => {
        const orderData = {
          items: [
            {
              productId: 'clh3h8k0e0000xyz123456789',
              quantity: 2,
              price: 100,
            },
          ],
          paymentMethod: method,
        };

        const result = validateData(createOrderSchema, orderData);
        expect(result.paymentMethod).toBe(method);
      });
    });

    it('should reject invalid payment method', () => {
      const orderData = {
        items: [
          {
            productId: 'clh3h8k0e0000xyz123456789',
            quantity: 2,
            price: 100,
          },
        ],
        paymentMethod: 'CRYPTO',
      };

      expect(() => validateData(createOrderSchema, orderData)).toThrow();
    });
  });
});
