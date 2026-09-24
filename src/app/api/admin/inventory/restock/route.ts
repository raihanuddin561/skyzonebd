/**
 * Stock Restock API
 * POST: Add new stock lot (restock product)
 * GET: List all stock lots with filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { addStockLot, getProductStockLots } from '@/services/inventoryService';
import { logActivity } from '@/lib/activityLogger';
import { prisma } from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * POST /api/admin/inventory/restock
 * Add stock lot (restock entry)
 */
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
    if (!productId || quantity === undefined || quantity === null || costPerUnit === undefined || costPerUnit === null) {
      return NextResponse.json(
        { error: 'Product ID, quantity, and cost per unit are required' },
        { status: 400 }
      );
    }

    // Coerce once, up front, and require the result to be a real finite
    // number — quantity/costPerUnit <= 0 on a non-numeric value (e.g. "abc")
    // evaluates to NaN <= 0, which is false, so a malformed value used to
    // sail past this check and only turn into NaN later at parseInt/
    // parseFloat time, silently corrupting Product.stockQuantity and the
    // new StockLot's quantity/cost fields with NaN.
    const quantityNum = typeof quantity === 'number' ? quantity : parseInt(quantity, 10);
    const costPerUnitNum = typeof costPerUnit === 'number' ? costPerUnit : parseFloat(costPerUnit);

    if (!Number.isFinite(quantityNum) || !Number.isFinite(costPerUnitNum)) {
      return NextResponse.json(
        { error: 'Quantity and cost per unit must be valid numbers' },
        { status: 400 }
      );
    }

    if (quantityNum <= 0 || costPerUnitNum <= 0) {
      return NextResponse.json(
        { error: 'Quantity and cost must be positive numbers' },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, sku: true },
    });
    
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }
    
    // Create stock lot
    const stockLot = await addStockLot({
      productId,
      quantity: quantityNum,
      costPerUnit: costPerUnitNum,
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
      description: `Added stock lot: ${quantityNum} units of ${product.name} at ${costPerUnitNum} per unit`,
      metadata: {
        productId,
        productName: product.name,
        quantity: quantityNum,
        costPerUnit: costPerUnitNum,
        totalCost: stockLot.totalCost,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Stock lot created successfully',
      stockLot,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Restock error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add stock' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/inventory/restock
 * List all stock lots with optional product filter
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const includeProduct = searchParams.get('includeProduct') === 'true';
    
    const where: any = {};
    if (productId) {
      where.productId = productId;
    }
    
    const stockLots = await prisma.stockLot.findMany({
      where,
      include: includeProduct ? {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
      } : undefined,
      orderBy: {
        purchaseDate: 'desc',
      },
    });
    
    // Calculate totals
    const totalQuantityReceived = stockLots.reduce((sum, lot) => sum + lot.quantityReceived, 0);
    const totalQuantityRemaining = stockLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);
    const totalValue = stockLots.reduce((sum, lot) => sum + lot.totalCost, 0);
    const totalRemainingValue = stockLots.reduce((sum, lot) => sum + (lot.quantityRemaining * lot.costPerUnit), 0);
    
    return NextResponse.json({
      success: true,
      stockLots,
      summary: {
        totalLots: stockLots.length,
        totalQuantityReceived,
        totalQuantityRemaining,
        totalValue,
        totalRemainingValue,
      },
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Failed to fetch stock lots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock lots' },
      { status: 500 }
    );
  }
}
