// app/api/user/addresses/[id]/route.ts - Single Address Operations

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/user/addresses/[id]
 * Get single address by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    const address = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId // Ensure user can only access their own addresses
      }
    });

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      address
    });

  } catch (error) {
    console.error('Error fetching address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch address' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/addresses/[id]
 * Update existing address
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    // Verify address belongs to user
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId
      }
    });

    if (!existingAddress) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      type,
      street,
      city,
      state,
      postalCode,
      country,
      isDefault
    } = body;

    // If setting as default, unset other defaults
    if (isDefault && !existingAddress.isDefault) {
      await prisma.address.updateMany({
        where: {
          userId,
          isDefault: true,
          NOT: { id: params.id }
        },
        data: { isDefault: false }
      });
    }

    // Update address
    const updatedAddress = await prisma.address.update({
      where: { id: params.id },
      data: {
        type,
        street,
        city,
        state,
        postalCode,
        country,
        isDefault
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Address updated successfully',
      address: updatedAddress
    });

  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/addresses/[id]
 * Delete an address
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId
      }
    });

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    // Delete address
    await prisma.address.delete({
      where: { id: params.id }
    });

    // If deleted address was default, set another address as default
    if (address.isDefault) {
      const firstAddress = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      if (firstAddress) {
        await prisma.address.update({
          where: { id: firstAddress.id },
          data: { isDefault: true }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Address deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/addresses/[id]/default
 * Set address as default
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: {
        id: params.id,
        userId
      }
    });

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address not found' },
        { status: 404 }
      );
    }

    // Unset all other default addresses
    await prisma.address.updateMany({
      where: {
        userId,
        isDefault: true
      },
      data: { isDefault: false }
    });

    // Set this address as default
    const updatedAddress = await prisma.address.update({
      where: { id: params.id },
      data: { isDefault: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Default address updated',
      address: updatedAddress
    });

  } catch (error) {
    console.error('Error setting default address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to set default address' },
      { status: 500 }
    );
  }
}
