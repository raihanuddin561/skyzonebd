import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { stockQuantity } = body;

    if (typeof stockQuantity !== 'number' || stockQuantity < 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid stock quantity' },
        { status: 400 }
      );
    }

    // Update product stock
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        stockQuantity,
        availability: stockQuantity === 0 
          ? 'out_of_stock' 
          : stockQuantity <= 10 
          ? 'limited' 
          : 'in_stock',
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        availability: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedProduct,
      message: `Stock updated to ${stockQuantity} for ${updatedProduct.name}`,
    });
  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stock quantity' },
      { status: 500 }
    );
  }
}
