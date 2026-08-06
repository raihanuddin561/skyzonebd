import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// DELETE a product from the authenticated user's wishlist. Idempotent —
// removing a product that isn't wishlisted (or removing from a user with no
// wishlist row yet) succeeds as a no-op rather than 404ing, matching the
// client's fire-and-forget optimistic-removal usage.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    const { productId } = await params;

    const wishlist = await prisma.wishlist.findUnique({
      where: { userId: authUser.id },
    });

    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id, productId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from wishlist' },
      { status: 500 }
    );
  }
}
