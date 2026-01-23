# Comprehensive Financial System Implementation Guide

## Executive Summary

This document provides a complete implementation plan for a professional-grade wholesale eCommerce financial system with:
- Multi-unit inventory management with lot/batch tracking
- FIFO/Weighted Average Cost (WAC) for COGS calculation  
- Comprehensive tax management (configurable inclusive/exclusive)
- Payment tracking with partial payments and dues management
- Operational expenses with approval workflows
- Role-based access control (RBAC) protecting cost data
- Auditable financial ledger
- Real-time profit reporting

## Current System Analysis

### ✅ **Already Implemented**

Based on the schema and codebase review:

1. **Database Schema (Comprehensive)**
   - User management with roles: SUPER_ADMIN, ADMIN, PARTNER, MANAGER, SELLER, BUYER, GUEST
   - UserPermission system with granular module-level permissions
   - Product with cost tracking (costPerUnit, basePrice, wholesalePrice)
   - Order with profit tracking fields
   - OrderItem with costPerUnit and profitPerUnit
   - Payment model (basic)
   - InventoryLog for stock movements
   - ProfitReport model
   - OperationalCost with categories
   - ProfitLossReport for period reporting
   - FinancialLedger (append-only audit log)
   - Employee and Salary management
   - Partner profit sharing models
   - WholesaleTier for volume pricing
   - Sale tracking (direct and order-based)

2. **Existing APIs**
   - Product CRUD with admin verification
   - Order creation with profit calculation
   - Basic inventory tracking
   - Financial APIs (ledger, profit-loss, revenue analytics)
   - Admin authentication middleware

3. **Business Logic**
   - Auto profit report generation on order delivery
   - Customer discount system
   - Stock validation on order creation
   - Activity logging for admin actions

### ❌ **Missing Critical Features**

1. **Inventory Lot/Batch Tracking**
   - No stock lot table for FIFO/WAC
   - Cannot track multiple purchase costs for same product
   - No restock/purchase entry flow

2. **COGS Calculation**
   - Basic costPerUnit but no FIFO/WAC implementation
   - No automated cost allocation on order fulfillment

3. **Payment & Dues Management**
   - Payment model exists but not integrated with orders
   - No partial payment tracking
   - No due balance calculation
   - No payment ledger

4. **Tax Configuration**
   - No tax rate per product
   - No inclusive/exclusive tax handling
   - Tax is added as flat field in order

5. **Order Lifecycle**
   - Missing statuses: PACKED, IN_TRANSIT
   - No delivery completion trigger for COGS
   - No return/refund flow

6. **Operational Expenses**
   - Model exists but no approval workflow API
   - No allocation to reporting periods

7. **Role-Based DTOs**
   - APIs don't filter cost data by role
   - Buying costs exposed to all users

## Implementation Plan

---

## Phase 1: Database Schema Enhancements

### 1.1 Stock Lot/Batch Tracking

```prisma
// Add to schema.prisma

// Stock Lots for FIFO/WAC costing
model StockLot {
  id              String   @id @default(cuid())
  productId       String
  
  // Purchase/Restock Details
  lotNumber       String   // Auto-generated or manual
  purchaseDate    DateTime @default(now())
  expiryDate      DateTime? // For perishable goods
  
  // Cost Information
  quantityReceived Int      // Original quantity
  quantityRemaining Int     // Current available
  costPerUnit      Float    // Buying cost per unit
  totalCost        Float    // Total purchase cost
  
  // Supplier Information
  supplierId       String?
  supplierName     String?
  purchaseOrderRef String?  // PO reference
  
  // Warehouse
  warehouseId      String   @default("default")
  
  // Metadata
  notes            String?
  createdBy        String   // User who created restock entry
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  // Relations
  product          Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  allocations      StockAllocation[] // Track which orders consumed this lot
  
  @@index([productId])
  @@index([purchaseDate])
  @@index([lotNumber])
  @@map("stock_lots")
}

// Track which orders consumed which lots (for audit trail)
model StockAllocation {
  id          String   @id @default(cuid())
  lotId       String
  orderId     String
  orderItemId String
  quantity    Int      // Quantity allocated from this lot
  costPerUnit Float    // Cost at time of allocation (snapshot)
  allocatedAt DateTime @default(now())
  
  // Relations
  lot         StockLot  @relation(fields: [lotId], references: [id], onDelete: Cascade)
  
  @@index([lotId])
  @@index([orderId])
  @@map("stock_allocations")
}
```

### 1.2 Enhanced Payment & Dues

