import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper to verify JWT and check admin role
function verifyAdmin(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { authorized: false, error: 'No authorization token' };
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { userId: string; role: string };

    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return { authorized: false, error: 'Admin access required' };
    }

    return { authorized: true, userId: decoded.userId };
  } catch {
    return { authorized: false, error: 'Invalid token' };
  }
}

// GET - Get all units
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const units = await prisma.unit.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: units,
    });
  } catch (error: any) {
    console.error('Units API Error:', error);
    
    // If table doesn't exist, return empty array instead of error
    if (error.code === 'P2021') {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch units' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new unit (Admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, symbol, description } = body;

    if (!name || !symbol) {
      return NextResponse.json(
        { success: false, error: 'Name and symbol are required' },
        { status: 400 }
      );
    }

    // Check if unit with same name or symbol already exists
    const existing = await prisma.unit.findFirst({
      where: {
        OR: [
          { name: name },
          { symbol: symbol },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Unit with this name or symbol already exists' },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        symbol,
        description: description || null,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: unit,
      message: 'Unit created successfully',
    });
  } catch (error) {
    console.error('Create Unit Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create unit' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT - Update unit (Admin only)
export async function PUT(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, symbol, description, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Unit ID is required' },
        { status: 400 }
      );
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(symbol && { symbol }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      data: unit,
      message: 'Unit updated successfully',
    });
  } catch (error) {
    console.error('Update Unit Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update unit' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete unit (Admin only)
export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Unit ID is required' },
        { status: 400 }
      );
    }

    // Check if any products are using this unit
    const productsCount = await prisma.product.count({
      where: { unit: id },
    });

    if (productsCount > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete unit. ${productsCount} product(s) are using this unit.` 
        },
        { status: 400 }
      );
    }

    await prisma.unit.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Unit deleted successfully',
    });
  } catch (error) {
    console.error('Delete Unit Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete unit' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
