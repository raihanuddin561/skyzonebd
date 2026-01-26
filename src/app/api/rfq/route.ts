import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// GET all RFQs
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'all'; // all, pending, quoted, accepted, rejected

    // Build where clause
    let whereClause: any = {};
    if (status !== 'all') {
      whereClause.status = status.toUpperCase();
    }

    const rfqs = await prisma.rFQ.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            companyName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                wholesalePrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format RFQ data
    const formattedRfqs = rfqs.map(rfq => ({
      id: rfq.id,
      rfqNumber: rfq.rfqNumber,
      customer: {
        name: rfq.user.name,
        email: rfq.user.email,
        phone: rfq.user.phone || 'N/A',
        company: rfq.user.companyName || 'N/A',
      },
      subject: rfq.subject,
      message: rfq.message,
      targetPrice: rfq.targetPrice,
      status: rfq.status,
      items: rfq.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        notes: item.notes,
        unitPrice: item.product.wholesalePrice,
        totalPrice: item.quantity * item.product.wholesalePrice,
        imageUrl: item.product.imageUrl,
      })),
      totalItems: rfq.items.length,
      totalQuantity: rfq.items.reduce((sum, item) => sum + item.quantity, 0),
      estimatedValue: rfq.items.reduce((sum, item) => 
        sum + (item.quantity * item.product.wholesalePrice), 0
      ),
      createdAt: rfq.createdAt,
      expiresAt: rfq.expiresAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedRfqs,
    });
  } catch (error) {
    console.error('Error fetching RFQs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RFQs' },
      { status: 500 }
    );
  }
}

// POST new RFQ (for customers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, subject, message, items, targetPrice } = body;

    if (!userId || !subject || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate RFQ number
    const rfqCount = await prisma.rFQ.count();
    const rfqNumber = `RFQ-${String(rfqCount + 1).padStart(6, '0')}`;

    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create RFQ with items
    const rfq = await prisma.rFQ.create({
      data: {
        rfqNumber,
        userId,
        subject,
        message,
        targetPrice,
        status: 'PENDING',
        expiresAt,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            notes: item.notes,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: rfq,
      message: `RFQ ${rfqNumber} created successfully`,
    });
  } catch (error) {
    console.error('Error creating RFQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create RFQ' },
      { status: 500 }
    );
  }
}