```prisma
// Update Payment model to be more comprehensive

model Payment {
  id            String        @id @default(cuid())
  orderId       String
  
  // Payment Details
  amount        Float
  method        PaymentMethod
  status        PaymentStatus @default(PENDING)
  
  // Gateway Information
  transactionId String?       @unique
  gateway       String?       // bKash, Nagad, Bank, etc.
  gatewayRef    String?       // Gateway transaction reference
  gatewayResponse Json?       // Full gateway response for audit
  
  // Timestamps
  paidAt        DateTime?     // When payment was received
  confirmedAt   DateTime?     // When payment was confirmed
  
  // People
  receivedBy    String?       // Admin/employee who received payment
  approvedBy    String?       // Admin who approved payment
  
  // Metadata
  notes         String?
  attachmentUrl String?       // Receipt/proof of payment
  
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  // Relations
  order         Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  
  @@index([orderId])
  @@index([status])
  @@index([paidAt])
  @@map("payments")
}

// Add computed due tracking to Order model (virtual fields handled in API)
```

### 1.3 Product Tax Configuration

```prisma
// Update Product model - add tax fields

model Product {
  // ... existing fields ...
  
  // Tax Configuration
  taxRate         Float?  // Tax rate percentage (e.g., 15 for 15%)
  taxInclusive    Boolean @default(false) // Is wholesalePrice tax-inclusive?
  taxCategory     String? // Standard, Reduced, Zero, Exempt
  
  // ... rest of existing fields ...
}
```

### 1.4 Order Status Enhancement

```prisma
enum OrderStatus {
  PENDING       // Initial state
  CONFIRMED     // Payment confirmed, ready for processing
  PROCESSING    // Being prepared
  PACKED        // Ready for shipment
  SHIPPED       // Dispatched
  IN_TRANSIT    // In delivery
  DELIVERED     // Completed - trigger COGS calculation
  COMPLETED     // Finalized with COGS locked
  CANCELLED     // Cancelled before fulfillment
  RETURNED      // Returned after delivery
  REFUNDED      // Refund processed
}
```

---

## Phase 2: Core Service Layer Implementation

### 2.1 Inventory Service (FIFO/WAC)

**File:** `src/services/inventoryService.ts`

```typescript
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export type CostingMethod = 'FIFO' | 'WAC'; // Weighted Average Cost

/**
 * Add stock lot (restock/purchase entry)
 */
export async function addStockLot({
  productId,
  quantity,
  costPerUnit,
  lotNumber,
  supplierId,
  supplierName,
  purchaseOrderRef,
  expiryDate,
  warehouseId = 'default',
  notes,
  createdBy,
}: {
  productId: string;
  quantity: number;
  costPerUnit: number;
  lotNumber?: string;
  supplierId?: string;
  supplierName?: string;
  purchaseOrderRef?: string;
  expiryDate?: Date;
  warehouseId?: string;
  notes?: string;
  createdBy: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Auto-generate lot number if not provided
    const generatedLotNumber = lotNumber || `LOT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create stock lot
    const stockLot = await tx.stockLot.create({
      data: {
        productId,
        lotNumber: generatedLotNumber,
        quantityReceived: quantity,
        quantityRemaining: quantity,
        costPerUnit,
        totalCost: quantity * costPerUnit,
        supplierId,
        supplierName,
        purchaseOrderRef,
        expiryDate,
        warehouseId,
        notes,
        createdBy,
      },
    });
    
    // Update product stock quantity
    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: { increment: quantity },
      },
    });
    
    // Create inventory log
    await tx.inventoryLog.create({
      data: {
        productId,
        action: 'PURCHASE',
        quantity,
        previousStock: 0, // Will be updated
        newStock: 0, // Will be updated
        reference: stockLot.id,
        notes: `Stock lot ${generatedLotNumber} added`,
        performedBy: createdBy,
      },
    });
    
    // Log to financial ledger
    await tx.financialLedger.create({
      data: {
        sourceType: 'PURCHASE',
        sourceId: stockLot.id,
        sourceName: `Stock purchase - ${generatedLotNumber}`,
        amount: stockLot.totalCost,
        direction: 'DEBIT',
        category: 'INVENTORY',
        description: `Purchased ${quantity} units at ${costPerUnit} per unit`,
        createdBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return stockLot;
  });
}

/**
 * Allocate stock using FIFO method
 */
