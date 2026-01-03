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

// GET - Get all active hero slides (public) or all slides (admin)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const isAdmin = authHeader?.startsWith('Bearer ');

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
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Create new hero slide (Admin only)
export async function POST(request: NextRequest) {
  try {
    const auth = verifyAdmin(request);
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const body = await request.json();
    const { title, subtitle, imageUrl, linkUrl, productId, buttonText, position, bgColor, textColor } = body;

    if (!title || !imageUrl) {
      return NextResponse.json(
        { error: 'Title and image URL are required' },
        { status: 400 }
      );
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
    console.error('Create Hero Slide Error:', error);
    return NextResponse.json(
      { error: 'Failed to create hero slide' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
