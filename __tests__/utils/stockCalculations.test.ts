// __tests__/utils/stockCalculations.test.ts
// Unit tests for stock management calculations

import {
  calculateStockStatus,
  validateStockAdjustment,
  calculateReorderPoint,
  calculateEOQ,
  calculateAverageDailySales,
  generateStockAlert,
  type StockItem,
} from '@/utils/stockCalculations';

describe('Stock Management Calculations', () => {
  const mockStockItem: StockItem = {
    productId: 'prod-1',
    productName: 'Test Product',
    sku: 'TEST-001',
    currentStock: 100,
    moq: 10,
    reorderPoint: 30,
    reorderQuantity: 100,
    averageDailySales: 5,
  };

  describe('calculateStockStatus', () => {
    it('should mark as in_stock when stock is healthy', () => {
      const result = calculateStockStatus(mockStockItem);
      expect(result.status).toBe('in_stock');
      expect(result.isReorderNeeded).toBe(false);
    });

    it('should mark as low_stock when approaching reorder point', () => {
      const lowStockItem = { ...mockStockItem, currentStock: 40 };
      const result = calculateStockStatus(lowStockItem);
      expect(result.status).toBe('low_stock');
      expect(result.isReorderNeeded).toBe(false);
    });

    it('should mark as reorder_needed when at reorder point', () => {
      const reorderItem = { ...mockStockItem, currentStock: 30 };
      const result = calculateStockStatus(reorderItem);
      expect(result.status).toBe('reorder_needed');
      expect(result.isReorderNeeded).toBe(true);
    });

    it('should mark as out_of_stock when stock is zero', () => {
      const outOfStockItem = { ...mockStockItem, currentStock: 0 };
      const result = calculateStockStatus(outOfStockItem);
      expect(result.status).toBe('out_of_stock');
      expect(result.isReorderNeeded).toBe(true);
    });

    it('should calculate days of stock remaining', () => {
      const result = calculateStockStatus(mockStockItem);
      expect(result.daysOfStock).toBe(20); // 100 / 5
    });

    it('should calculate estimated stockout date', () => {
      const result = calculateStockStatus(mockStockItem);
      expect(result.estimatedStockoutDate).toBeInstanceOf(Date);
      
      const daysUntilStockout = Math.floor(
        (result.estimatedStockoutDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      // Allow 1 day tolerance for timing differences
      expect(daysUntilStockout).toBeGreaterThanOrEqual(19);
      expect(daysUntilStockout).toBeLessThanOrEqual(20);
    });

    it('should suggest reorder quantity meeting MOQ', () => {
      const result = calculateStockStatus(mockStockItem);
      expect(result.suggestedReorderQuantity).toBeGreaterThanOrEqual(mockStockItem.moq);
    });
  });

  describe('validateStockAdjustment', () => {
    it('should validate add adjustment', () => {
      const result = validateStockAdjustment(100, 50, 'add', 'Restocking');
      expect(result.isValid).toBe(true);
      expect(result.newStock).toBe(150);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate remove adjustment', () => {
      const result = validateStockAdjustment(100, 30, 'remove', 'Damaged goods');
      expect(result.isValid).toBe(true);
      expect(result.newStock).toBe(70);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate set adjustment', () => {
      const result = validateStockAdjustment(100, 75, 'set', 'Physical count correction');
      expect(result.isValid).toBe(true);
      expect(result.newStock).toBe(75);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject removing more than available', () => {
      const result = validateStockAdjustment(100, 150, 'remove', 'Invalid removal');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot remove more stock than available');
      expect(result.newStock).toBe(0);
    });

    it('should reject invalid reason', () => {
      const result = validateStockAdjustment(100, 50, 'add', 'abc');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Reason is required and must be at least 5 characters');
    });

    it('should reject negative quantity', () => {
      const result = validateStockAdjustment(100, -10, 'add', 'Test reason');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Adjustment quantity must be a positive number');
    });
  });

  describe('calculateReorderPoint', () => {
    it('should calculate reorder point correctly', () => {
      const averageDailySales = 10;
      const leadTimeDays = 7;
      const safetyStockDays = 5;
      
      const result = calculateReorderPoint(averageDailySales, leadTimeDays, safetyStockDays);
      
      // (10 * 7) + (10 * 5) = 120
      expect(result).toBe(120);
    });

    it('should use default safety stock of 7 days', () => {
      const result = calculateReorderPoint(10, 7);
      
      // (10 * 7) + (10 * 7) = 140
      expect(result).toBe(140);
    });

    it('should round up to nearest integer', () => {
      const result = calculateReorderPoint(3.7, 5, 3);
      
      // Should be rounded up
      expect(result).toBeGreaterThan(29);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('calculateEOQ', () => {
    it('should calculate Economic Order Quantity', () => {
      const annualDemand = 10000;
      const orderingCost = 50;
      const holdingCostPerUnit = 2;
      
      const result = calculateEOQ(annualDemand, orderingCost, holdingCostPerUnit);
      
      // EOQ = √((2 × 10000 × 50) / 2) = √500000 ≈ 707.11
      expect(result).toBeCloseTo(708, 0);
    });

    it('should return 0 for zero holding cost', () => {
      const result = calculateEOQ(10000, 50, 0);
      expect(result).toBe(0);
    });

    it('should round up to nearest integer', () => {
      const result = calculateEOQ(5000, 30, 1.5);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('calculateAverageDailySales', () => {
    const orderHistory = [
      { quantity: 10, date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { quantity: 15, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { quantity: 20, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      { quantity: 25, date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) }, // Too old
    ];

    it('should calculate average from recent orders', () => {
      const result = calculateAverageDailySales(orderHistory, 30);
      
      // Only first 3 orders within 30 days: (10 + 15 + 20) / 30 = 1.5
      expect(result).toBeCloseTo(1.5);
    });

    it('should return 0 for empty order history', () => {
      const result = calculateAverageDailySales([]);
      expect(result).toBe(0);
    });

    it('should use 30 days by default', () => {
      const result = calculateAverageDailySales(orderHistory);
      expect(result).toBeCloseTo(1.5);
    });
  });

  describe('generateStockAlert', () => {
    it('should generate alert for out of stock', () => {
      const calculation = calculateStockStatus({
        ...mockStockItem,
        currentStock: 0,
      });
      const alert = generateStockAlert(calculation);
      
      expect(alert).toContain('OUT OF STOCK');
      expect(alert).toContain('Reorder');
      expect(alert).toContain('immediately');
    });

    it('should generate alert for reorder needed', () => {
      const calculation = calculateStockStatus({
        ...mockStockItem,
        currentStock: 25,
      });
      const alert = generateStockAlert(calculation);
      
      expect(alert).toContain('needs reordering');
      expect(alert).toContain('days remaining');
    });

    it('should generate alert for low stock', () => {
      const calculation = calculateStockStatus({
        ...mockStockItem,
        currentStock: 40,
      });
      const alert = generateStockAlert(calculation);
      
      expect(alert).toContain('running low');
      expect(alert).toContain('40 units');
    });

    it('should generate healthy stock message', () => {
      const calculation = calculateStockStatus(mockStockItem);
      const alert = generateStockAlert(calculation);
      
      expect(alert).toContain('stock level is healthy');
      expect(alert).toContain('100 units');
    });
  });
});