export async function allocateStockFIFO({
  productId,
  quantity,
  orderId,
  orderItemId,
}: {
  productId: string;
  quantity: number;
  orderId: string;
  orderItemId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Get available lots ordered by purchase date (FIFO)
    const lots = await tx.stockLot.findMany({
      where: {
        productId,
        quantityRemaining: { gt: 0 },
      },
      orderBy: {
        purchaseDate: 'asc', // Oldest first
      },
    });
    
    if (lots.length === 0) {
      throw new Error('No stock available');
    }
    
    let remainingQty = quantity;
    let totalCost = 0;
    const allocations = [];
    
    // Allocate from lots
    for (const lot of lots) {
      if (remainingQty <= 0) break;
      
      const qtyToAllocate = Math.min(remainingQty, lot.quantityRemaining);
      const cost = qtyToAllocate * lot.costPerUnit;
      
      // Create allocation record
      const allocation = await tx.stockAllocation.create({
        data: {
          lotId: lot.id,
          orderId,
          orderItemId,
          quantity: qtyToAllocate,
          costPerUnit: lot.costPerUnit,
        },
      });
      
      // Update lot remaining quantity
      await tx.stockLot.update({
        where: { id: lot.id },
        data: {
          quantityRemaining: { decrement: qtyToAllocate },
        },
      });
      
      totalCost += cost;
      remainingQty -= qtyToAllocate;
      allocations.push(allocation);
    }
    
    if (remainingQty > 0) {
      throw new Error(`Insufficient stock. Short by ${remainingQty} units`);
    }
    
    // Update product stock
    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });
    
    // Create inventory log
    await tx.inventoryLog.create({
      data: {
        productId,
        action: 'SALE',
        quantity: -quantity,
        previousStock: 0,
        newStock: 0,
        reference: orderId,
        notes: `Allocated for order ${orderId}`,
      },
    });
    
    return {
      allocations,
      totalCost,
      averageCost: totalCost / quantity,
    };
  });
}

/**
 * Calculate weighted average cost
 */
export async function calculateWeightedAverageCost(productId: string): Promise<number> {
  const lots = await prisma.stockLot.findMany({
    where: {
      productId,
      quantityRemaining: { gt: 0 },
    },
  });
  
  if (lots.length === 0) return 0;
  
  const totalValue = lots.reduce((sum, lot) => sum + (lot.quantityRemaining * lot.costPerUnit), 0);
  const totalQty = lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
  
  return totalQty > 0 ? totalValue / totalQty : 0;
}

/**
 * Allocate stock using WAC method
 */
export async function allocateStockWAC({
  productId,
  quantity,
  orderId,
  orderItemId,
}: {
  productId: string;
  quantity: number;
  orderId: string;
  orderItemId: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Calculate current WAC
    const wac = await calculateWeightedAverageCost(productId);
    
    if (wac === 0) {
      throw new Error('No stock available or unable to calculate cost');
    }
    
    // Get available lots
    const lots = await tx.stockLot.findMany({
      where: {
        productId,
        quantityRemaining: { gt: 0 },
      },
      orderBy: {
        purchaseDate: 'asc',
      },
    });
    
    let remainingQty = quantity;
    const allocations = [];
    
    // Allocate from lots (proportionally or FIFO-style)
    for (const lot of lots) {
      if (remainingQty <= 0) break;
      
      const qtyToAllocate = Math.min(remainingQty, lot.quantityRemaining);
      
      // Create allocation with WAC
      const allocation = await tx.stockAllocation.create({
        data: {
          lotId: lot.id,
          orderId,
          orderItemId,
          quantity: qtyToAllocate,
          costPerUnit: wac, // Use WAC instead of lot cost
        },
      });
      
      await tx.stockLot.update({
        where: { id: lot.id },
        data: {
          quantityRemaining: { decrement: qtyToAllocate },
        },
      });
      
      remainingQty -= qtyToAllocate;
      allocations.push(allocation);
    }
    
    if (remainingQty > 0) {
      throw new Error(`Insufficient stock. Short by ${remainingQty} units`);
    }
    
    // Update product stock
    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: { decrement: quantity },
      },
    });
    
    // Create inventory log
    await tx.inventoryLog.create({
      data: {
        productId,
        action: 'SALE',
        quantity: -quantity,
        previousStock: 0,
        newStock: 0,
        reference: orderId,
      },
    });
    
    return {
      allocations,
      totalCost: quantity * wac,
      averageCost: wac,
    };
  });
}
```

### 2.2 Payment Service

**File:** `src/services/paymentService.ts`

```typescript
import { prisma } from '@/lib/db';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

/**
 * Calculate order due amount
 */
export async function calculateOrderDue(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      payments: {
        where: {
          status: { in: ['PAID', 'PENDING'] },
        },
      },
    },
  });
  
  if (!order) {
    throw new Error('Order not found');
  }
  
  const totalPaid = order.payments
    .filter(p => p.status === 'PAID')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const due = order.total - totalPaid;
  
  return {
    total: order.total,
    paid: totalPaid,
    due: Math.max(0, due),
    status: due <= 0 ? 'PAID' : (totalPaid > 0 ? 'PARTIAL' : 'PENDING'),
  };
}

/**
 * Record a payment
 */
