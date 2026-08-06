/**
 * POST /api/admin/partners/[id]/contributions
 *
 * Records an additional capital contribution or withdrawal for a partner
 * after creation (Amazon-style gap-closure Phase 3 part 3). Every capital
 * event after the initial investment (recorded at partner creation) is a
 * real FinancialLedger entry, not a Partner.initialInvestment field edit —
 * per the roadmap's explicit intent to make capital events auditable.
 *
 * Body: { amount: number, direction: 'INVESTMENT' | 'WITHDRAWAL', notes?: string }
 * GET lists this partner's capital-event history (from the ledger).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { createCapitalEntry } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const entries = await prisma.financialLedger.findMany({
      where: { sourceId: id, sourceType: { in: ['INVESTMENT', 'WITHDRAWAL'] } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching partner contributions:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch contributions' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { amount, direction, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'amount must be a positive number' }, { status: 400 });
    }
    if (direction !== 'INVESTMENT' && direction !== 'WITHDRAWAL') {
      return NextResponse.json({ success: false, error: "direction must be 'INVESTMENT' or 'WITHDRAWAL'" }, { status: 400 });
    }

    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    const entry = await createCapitalEntry({
      partnerId: partner.id,
      partnerName: partner.name,
      amount: parseFloat(amount),
      direction,
      notes,
      createdBy: authUser.id,
    });

    return NextResponse.json(
      { success: true, data: entry, message: `${direction === 'INVESTMENT' ? 'Contribution' : 'Withdrawal'} recorded successfully` },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error recording partner contribution:', error);
    return NextResponse.json({ success: false, error: 'Failed to record contribution' }, { status: 500 });
  }
}
