import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT and check admin role
function verifyAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token', userId: null };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: string };

    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required', userId: null };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token', userId: null };
  }
}

// GET - Get customer-specific pricing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id: customerId } = await params;

    // Get all custom pricing for this customer
    const customerPricing = await prisma.customerPricing.findMany({
      where: {
        userId: customerId,
        isActive: true
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            wholesalePrice: true,
            sku: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: customerPricing.map(cp => ({
        id: cp.id,
        productId: cp.productId,
        productName: cp.product.name,
        productImage: cp.product.imageUrl,
        sku: cp.product.sku,
        standardPrice: cp.product.wholesalePrice,
        customPrice: cp.customPrice,
        discountPercent: cp.discountPercent,
        savings: cp.product.wholesalePrice - cp.customPrice,
        notes: cp.notes,
        validFrom: cp.validFrom,
        validUntil: cp.validUntil,
        isActive: cp.isActive,
        createdAt: cp.createdAt
      }))
    });

  } catch (error) {
    console.error('Get Customer Pricing Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch customer pricing' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create customer-specific pricing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id: customerId } = await params;
    const body = await request.json();
    const { productId, customPrice, discountPercent, notes, validUntil } = body;

    // Validate required fields
    if (!productId || typeof customPrice !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Product ID and custom price are required' },
        { status: 400 }
      );
    }

    if (customPrice < 0) {
      return NextResponse.json(
        { success: false, error: 'Price cannot be negative' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.user.findUnique({
      where: { id: customerId }
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if pricing already exists
    const existingPricing = await prisma.customerPricing.findUnique({
      where: {
        userId_productId: {
          userId: customerId,
          productId: productId
        }
      }
    });

    let customerPricing;

    if (existingPricing) {
      // Update existing pricing
      customerPricing = await prisma.customerPricing.update({
        where: { id: existingPricing.id },
        data: {
          customPrice,
          discountPercent,
          notes,
          validUntil: validUntil ? new Date(validUntil) : null,
          isActive: true,
          updatedAt: new Date()
        },
        include: {
          product: {
            select: {
              name: true,
              wholesalePrice: true
            }
          }
        }
      });
    } else {
      // Create new pricing
      customerPricing = await prisma.customerPricing.create({
        data: {
          userId: customerId,
          productId,
          customPrice,
          discountPercent,
          notes,
          validUntil: validUntil ? new Date(validUntil) : null,
          createdBy: auth.userId!,
        },
        include: {
          product: {
            select: {
              name: true,
              wholesalePrice: true
            }
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customerPricing.id,
        productId: customerPricing.productId,
        productName: customerPricing.product.name,
        standardPrice: customerPricing.product.wholesalePrice,
        customPrice: customerPricing.customPrice,
        savings: customerPricing.product.wholesalePrice - customerPricing.customPrice,
        notes: customerPricing.notes,
        validUntil: customerPricing.validUntil
      },
      message: existingPricing ? 'Custom pricing updated' : 'Custom pricing created'
    });

  } catch (error) {
    console.error('Create Customer Pricing Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create customer pricing' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Remove customer-specific pricing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 });
    }

    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);
    const pricingId = searchParams.get('pricingId');

    if (!pricingId) {
      return NextResponse.json(
        { success: false, error: 'Pricing ID is required' },
        { status: 400 }
      );
    }

    // Deactivate instead of delete (for audit trail)
    await prisma.customerPricing.update({
      where: { id: pricingId },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Custom pricing removed'
    });

  } catch (error) {
    console.error('Delete Customer Pricing Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove customer pricing' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