export async function recordPayment({
  orderId,
  amount,
  method,
  transactionId,
  gateway,
  notes,
  receivedBy,
  attachmentUrl,
}: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  gateway?: string;
  notes?: string;
  receivedBy: string;
  attachmentUrl?: string;
}) {
  return await prisma.$transaction(async (tx) => {
    // Validate order exists
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        payments: {
          where: { status: 'PAID' },
        },
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Calculate current paid amount
    const currentPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    const remaining = order.total - currentPaid;
    
    // Validate payment amount
    if (amount <= 0) {
      throw new Error('Payment amount must be positive');
    }
    
    if (amount > remaining) {
      throw new Error(`Payment amount exceeds due amount. Remaining: ${remaining}`);
    }
    
    // Create payment record
    const payment = await tx.payment.create({
      data: {
        orderId,
        amount,
        method,
        status: 'PAID',
        transactionId,
        gateway,
        notes,
        receivedBy,
        attachmentUrl,
        paidAt: new Date(),
      },
    });
    
    // Update order payment status
    const newPaid = currentPaid + amount;
    const newStatus = newPaid >= order.total ? 'PAID' : 'PARTIAL';
    
    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: newStatus,
      },
    });
    
    // Log to financial ledger
    await tx.financialLedger.create({
      data: {
        sourceType: 'ORDER',
        sourceId: payment.id,
        sourceName: `Payment for order ${order.orderNumber}`,
        amount: amount,
        direction: 'CREDIT',
        category: 'REVENUE',
        description: `Payment received via ${method}`,
        orderId: orderId,
        createdBy: receivedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return payment;
  });
}

/**
 * Process refund
 */
export async function processRefund({
  orderId,
  amount,
  reason,
  processedBy,
}: {
  orderId: string;
  amount: number;
  reason: string;
  processedBy: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    const totalPaid = order.payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    
    if (amount > totalPaid) {
      throw new Error('Refund amount exceeds paid amount');
    }
    
    // Create negative payment (refund)
    const refund = await tx.payment.create({
      data: {
        orderId,
        amount: -amount, // Negative for refund
        method: 'BANK_TRANSFER',
        status: 'REFUNDED',
        notes: reason,
        receivedBy: processedBy,
        paidAt: new Date(),
      },
    });
    
    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
      },
    });
    
    // Log to financial ledger
    await tx.financialLedger.create({
      data: {
        sourceType: 'REFUND',
        sourceId: refund.id,
        sourceName: `Refund for order ${order.orderNumber}`,
        amount: amount,
        direction: 'DEBIT',
        category: 'REFUNDS',
        description: reason,
        orderId: orderId,
        createdBy: processedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return refund;
  });
}
```

### 2.3 Order Fulfillment Service (COGS Calculation)

**File:** `src/services/orderFulfillmentService.ts`

```typescript
import { prisma } from '@/lib/db';
import { allocateStockFIFO, allocateStockWAC } from './inventoryService';
import { calculateOrderDue } from './paymentService';

/**
 * Complete order delivery and finalize COGS
 */
export async function completeOrderDelivery({
  orderId,
  completedBy,
  costingMethod = 'FIFO',
}: {
  orderId: string;
  completedBy: string;
  costingMethod?: 'FIFO' | 'WAC';
}) {
  return await prisma.$transaction(async (tx) => {
    // Get order with items
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        user: true,
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    if (order.status === 'COMPLETED') {
      throw new Error('Order already completed');
    }
    
    if (order.status !== 'DELIVERED') {
      throw new Error('Order must be in DELIVERED status before completion');
    }
    
    let totalCOGS = 0;
    let totalRevenue = 0;
    
    // Process each order item
    for (const item of order.orderItems) {
      // Allocate stock and calculate COGS
      const allocation = costingMethod === 'FIFO'
        ? await allocateStockFIFO({
            productId: item.productId,
            quantity: item.quantity,
            orderId: order.id,
            orderItemId: item.id,
          })
        : await allocateStockWAC({
            productId: item.productId,
            quantity: item.quantity,
            orderId: order.id,
            orderItemId: item.id,
          });
      
      const itemCOGS = allocation.totalCost;
      const itemRevenue = item.total;
      const itemProfit = itemRevenue - itemCOGS;
      
      // Update order item with final COGS
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          costPerUnit: allocation.averageCost,
          profitPerUnit: (item.price - allocation.averageCost),
          totalProfit: itemProfit,
          profitMargin: itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0,
        },
      });
      
      totalCOGS += itemCOGS;
      totalRevenue += itemRevenue;
    }
    
    // Calculate order-level profit
    const grossProfit = totalRevenue - totalCOGS;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    // Update order with COGS and profit
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        totalCost: totalCOGS,
        grossProfit: grossProfit,
        profitMargin: profitMargin,
      },
    });
    
    // Create/update profit report
    await tx.profitReport.create({
      data: {
        orderId: order.id,
        revenue: totalRevenue,
        costOfGoods: totalCOGS,
        grossProfit: grossProfit,
        
        // Expenses (can be allocated from operational costs if needed)
        shippingExpense: order.shipping || 0,
        totalExpenses: order.shipping || 0,
        
        netProfit: grossProfit - (order.shipping || 0),
        profitMargin: profitMargin,
        
        // Platform/seller split (if applicable)
        platformProfit: grossProfit,
        platformProfitPercent: 100,
        sellerProfit: 0,
        sellerProfitPercent: 0,
        
        reportDate: new Date(),
      },
    });
    
    // Log to financial ledger - COGS
    await tx.financialLedger.create({
      data: {
        sourceType: 'ORDER',
        sourceId: order.id,
        sourceName: `COGS for order ${order.orderNumber}`,
        amount: totalCOGS,
        direction: 'DEBIT',
        category: 'COGS',
        description: `Cost of goods sold`,
        orderId: order.id,
        createdBy: completedBy,
        fiscalYear: new Date().getFullYear(),
        fiscalMonth: new Date().getMonth() + 1,
      },
    });
    
    return updatedOrder;
  });
}

