/**
 * PATCH /api/reviews/[id]
 * Record a "helpful" / "not helpful" vote on a review.
 *
 * The ReviewCard/ReviewList UI already renders Yes/No helpfulness buttons
 * and displays helpfulCount/notHelpfulCount, but nothing ever called this
 * endpoint before — the buttons were dead (no onHelpful/onNotHelpful prop
 * was ever passed, so clicking them silently did nothing).
 *
 * A per-user ReviewVote row now backs this (previously it was a bare
 * `increment: 1` with no record of who had voted — only a client-side,
 * refresh-resettable guard — so the same user, or a script hitting this
 * endpoint directly, could vote unlimited times and arbitrarily inflate a
 * review's helpfulness score). Casting the same vote again is a no-op;
 * switching from one vote to the other moves the count between buckets.
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
    const authUser = await requireAuth(request);

    const { id } = await params;
    const { vote } = await request.json();

    if (vote !== 'helpful' && vote !== 'not_helpful') {
      return NextResponse.json(
        { success: false, error: 'vote must be "helpful" or "not_helpful"' },
        { status: 400 }
      );
    }
    const isHelpful = vote === 'helpful';

    const review = await prisma.$transaction(async (tx) => {
      const existingVote = await tx.reviewVote.findUnique({
        where: { reviewId_userId: { reviewId: id, userId: authUser.id } },
      });

      if (existingVote && existingVote.vote === isHelpful) {
        // Same vote cast again (e.g. a double-click) — no-op.
        return tx.review.findUniqueOrThrow({
          where: { id },
          select: { id: true, helpfulCount: true, notHelpfulCount: true },
        });
      }

      if (existingVote) {
        // Switching vote — move the count from one bucket to the other.
        await tx.reviewVote.update({
          where: { id: existingVote.id },
          data: { vote: isHelpful },
        });
        return tx.review.update({
          where: { id },
          data: isHelpful
            ? { helpfulCount: { increment: 1 }, notHelpfulCount: { decrement: 1 } }
            : { notHelpfulCount: { increment: 1 }, helpfulCount: { decrement: 1 } },
          select: { id: true, helpfulCount: true, notHelpfulCount: true },
        });
      }

      // First vote from this user on this review.
      await tx.reviewVote.create({
        data: { reviewId: id, userId: authUser.id, vote: isHelpful },
      });
      return tx.review.update({
        where: { id },
        data: isHelpful
          ? { helpfulCount: { increment: 1 } }
          : { notHelpfulCount: { increment: 1 } },
        select: { id: true, helpfulCount: true, notHelpfulCount: true },
      });
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
