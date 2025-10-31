import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

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

// PUT - Update hero slide (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const slide = await prisma.heroSlide.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.subtitle !== undefined && { subtitle: body.subtitle }),
        ...(body.imageUrl && { imageUrl: body.imageUrl }),
        ...(body.linkUrl !== undefined && { linkUrl: body.linkUrl }),
        ...(body.productId !== undefined && { productId: body.productId }),
        ...(body.buttonText && { buttonText: body.buttonText }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.bgColor && { bgColor: body.bgColor }),
        ...(body.textColor && { textColor: body.textColor }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
      include: {
        product: true
      }
    });

    return NextResponse.json({
      success: true,
      data: slide,
      message: 'Hero slide updated successfully'
    });
  } catch (error) {
    console.error('Update Hero Slide Error:', error);
    return NextResponse.json(
      { error: 'Failed to update hero slide' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE - Delete hero slide (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const { id } = await params;

    await prisma.heroSlide.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Hero slide deleted successfully'
    });
  } catch (error) {
    console.error('Delete Hero Slide Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete hero slide' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
