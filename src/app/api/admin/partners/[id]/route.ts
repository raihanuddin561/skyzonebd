import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partner = await prisma.partner.findUnique({
      where: { id: params.id },
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
    console.error('Error fetching partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partner' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    } = body;

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
          NOT: { id: params.id },
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

    const partner = await prisma.partner.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Partner updated successfully',
      data: { partner },
    });
  } catch (error: any) {
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.partner.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Partner deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete partner' },
      { status: 500 }
    );
  }
}
