import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { response, quotedPrice, status } = body;

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response message is required' },
        { status: 400 }
      );
    }

    // Update RFQ status
    const updatedRfq = await prisma.rFQ.update({
      where: { id },
      data: {
        status: status || 'QUOTED',
        // Note: In a full implementation, you'd store the response and quoted price
        // in a separate RFQResponse table. For now, we'll just update the status.
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // In a production app, you would:
    // 1. Send email to customer with the quote
    // 2. Create a notification entry
    // 3. Store the response in a RFQResponse table

    return NextResponse.json({
      success: true,
      data: updatedRfq,
      message: `Response sent to ${updatedRfq.user.name}`,
    });
  } catch (error) {
    console.error('Error responding to RFQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send response' },
      { status: 500 }
    );
  }
}
