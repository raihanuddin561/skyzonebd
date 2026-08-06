/**
 * Admin Payout Management - Update Payout Status
 * PATCH /api/admin/payouts/[id]
 * 
 * Updates payout status (mark as paid/approved), add payment reference
 * GET endpoint to fetch single payout details
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { createCommissionEntry } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    
    const { id } = await params;
    
    const payout = await prisma.profitDistribution.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            profitSharePercentage: true
          }
        }
      }
    });
    
    if (!payout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: payout
    });
    
  } catch (error) {
    // requireAdmin throws a pre-built Response (401/403) on auth failure —
    // surface it as-is instead of collapsing it into a generic 500 (Phase
    // 3 part 1: found while adding auth coverage for this route, the same
    // bug class already fixed in orders/route.ts during Phase 2).
    if (error instanceof Response) {
      return error;
    }
    console.error('Get Payout Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch payout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    const admin = await requireAdmin(request);
    
    const { id } = await params;
    
    // Parse request body
    const body = await request.json();
    const { 
      status, 
      paymentMethod, 
      paymentReference, 
      notes,
      paidAt 
    } = body;
    
    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'PAID', 'REJECTED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }
    
    // Get existing payout
    const existingPayout = await prisma.profitDistribution.findUnique({
      where: { id },
      include: {
        partner: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    if (!existingPayout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }
    
    // Prepare update data
    const updateData: any = {};
    
    if (status !== undefined) {
      // Maker-checker (Amazon-style gap-closure Phase 3 part 2): PAID must
      // be reached from an already-APPROVED distribution — a distinct
      // prior action, not a shortcut the same PATCH call can also perform.
      // This does not require a different admin account than the one who
      // approved (per the confirmed scope), but it closes the previous
      // one-click "PENDING straight to PAID" unilateral path.
      if (status === 'PAID' && existingPayout.status !== 'APPROVED' && existingPayout.status !== 'PAID') {
        return NextResponse.json(
          { success: false, error: `Cannot mark as PAID: distribution must be APPROVED first (current status: ${existingPayout.status})` },
          { status: 400 }
        );
      }

      updateData.status = status;

      // If approving, set approver and approval date
      if (status === 'APPROVED' && existingPayout.status === 'PENDING') {
        updateData.approvedBy = admin.id;
        updateData.approvedAt = new Date();
      }

      // If marking as paid, set paid date and who paid it
      if (status === 'PAID') {
        updateData.paidAt = paidAt ? new Date(paidAt) : new Date();
        updateData.paidBy = admin.id;
      }

      // If rejecting, clear approval
      if (status === 'REJECTED') {
        updateData.approvedBy = null;
        updateData.approvedAt = null;
        updateData.paidBy = null;
        updateData.paidAt = null;
      }
    }
    
    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
    }
    
    if (paymentReference !== undefined) {
      updateData.paymentReference = paymentReference;
    }
    
    if (notes !== undefined) {
      // Append to existing notes
      const existingNotes = existingPayout.notes || '';
      const timestamp = new Date().toISOString();
      updateData.notes = existingNotes 
        ? `${existingNotes}\n\n[${timestamp}] ${notes}`
        : `[${timestamp}] ${notes}`;
    }
    
    // Update payout
    const updatedPayout = await prisma.profitDistribution.update({
      where: { id },
      data: updateData,
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            profitSharePercentage: true
          }
        }
      }
    });

    // Only post to the ledger / increment the partner's running total on
    // the actual ... -> PAID transition, not on a repeat PATCH against an
    // already-paid payout (Amazon-style gap-closure Phase 2 part 1:
    // ledger completeness; Phase 3 part 1: this route is now the sole
    // canonical payout-status path — admin/distributions/route.ts, the
    // only other place that ever incremented totalProfitReceived, was
    // dead code with zero UI callers and has been removed).
    if (status === 'PAID' && existingPayout.status !== 'PAID') {
      await createCommissionEntry({
        id: updatedPayout.id,
        partnerId: updatedPayout.partnerId,
        partnerName: updatedPayout.partner?.name,
        distributionAmount: updatedPayout.distributionAmount,
      });
      await prisma.partner.update({
        where: { id: updatedPayout.partnerId },
        data: { totalProfitReceived: { increment: updatedPayout.distributionAmount } },
      });
    }

    // TODO: Send notification to partner if status changed to PAID or APPROVED

    return NextResponse.json({
      success: true,
      data: updatedPayout,
      message: `Payout ${status ? `marked as ${status}` : 'updated'} successfully`
    });
    
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Update Payout Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update payout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin
    await requireAdmin(request);
    
    const { id } = await params;
    
    // Check if payout exists and is not paid
    const existingPayout = await prisma.profitDistribution.findUnique({
      where: { id }
    });
    
    if (!existingPayout) {
      return NextResponse.json(
        { success: false, error: 'Payout not found' },
        { status: 404 }
      );
    }
    
    if (existingPayout.status === 'PAID') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete a paid payout' },
        { status: 400 }
      );
    }
    
    // Delete payout
    await prisma.profitDistribution.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Payout deleted successfully'
    });
    
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Delete Payout Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete payout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