/**
 * Handle order returns and stock restoration
 */
export async function processOrderReturn({
  orderId,
  reason,
  processedBy,
}: {
  orderId: string;
  reason: string;
  processedBy: string;
}) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });
    
    if (!order) {
      throw new Error('Order not found');
    }
    
    // Restore stock for each item
    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: { increment: item.quantity },
        },
      });
      
      // Log inventory return
      await tx.inventoryLog.create({
        data: {
          productId: item.productId,
          action: 'RETURN',
          quantity: item.quantity,
          previousStock: 0,
          newStock: 0,
          reference: orderId,
          notes: `Returned from order ${order.orderNumber}: ${reason}`,
          performedBy: processedBy,
        },
      });
    }
    
    // Update order status
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'RETURNED',
      },
    });
    
    return order;
  });
}
```

---

## Phase 3: API Implementation

### 3.1 Inventory/Restock API

**File:** `src/app/api/admin/inventory/restock/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { addStockLot } from '@/services/inventoryService';
import { logActivity } from '@/lib/activityLogger';

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const admin = await requireAdmin(request);
    
    const body = await request.json();
    const {
      productId,
      quantity,
      costPerUnit,
      lotNumber,
      supplierId,
      supplierName,
      purchaseOrderRef,
      expiryDate,
      notes,
    } = body;
    
    // Validation
    if (!productId || !quantity || !costPerUnit) {
      return NextResponse.json(
        { error: 'Product ID, quantity, and cost per unit are required' },
        { status: 400 }
      );
    }
    
    if (quantity <= 0 || costPerUnit <= 0) {
      return NextResponse.json(
        { error: 'Quantity and cost must be positive numbers' },
        { status: 400 }
      );
    }
    
    // Create stock lot
    const stockLot = await addStockLot({
      productId,
      quantity,
      costPerUnit,
      lotNumber,
      supplierId,
      supplierName,
      purchaseOrderRef,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      notes,
      createdBy: admin.id,
    });
    
    // Log activity
    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'CREATE',
      entityType: 'StockLot',
      entityId: stockLot.id,
      entityName: stockLot.lotNumber,
      description: `Added stock lot: ${quantity} units at ${costPerUnit} per unit`,
      metadata: { productId, quantity, costPerUnit },
    });
    
    return NextResponse.json({
      success: true,
      stockLot,
    });
  } catch (error: any) {
    console.error('Restock error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add stock' },
      { status: 500 }
    );
  }
}

// GET - List all stock lots
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    
    const stockLots = await prisma.stockLot.findMany({
      where: productId ? { productId } : {},
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });
    
    return NextResponse.json({
      success: true,
      stockLots,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock lots' },
      { status: 500 }
    );
  }
}
```

### 3.2 Payment API

**File:** `src/app/api/admin/orders/[orderId]/payments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { recordPayment, calculateOrderDue } from '@/services/paymentService';

// POST - Record payment
export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = await requireAdmin(request);
    const orderId = params.orderId;
    
    const body = await request.json();
    const {
      amount,
      method,
      transactionId,
      gateway,
      notes,
      attachmentUrl,
    } = body;
    
    if (!amount || !method) {
      return NextResponse.json(
        { error: 'Amount and payment method are required' },
        { status: 400 }
      );
    }
    
    const payment = await recordPayment({
      orderId,
      amount: parseFloat(amount),
      method,
      transactionId,
      gateway,
      notes,
      receivedBy: admin.id,
      attachmentUrl,
    });
    
    return NextResponse.json({
      success: true,
      payment,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to record payment' },
      { status: 500 }
    );
  }
}

