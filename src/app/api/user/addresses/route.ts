// app/api/user/addresses/route.ts - Address Management

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/user/addresses
 * Get all addresses for current user
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

    const addresses = await prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      addresses
    });

  } catch (error) {
    console.error('Error fetching addresses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/addresses
 * Create new address for current user
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user from JWT token
    const user = await requireAuth(request);
    const userId = user.id;

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

    // Validate required fields
    if (!street || !city || !country) {
      return NextResponse.json(
        { success: false, error: 'Street, city, and country are required' },
        { status: 400 }
      );
    }

    // If this address is being set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId,
          isDefault: true 
        },
        data: { isDefault: false }
      });
    }

    // Check if this is the first address, make it default automatically
    const addressCount = await prisma.address.count({
      where: { userId }
    });

    const shouldBeDefault = isDefault || addressCount === 0;

    // Create new address
    const address = await prisma.address.create({
      data: {
        userId,
        type: type || 'SHIPPING',
        street,
        city,
        state,
        postalCode,
        country: country || 'Bangladesh',
        isDefault: shouldBeDefault
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Address added successfully',
      address
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create address' },
      { status: 500 }
    );
  }
}
