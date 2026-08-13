/**
 * PATCH /api/reviews/[id]
 * Record a "helpful" / "not helpful" vote on a review.
 *
 * The ReviewCard/ReviewList UI already renders Yes/No helpfulness buttons
 * and displays helpfulCount/notHelpfulCount, but nothing ever called this
 * endpoint before — the buttons were dead (no onHelpful/onNotHelpful prop
 * was ever passed, so clicking them silently did nothing).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(request);

    const { id } = await params;
    const { vote } = await request.json();

    if (vote !== 'helpful' && vote !== 'not_helpful') {
      return NextResponse.json(
        { success: false, error: 'vote must be "helpful" or "not_helpful"' },
        { status: 400 }
      );
    }

    const review = await prisma.review.update({
      where: { id },
      data: vote === 'helpful'
        ? { helpfulCount: { increment: 1 } }
        : { notHelpfulCount: { increment: 1 } },
      select: { id: true, helpfulCount: true, notHelpfulCount: true },
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error recording review vote:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record vote' },
      { status: 500 }
    );
  }
}
