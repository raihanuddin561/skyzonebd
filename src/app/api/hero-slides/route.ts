import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, authenticateUser } from '@/lib/auth';
import { UserRole, isAdmin as isAdminRole } from '@/types/roles';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET - Get all active hero slides (public) or all slides (admin)
export async function GET(request: NextRequest) {
  try {
    // Publicly accessible route — anonymous storefront visitors must still
    // get the active slides. Only a REAL, signature-verified admin token
    // (not merely "any string after Bearer") unlocks inactive/draft slides.
    const authResult = await authenticateUser(request);
    const isAdmin = authResult.success && !!authResult.user && isAdminRole(authResult.user.role as UserRole);

    const slides = await prisma.heroSlide.findMany({
      where: isAdmin ? {} : { isActive: true },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            imageUrl: true,
            wholesalePrice: true,
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    });

    return NextResponse.json({
      success: true,
      data: slides
    });
  } catch (error) {
    console.error('Get Hero Slides Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hero slides' },
      { status: 500 }
    );
  }
}

// POST - Create new hero slide (Admin only)
export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { title, subtitle, imageUrl, linkUrl, productId, buttonText, position, bgColor, textColor } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: 'Title and image URL are required' },
        { status: 400 }
      );
    }

    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product ${productId} not found` },
          { status: 400 }
        );
      }
    }

    const slide = await prisma.heroSlide.create({
      data: {
        title,
        subtitle,
        imageUrl,
        linkUrl,
        productId,
        buttonText: buttonText || 'Shop Now',
        position: position || 0,
        bgColor: bgColor || '#3B82F6',
        textColor: textColor || '#FFFFFF',
        isActive: body.isActive !== undefined ? body.isActive : true,
      },
      include: {
        product: true
      }
    });

    return NextResponse.json({
      success: true,
      data: slide,
      message: 'Hero slide created successfully'
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Create Hero Slide Error:', error);
    return NextResponse.json(
      { error: 'Failed to create hero slide' },
      { status: 500 }
    );
  }
}