// GET - Get order payments and due amount
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    await requireAdmin(request);
    const orderId = params.orderId;
    
    const dueInfo = await calculateOrderDue(orderId);
    
    const payments = await prisma.payment.findMany({
      where: { orderId },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({
      success: true,
      dueInfo,
      payments,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch payment data' },
      { status: 500 }
    );
  }
}
```

### 3.3 Order Fulfillment API

**File:** `src/app/api/admin/orders/[orderId]/complete/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { completeOrderDelivery } from '@/services/orderFulfillmentService';

export async function POST(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const admin = await requireAdmin(request);
    const orderId = params.orderId;
    
    const body = await request.json();
    const { costingMethod = 'FIFO' } = body;
    
    // Validate costing method
    if (costingMethod !== 'FIFO' && costingMethod !== 'WAC') {
      return NextResponse.json(
        { error: 'Invalid costing method. Use FIFO or WAC' },
        { status: 400 }
      );
    }
    
    const completedOrder = await completeOrderDelivery({
      orderId,
      completedBy: admin.id,
      costingMethod,
    });
    
    return NextResponse.json({
      success: true,
      order: completedOrder,
    });
  } catch (error: any) {
    console.error('Order completion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete order' },
      { status: 500 }
    );
  }
}
```

### 3.4 Operational Expenses API

**File:** `src/app/api/admin/expenses/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    
    const body = await request.json();
    const {
      category,
      subCategory,
      description,
      amount,
      date,
      paymentMethod,
      paymentReference,
      vendor,
      vendorContact,
      notes,
      attachmentUrl,
      isRecurring,
      recurringPeriod,
    } = body;
    
    if (!category || !description || !amount) {
      return NextResponse.json(
        { error: 'Category, description, and amount are required' },
        { status: 400 }
      );
    }
    
    const expenseDate = date ? new Date(date) : new Date();
    
    const expense = await prisma.$transaction(async (tx) => {
      const createdExpense = await tx.operationalCost.create({
        data: {
          category,
          subCategory,
          description,
          amount: parseFloat(amount),
          date: expenseDate,
          month: expenseDate.getMonth() + 1,
          year: expenseDate.getFullYear(),
          paymentStatus: 'PENDING',
          paymentMethod,
          paymentReference,
          vendor,
          vendorContact,
          notes,
          attachmentUrl,
          isRecurring: isRecurring || false,
          recurringPeriod,
          isApproved: false,
        },
      });
      
      // Log to financial ledger
      await tx.financialLedger.create({
        data: {
          sourceType: 'EXPENSE',
          sourceId: createdExpense.id,
          sourceName: `${category} - ${description}`,
          amount: parseFloat(amount),
          direction: 'DEBIT',
          category: 'OPERATIONAL_EXPENSE',
          subcategory: category,
          description,
          createdBy: admin.id,
          fiscalYear: expenseDate.getFullYear(),
          fiscalMonth: expenseDate.getMonth() + 1,
        },
      });
      
      return createdExpense;
    });
    
    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'CREATE',
      entityType: 'OperationalCost',
      entityId: expense.id,
      entityName: description,
      description: `Created expense: ${category} - ${amount}`,
    });
    
    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 500 }
    );
  }
}

// GET - List expenses with filters
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const isApproved = searchParams.get('isApproved');
    
    const where: any = {};
    if (category) where.category = category;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (isApproved !== null) where.isApproved = isApproved === 'true';
    
    const expenses = await prisma.operationalCost.findMany({
      where,
      orderBy: {
        date: 'desc',
      },
    });
    
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return NextResponse.json({
      success: true,
      expenses,
      total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch expenses' },
      { status: 500 }
    );
  }
}
```

**Approve Expense API:**

**File:** `src/app/api/admin/expenses/[id]/approve/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logActivity } from '@/lib/activityLogger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(request);
    const expenseId = params.id;
    
    const expense = await prisma.operationalCost.update({
      where: { id: expenseId },
      data: {
        isApproved: true,
        approvedBy: admin.id,
        approvedAt: new Date(),
        paymentStatus: 'PAID',
        paymentDate: new Date(),
      },
    });
    
    await logActivity({
      userId: admin.id,
      userName: admin.name,
      action: 'UPDATE',
      entityType: 'OperationalCost',
      entityId: expense.id,
      entityName: expense.description,
      description: `Approved expense`,
    });
    
    return NextResponse.json({
      success: true,
      expense,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve expense' },
      { status: 500 }
    );
  }
}
```

---

## Phase 4: Role-Based DTOs & Security

### 4.1 DTO Transformers

**File:** `src/utils/dtoTransformers.ts`

```typescript
import { UserRole } from '@prisma/client';

