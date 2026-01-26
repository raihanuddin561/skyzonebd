import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const partnerId = searchParams.get('partnerId');
    const status = searchParams.get('status');
    const periodType = searchParams.get('periodType');

    const where: any = {};
    if (partnerId) where.partnerId = partnerId;
    if (status) where.status = status;
    if (periodType) where.periodType = periodType;

    const distributions = await prisma.profitDistribution.findMany({
      where,
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            profitSharePercentage: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const summary = {
      total: distributions.length,
      totalAmount: distributions.reduce((sum, d) => sum + d.distributionAmount, 0),
      pending: distributions.filter(d => d.status === 'PENDING').length,
      approved: distributions.filter(d => d.status === 'APPROVED').length,
      paid: distributions.filter(d => d.status === 'PAID').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        distributions,
        summary,
      },
    });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch distributions' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approvedBy, paymentMethod, paymentReference, notes } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Distribution ID and status are required' },
        { status: 400 }
      );
    }

    const updateData: any = { status };

    if (status === 'APPROVED') {
      updateData.approvedAt = new Date();
      if (approvedBy) updateData.approvedBy = approvedBy;
    }

    if (status === 'PAID') {
      updateData.paidAt = new Date();
      if (paymentMethod) updateData.paymentMethod = paymentMethod;
      if (paymentReference) updateData.paymentReference = paymentReference;

      // Update partner's totalProfitReceived
      const distribution = await prisma.profitDistribution.findUnique({
        where: { id },
      });

      if (distribution) {
        await prisma.partner.update({
          where: { id: distribution.partnerId },
          data: {
            totalProfitReceived: {
              increment: distribution.distributionAmount,
            },
          },
        });
      }
    }

    if (notes) updateData.notes = notes;

    const updated = await prisma.profitDistribution.update({
      where: { id },
      data: updateData,
      include: {
        partner: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Distribution updated successfully',
      data: { distribution: updated },
    });
  } catch (error) {
    console.error('Error updating distribution:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update distribution' },
      { status: 500 }
    );
  }
}
