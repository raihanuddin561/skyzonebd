import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, phone, reason } = body;

    // Validate required fields
    if (!email || !phone) {
      return NextResponse.json(
        { error: 'Email and phone number are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Check if there's already a pending deletion request
    const existingRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending deletion request' },
        { status: 409 }
      );
    }

    // Create deletion request
    const deletionRequest = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        phone: phone,
        reason: reason || null,
        status: 'PENDING',
        requestedAt: new Date(),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    });

    // TODO: Send email notification to user (implement later)
    // TODO: Send notification to admin (implement later)

    console.log('✅ Data deletion request created:', {
      requestId: deletionRequest.id,
      userId: user.id,
      email: user.email,
      status: 'PENDING',
    });

    return NextResponse.json({
      success: true,
      message: 'Data deletion request submitted successfully',
      data: {
        requestId: deletionRequest.id,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt,
      },
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating data deletion request:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit deletion request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET endpoint to check deletion request status (optional, for user to track)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found' },
        { status: 404 }
      );
    }

    const deletionRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      select: {
        id: true,
        status: true,
        requestedAt: true,
        processedAt: true,
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });

    if (!deletionRequest) {
      return NextResponse.json({
        hasPendingRequest: false,
        message: 'No pending deletion requests found',
      });
    }

    return NextResponse.json({
      hasPendingRequest: true,
      request: {
        id: deletionRequest.id,
        status: deletionRequest.status,
        requestedAt: deletionRequest.requestedAt,
        processedAt: deletionRequest.processedAt,
      },
    });

  } catch (error) {
    console.error('❌ Error checking deletion request status:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