type User = {
  role: UserRole;
};

/**
 * Transform product for customer view (no cost data)
 */
export function transformProductForCustomer(product: any) {
  const {
    costPerUnit,
    basePrice,
    platformProfitPercentage,
    sellerProfit,
    calculatedProfit,
    sellerCommissionPercentage,
    ...safeProduct
  } = product;
  
  return safeProduct;
}

/**
 * Transform product for admin view (all fields)
 */
export function transformProductForAdmin(product: any) {
  return product; // Admin sees everything
}

/**
 * Transform product based on role
 */
export function transformProduct(product: any, user?: User) {
  if (!user) {
    return transformProductForCustomer(product);
  }
  
  const role = user.role;
  
  // Admin, Super Admin, Partner, Manager can see cost data
  if (['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'MANAGER'].includes(role)) {
    return transformProductForAdmin(product);
  }
  
  // Everyone else (BUYER, SELLER, GUEST) sees customer view
  return transformProductForCustomer(product);
}

/**
 * Transform order for customer (no profit data)
 */
export function transformOrderForCustomer(order: any) {
  const {
    totalCost,
    grossProfit,
    platformProfit,
    sellerProfit,
    profitMargin,
    ...safeOrder
  } = order;
  
  // Transform order items
  if (order.orderItems) {
    safeOrder.orderItems = order.orderItems.map((item: any) => {
      const {
        costPerUnit,
        profitPerUnit,
        totalProfit,
        profitMargin,
        ...safeItem
      } = item;
      return safeItem;
    });
  }
  
  return safeOrder;
}

/**
 * Transform order for admin (all fields)
 */
export function transformOrderForAdmin(order: any) {
  return order;
}

/**
 * Transform order based on role
 */
export function transformOrder(order: any, user?: User) {
  if (!user) {
    return transformOrderForCustomer(order);
  }
  
  const role = user.role;
  
  // Admin, Super Admin, Partner, Manager can see profit data
  if (['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'MANAGER'].includes(role)) {
    return transformOrderForAdmin(order);
  }
  
  return transformOrderForCustomer(order);
}

/**
 * Check if user can view cost data
 */
export function canViewCostData(user?: User): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'ADMIN', 'PARTNER', 'MANAGER'].includes(user.role);
}

/**
 * Check if user can edit cost data
 */
export function canEditCostData(user?: User): boolean {
  if (!user) return false;
  return ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
}
```

---

## Phase 5: Dashboard & Reporting

### 5.1 Financial Dashboard API

**File:** `src/app/api/admin/dashboard/financial/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'today'; // today, week, month, year
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let dateFilter: any = {};
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };
    } else {
      const now = new Date();
      switch (period) {
        case 'today':
          dateFilter = {
            createdAt: {
              gte: startOfDay(now),
              lte: endOfDay(now),
            },
          };
          break;
        case 'month':
          dateFilter = {
            createdAt: {
              gte: startOfMonth(now),
              lte: endOfMonth(now),
            },
          };
          break;
        // Add more periods as needed
      }
    }
    
    // Get completed orders for revenue and profit
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        ...dateFilter,
      },
      include: {
        orderItems: true,
        payments: {
          where: { status: 'PAID' },
        },
      },
    });
    
    // Calculate metrics
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
    const totalCOGS = completedOrders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    const grossProfit = totalRevenue - totalCOGS;
    
    // Get payments received
    const paymentsReceived = completedOrders.flatMap(o => o.payments);
    const totalPaymentsReceived = paymentsReceived.reduce((sum, p) => sum + p.amount, 0);
    
    // Get outstanding dues
    const allOrders = await prisma.order.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED'] },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      include: {
        payments: {
          where: { status: 'PAID' },
        },
      },
    });
    
    let totalDue = 0;
    for (const order of allOrders) {
      const paid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      totalDue += Math.max(0, order.total - paid);
    }
    
    // Get operational expenses
    const expenses = await prisma.operationalCost.findMany({
      where: {
        ...dateFilter,
        isApproved: true,
      },
    });
    
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Net profit
    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    // Expense breakdown by category
    const expensesByCategory = expenses.reduce((acc: any, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});
    
    // Top products by profit
    const productPerformance: any = {};
    completedOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (!productPerformance[item.productId]) {
          productPerformance[item.productId] = {
            productId: item.productId,
            totalRevenue: 0,
            totalCOGS: 0,
            totalProfit: 0,
            quantity: 0,
          };
        }
        productPerformance[item.productId].totalRevenue += item.total;
        productPerformance[item.productId].totalCOGS += (item.costPerUnit || 0) * item.quantity;
        productPerformance[item.productId].totalProfit += item.totalProfit || 0;
        productPerformance[item.productId].quantity += item.quantity;
      });
    });
    
    const topProducts = Object.values(productPerformance)
      .sort((a: any, b: any) => b.totalProfit - a.totalProfit)
      .slice(0, 10);
    
    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        totalExpenses,
        netProfit,
        netMargin,
        totalPaymentsReceived,
        totalDue,
        orderCount: completedOrders.length,
      },
      expensesByCategory,
      topProducts,
    });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
