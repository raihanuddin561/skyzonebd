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

// PATCH - Update customer discount
export async function PATCH(
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
    const { discountPercent, discountReason, discountValidUntil } = body;

    // Validate discount percent
    if (typeof discountPercent !== 'number' || discountPercent < 0 || discountPercent > 100) {
      return NextResponse.json(
        { success: false, error: 'Discount percent must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customerExists = await prisma.user.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true }
    });

    if (!customerExists) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Update customer discount
    const updatedCustomer = await prisma.user.update({
      where: { id: customerId },
      data: {
        discountPercent: discountPercent,
        discountReason: discountReason || null,
        discountValidUntil: discountValidUntil ? new Date(discountValidUntil) : null,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        discountPercent: true,
        discountReason: true,
        discountValidUntil: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: auth.userId!,
        userName: 'Admin',
        action: 'UPDATE',
        entityType: 'CustomerDiscount',
        entityId: customerId,
        entityName: updatedCustomer.name,
        description: `Updated customer discount to ${discountPercent}% for ${updatedCustomer.name}`,
        metadata: {
          discountPercent: discountPercent,
          reason: discountReason,
          validUntil: discountValidUntil
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedCustomer.id,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        discountPercent: updatedCustomer.discountPercent,
        discountReason: updatedCustomer.discountReason,
        discountValidUntil: updatedCustomer.discountValidUntil
      },
      message: `Customer discount ${discountPercent > 0 ? 'updated' : 'removed'} successfully`
    });

  } catch (error) {
    console.error('Update Customer Discount Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update customer discount' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
