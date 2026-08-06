import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin, isSuperAdmin } from '@/types/roles';
import { logActivity } from '@/lib/activityLogger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(
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
    const partner = await prisma.partner.findUnique({
      where: { id },
      include: {
        profitDistributions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { partner },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const {
      name,
      email,
      phone,
      profitSharePercentage,
      isActive,
      partnerType,
      address,
      taxId,
      bankAccount,
      notes,
      exitDate,
      userId, // Optional (ADR-008): link/unlink this Partner to a login account
    } = body;

    if (userId !== undefined && userId !== null) {
      const linkedUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!linkedUser) {
        return NextResponse.json(
          { success: false, error: 'No user found with the given userId' },
          { status: 400 }
        );
      }
      const alreadyLinked = await prisma.partner.findFirst({
        where: { userId, NOT: { id } },
      });
      if (alreadyLinked) {
        return NextResponse.json(
          { success: false, error: 'That user is already linked to a different partner record' },
          { status: 409 }
        );
      }
    }

    // If updating profit share, validate
    if (profitSharePercentage !== undefined) {
      if (profitSharePercentage < 0 || profitSharePercentage > 100) {
        return NextResponse.json(
          { success: false, error: 'Profit share must be between 0 and 100' },
          { status: 400 }
        );
      }

      // Check total shares (excluding current partner)
      const activePartners = await prisma.partner.findMany({
        where: {
          isActive: true,
          NOT: { id },
        },
      });

      const otherPartnersTotal = activePartners.reduce(
        (sum, p) => sum + p.profitSharePercentage,
        0
      );

      if (otherPartnersTotal + profitSharePercentage > 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Total share would exceed 100%. Other partners: ${otherPartnersTotal}%, New share: ${profitSharePercentage}%`,
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (profitSharePercentage !== undefined) updateData.profitSharePercentage = parseFloat(profitSharePercentage);
    if (isActive !== undefined) updateData.isActive = isActive;
    if (partnerType !== undefined) updateData.partnerType = partnerType;
    if (address !== undefined) updateData.address = address;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (notes !== undefined) updateData.notes = notes;
    if (exitDate !== undefined) updateData.exitDate = exitDate ? new Date(exitDate) : null;
    if (userId !== undefined) updateData.userId = userId || null;

    // Capture the pre-update value so an ownership-percentage change can
    // be logged old -> new (Amazon-style gap-closure Phase 3 part 3) —
    // profitSharePercentage edits previously had zero audit trail despite
    // being the basis for every partner's payout.
    const previousPartner = profitSharePercentage !== undefined
      ? await prisma.partner.findUnique({ where: { id }, select: { profitSharePercentage: true } })
      : null;

    const partner = await prisma.partner.update({
      where: { id },
      data: updateData,
    });

    if (previousPartner && previousPartner.profitSharePercentage !== partner.profitSharePercentage) {
      await logActivity({
        userId: authUser.id,
        userName: authUser.name,
        action: 'UPDATE',
        entityType: 'Partner',
        entityId: partner.id,
        entityName: partner.name,
        description: `Changed ${partner.name}'s profit share from ${previousPartner.profitSharePercentage}% to ${partner.profitSharePercentage}%`,
        metadata: { field: 'profitSharePercentage', oldValue: previousPartner.profitSharePercentage, newValue: partner.profitSharePercentage },
        request,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Partner updated successfully',
      data: { partner },
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error updating partner:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update partner' },
      { status: 500 }
    );
  }
}

// Deleting a partner is irreversible and erases their profit-share history,
// so this is restricted to super admin (matching the same destructive-action
// tiering used for bulk user deletion in /api/admin/users, and for
// manual-sales deletion elsewhere in the admin surface).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth(request);
    if (!isSuperAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Super admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    await prisma.partner.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Partner deleted successfully',
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete partner' },
      { status: 500 }
    );
  }
}