```

---

## Phase 6: Migration & Configuration

### 6.1 Prisma Migration

```bash
# Generate migration for new models
npx prisma migrate dev --name add_stock_lot_and_payment_enhancements

# Generate Prisma client
npx prisma generate
```

### 6.2 Environment Variables

Add to `.env`:

```env
# Costing Method (FIFO or WAC)
COSTING_METHOD=FIFO

# Tax Configuration
DEFAULT_TAX_RATE=0  # Percentage (e.g., 15 for 15%)
TAX_INCLUSIVE=false # Are prices tax-inclusive?

# Shipping & Charges
SHIPPING_CHARGE=0
HANDLING_CHARGE=0

# Platform Configuration
PLATFORM_PROFIT_PERCENTAGE=15
DEFAULT_SELLER_COMMISSION=10

# Financial Year
FISCAL_YEAR_START_MONTH=1  # January
```

---

## Key Questions Answered

### 1. Tax: Inclusive or Exclusive?
**Recommended:** Tax-exclusive (simpler for wholesale)
- Set `TAX_INCLUSIVE=false`
- Calculate: subtotal → add tax → total
- Can be configured per product via `taxRate` field

### 2. Unit Conversions
- Use existing `Unit` model (symbol-based)
- Can add conversion factors later if needed

### 3. Stock Policy
**Recommended:** Block negative stock
- Validate stock before order confirmation
- Allow backorders only with explicit flag

### 4. COGS Recognition
**Recommended:** On DELIVERED status
- Call completion API when order delivered
- Locks COGS and creates immutable profit record

### 5. Returns/Refunds
- Implemented via `processOrderReturn` service
- Restores stock and creates negative payment

### 6. Multiple Warehouses
- Schema supports via `warehouseId`
- Currently defaults to single warehouse
- Can extend later

### 7. Customer Pricing Tiers
- Already supported via `WholesaleTier` model
- Can extend with customer-specific pricing if needed

---

## Testing Strategy

### Unit Tests
- FIFO allocation logic
- WAC calculation
- Payment due calculation
- Tax calculation (inclusive/exclusive)
- Profit margin calculations

### Integration Tests
- Complete order flow with COGS
- Partial payment scenarios
- Return and refund flows
- Expense approval workflow

### Concurrency Tests
- Simultaneous stock allocation
- Race conditions on lot depletion
- Payment recording conflicts

---

## Security Checklist

- ✅ All cost data hidden from customer APIs
- ✅ Admin-only endpoints protected with `requireAdmin`
- ✅ DTOs filter data by role
- ✅ Financial ledger is append-only
- ✅ All monetary changes logged to audit trail
- ✅ Payment validation prevents overpayment
- ✅ Stock validation prevents overselling

---

## Next Steps

1. **Run migrations** to add new tables
2. **Deploy service layer** files
3. **Create admin UI** for:
   - Restock entry
   - Payment recording
   - Expense management
   - Financial dashboard
4. **Update existing order completion flow** to call fulfillment service
5. **Add tests** for critical paths
6. **Document API** endpoints for frontend team

---

## Appendix: API Endpoints Summary

### Inventory
- `POST /api/admin/inventory/restock` - Add stock lot
- `GET /api/admin/inventory/restock` - List stock lots
- `GET /api/admin/inventory/lots` - View lot details

### Payments
- `POST /api/admin/orders/[orderId]/payments` - Record payment
- `GET /api/admin/orders/[orderId]/payments` - Get payments & due
- `POST /api/admin/orders/[orderId]/refund` - Process refund

### Orders
- `POST /api/admin/orders/[orderId]/complete` - Complete delivery & finalize COGS
- `POST /api/admin/orders/[orderId]/return` - Process return

### Expenses
- `POST /api/admin/expenses` - Create expense
- `GET /api/admin/expenses` - List expenses
- `POST /api/admin/expenses/[id]/approve` - Approve expense

### Dashboard
- `GET /api/admin/dashboard/financial` - Financial metrics
- `GET /api/admin/dashboard/profit-reports` - Profit reports

---

**End of Implementation Guide**
