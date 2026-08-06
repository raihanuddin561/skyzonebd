import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { emailService } from '@/lib/email';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// Responding to (quoting) an RFQ is a staff action — only admins may do it.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { response, quotedPrice, status } = body;

    if (!response) {
      return NextResponse.json(
        { success: false, error: 'Response message is required' },
        { status: 400 }
      );
    }

    // Update RFQ status and persist the actual quote — previously this
    // route accepted `response`/`quotedPrice` and only ever wrote `status`,
    // silently discarding the admin's quote.
    const updatedRfq = await prisma.rFQ.update({
      where: { id },
      data: {
        status: status || 'QUOTED',
        quotedPrice: quotedPrice ?? null,
        responseMessage: response,
        respondedBy: authUser.id,
        respondedAt: new Date(),
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

    // Best-effort notification email — a failure here must never fail a
    // quote that already committed to the database.
    const emailResult = await emailService.sendRFQQuote(
      updatedRfq.user.email,
      updatedRfq.rfqNumber,
      updatedRfq.quotedPrice,
      response
    );
    if (!emailResult.success) {
      console.error(`RFQ quote email failed for ${updatedRfq.user.email}: ${emailResult.error}`);
    }

    return NextResponse.json({
      success: true,
      data: updatedRfq,
      message: `Response sent to ${updatedRfq.user.name}`,
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error responding to RFQ:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send response' },
      { status: 500 }
    );
  }
}
