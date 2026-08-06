/**
 * GET /api/admin/partners/[id]/settlement
 *
 * Read-only final-settlement report for a partner (Amazon-style
 * gap-closure Phase 3 part 4) — total distributions ever earned, total
 * actually paid, total outstanding (approved/pending, not yet paid), and
 * whether a final settlement is due (exitDate set). This is a report, not
 * an automated payout action — any actual payment still goes through the
 * normal maker-checker-gated PATCH flow (Phase 3 part 2).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';

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
    const partner = await prisma.partner.findUnique({ where: { id } });
    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    const distributions = await prisma.profitDistribution.findMany({ where: { partnerId: id } });

    const totalEarned = distributions.reduce((sum, d) => sum + d.distributionAmount, 0);
    const totalPaid = distributions.filter((d) => d.status === 'PAID').reduce((sum, d) => sum + d.distributionAmount, 0);
    const totalOutstanding = distributions
      .filter((d) => d.status === 'PENDING' || d.status === 'APPROVED')
      .reduce((sum, d) => sum + d.distributionAmount, 0);

    const capitalEntries = await prisma.financialLedger.findMany({
      where: { sourceId: id, sourceType: { in: ['INVESTMENT', 'WITHDRAWAL'] } },
    });
    const totalContributed = capitalEntries.filter((e) => e.sourceType === 'INVESTMENT').reduce((sum, e) => sum + e.amount, 0);
    const totalWithdrawn = capitalEntries.filter((e) => e.sourceType === 'WITHDRAWAL').reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      success: true,
      data: {
        partnerId: partner.id,
        partnerName: partner.name,
        exitDate: partner.exitDate,
        finalSettlementDue: Boolean(partner.exitDate) && totalOutstanding > 0,
        distributions: {
          totalEarned,
          totalPaid,
          totalOutstanding,
          count: distributions.length,
        },
        capital: {
          totalContributed,
          totalWithdrawn,
          netContribution: totalContributed - totalWithdrawn,
        },
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error generating partner settlement report:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate settlement report' }, { status: 500 });
  }
}
