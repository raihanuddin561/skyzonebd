import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canOverridePercentage, requireAdmin } from '@/lib/permissions';
import { UserRole } from '@/types/roles';
import { createCapitalEntry } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authUser = await requireAuth(request);
    
    // Check if user has permission to view partners
    if (!requireAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (isActive !== null) {
      where.isActive = isActive === 'true';
    }

    const partners = await prisma.partner.findMany({
      where,
      include: {
        profitDistributions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total active share percentage
    const totalActiveShare = partners
      .filter(p => p.isActive)
      .reduce((sum, p) => sum + p.profitSharePercentage, 0);

    return NextResponse.json({
      success: true,
      data: {
        partners,
        summary: {
          total: partners.length,
          active: partners.filter(p => p.isActive).length,
          totalActiveShare,
          remainingShare: 100 - totalActiveShare,
        },
      },
      userRole: authUser.role,
      canOverride: canOverridePercentage(authUser.role as UserRole)
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authUser = await requireAuth(request);
    
    // Check if user has permission to manage partners
    if (!requireAdmin(authUser.role as UserRole)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      profitSharePercentage,
      partnerType,
      initialInvestment,
      address,
      taxId,
      bankAccount,
      notes,
      userId, // Optional (ADR-008): link this Partner to an existing login account
      overrideLimit, // Super admin can force override
    } = body;

    if (userId) {
      const linkedUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!linkedUser) {
        return NextResponse.json(
          { success: false, error: 'No user found with the given userId' },
          { status: 400 }
        );
      }
      const alreadyLinked = await prisma.partner.findUnique({ where: { userId } });
      if (alreadyLinked) {
        return NextResponse.json(
          { success: false, error: 'That user is already linked to a different partner record' },
          { status: 409 }
        );
      }
    }

    // Validate required fields
    if (!name || profitSharePercentage === undefined) {
      return NextResponse.json(
        { success: false, error: 'Name and profit share percentage are required' },
        { status: 400 }
      );
    }

    // Validate percentage range
    if (profitSharePercentage < 0 || profitSharePercentage > 100) {
      return NextResponse.json(
        { success: false, error: 'Profit share must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Check total active shares
    const activePartners = await prisma.partner.findMany({
      where: { isActive: true },
    });

    const currentTotalShare = activePartners.reduce(
      (sum, p) => sum + p.profitSharePercentage,
      0
    );

    const newTotal = currentTotalShare + profitSharePercentage;

    // Super admin can override percentage limit
    const isSuperAdmin = canOverridePercentage(authUser.role as UserRole);
    
    if (newTotal > 100 && !isSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: `Total share would exceed 100%. Current: ${currentTotalShare.toFixed(1)}%, Adding: ${profitSharePercentage}%. Total: ${newTotal.toFixed(1)}%`,
          suggestion: 'Contact super admin to override this limit.'
        },
        { status: 400 }
      );
    }

    // Warning if exceeding 100% but super admin is overriding
    const warning = newTotal > 100 && isSuperAdmin 
      ? `Warning: Total share is ${newTotal.toFixed(1)}% (Super admin override applied)`
      : undefined;

    const parsedInitialInvestment = initialInvestment ? parseFloat(initialInvestment) : null;

    const partner = await prisma.partner.create({
      data: {
        name,
        email,
        phone,
        profitSharePercentage: parseFloat(profitSharePercentage),
        partnerType,
        initialInvestment: parsedInitialInvestment,
        address,
        taxId,
        bankAccount,
        notes,
        userId: userId || null,
      },
    });

    // Record the starting capital as a real ledger event (Amazon-style
    // gap-closure Phase 3 part 3) — Partner.initialInvestment itself is
    // never edited again after this; any further capital event goes
    // through POST /api/admin/partners/[id]/contributions instead.
    if (parsedInitialInvestment && parsedInitialInvestment > 0) {
      await createCapitalEntry({
        partnerId: partner.id,
        partnerName: partner.name,
        amount: parsedInitialInvestment,
        direction: 'INVESTMENT',
        notes: 'Initial investment at partner creation',
        createdBy: authUser.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Partner created successfully',
      data: { partner },
      warning,
      totalShare: newTotal,
      isSuperAdminOverride: newTotal > 100
    });
  } catch (error: any) {
    console.error('Error creating partner:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}
