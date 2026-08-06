/**
 * @jest-environment node
 */
// __tests__/services/inventoryService.test.ts
//
// Amazon-style gap-closure Phase 1: `depleteStockLotsForSale` and
// `releaseStockAllocationsForOrder` are the new, tx-aware helpers that let
// order creation/cancellation use real Weighted-Average-Cost stock-lot
// data instead of a flat Product.costPerUnit/basePrice snapshot, without
// duplicating the Product.stockQuantity decrement/guard those call sites
// already own.

const mockTx = {
  stockLot: { findMany: jest.fn(), update: jest.fn().mockResolvedValue({}) },
  stockAllocation: {
    create: jest.fn().mockResolvedValue({}),
    findMany: jest.fn(),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  },
};

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: { stockLot: { findMany: jest.fn() } },
  default: { stockLot: { findMany: jest.fn() } },
}));

import { depleteStockLotsForSale, releaseStockAllocationsForOrder, calculateWeightedAverageCost } from '@/services/inventoryService';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('depleteStockLotsForSale', () => {
  it('returns costPerUnit: null when the product has no stock lots (fall back to flat cost)', async () => {
    (mockTx.stockLot.findMany as jest.Mock).mockResolvedValue([]);

    const result = await depleteStockLotsForSale(mockTx as any, {
      productId: 'p1', quantity: 5, orderId: 'o1', orderItemId: 'oi1',
    });

    expect(result.costPerUnit).toBeNull();
    expect(mockTx.stockAllocation.create).not.toHaveBeenCalled();
  });

  it('computes the weighted-average cost across multiple lots and allocates oldest-first', async () => {
    (mockTx.stockLot.findMany as jest.Mock).mockResolvedValue([
      { id: 'lot-1', quantityRemaining: 10, costPerUnit: 50, purchaseDate: new Date('2026-01-01') },
      { id: 'lot-2', quantityRemaining: 10, costPerUnit: 70, purchaseDate: new Date('2026-02-01') },
    ]);

    const result = await depleteStockLotsForSale(mockTx as any, {
      productId: 'p1', quantity: 15, orderId: 'o1', orderItemId: 'oi1',
    });

    // WAC = (10*50 + 10*70) / 20 = 60
    expect(result.costPerUnit).toBe(60);
    // Allocates from lot-1 (10 units) then lot-2 (5 units), both at WAC
    expect(mockTx.stockAllocation.create).toHaveBeenCalledTimes(2);
    expect(mockTx.stockAllocation.create).toHaveBeenNthCalledWith(1, {
      data: { lotId: 'lot-1', orderId: 'o1', orderItemId: 'oi1', quantity: 10, costPerUnit: 60 },
    });
    expect(mockTx.stockAllocation.create).toHaveBeenNthCalledWith(2, {
      data: { lotId: 'lot-2', orderId: 'o1', orderItemId: 'oi1', quantity: 5, costPerUnit: 60 },
    });
    expect(mockTx.stockLot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' }, data: { quantityRemaining: { decrement: 10 } },
    });
    expect(mockTx.stockLot.update).toHaveBeenCalledWith({
      where: { id: 'lot-2' }, data: { quantityRemaining: { decrement: 5 } },
    });
  });
});

describe('calculateWeightedAverageCost', () => {
  it('returns 0 when no lots have remaining quantity', async () => {
    (mockTx.stockLot.findMany as jest.Mock).mockResolvedValue([]);
    const wac = await calculateWeightedAverageCost('p1', mockTx as any);
    expect(wac).toBe(0);
  });
});

describe('releaseStockAllocationsForOrder', () => {
  it('restores each allocation quantity back onto its lot and deletes the allocation records', async () => {
    (mockTx.stockAllocation.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', lotId: 'lot-1', quantity: 10 },
      { id: 'a2', lotId: 'lot-2', quantity: 5 },
    ]);

    await releaseStockAllocationsForOrder(mockTx as any, 'o1');

    expect(mockTx.stockLot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' }, data: { quantityRemaining: { increment: 10 } },
    });
    expect(mockTx.stockLot.update).toHaveBeenCalledWith({
      where: { id: 'lot-2' }, data: { quantityRemaining: { increment: 5 } },
    });
    expect(mockTx.stockAllocation.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'o1' } });
  });

  it('is a no-op if the order consumed no lot allocations', async () => {
    (mockTx.stockAllocation.findMany as jest.Mock).mockResolvedValue([]);

    await releaseStockAllocationsForOrder(mockTx as any, 'o1');

    expect(mockTx.stockLot.update).not.toHaveBeenCalled();
    expect(mockTx.stockAllocation.deleteMany).toHaveBeenCalledWith({ where: { orderId: 'o1' } });
  });
});
