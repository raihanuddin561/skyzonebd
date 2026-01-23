import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { authenticateUser } from '@/lib/auth';

// POST - Create a new data deletion request (Customer)
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user;
    const body = await request.json();
    const { reason, confirmEmail } = body;

    // Verify email matches
    if (confirmEmail !== user.email) {
      return NextResponse.json(
        { error: 'Email confirmation does not match your account email' },
        { status: 400 }
      );
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId: user.id,
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      }
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending deletion request' },
        { status: 400 }
      );
    }

    // Get user IP and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Fetch full user details for phone
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { phone: true }
    });

    // Create deletion request
    const deletionRequest = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        phone: fullUser?.phone || 'Not provided',
        reason: reason || 'No reason provided',
        status: 'PENDING',
        ipAddress,
        userAgent,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            userType: true,
          }
        }
      }
    });

    // Create audit log entry
    await prisma.dataDeletionAuditLog.create({
      data: {
        requestId: deletionRequest.id,
        adminId: user.id, // User themselves initiated this
        action: 'CREATED',
        newStatus: 'PENDING',
        metadata: {
          reason,
          ipAddress,
          userAgent,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Data deletion request submitted successfully. We will review your request within 30 days.',
      request: deletionRequest
    });

  } catch (error) {
    console.error('❌ Error creating deletion request:', error);
    return NextResponse.json(
      { error: 'Failed to create deletion request' },
      { status: 500 }
    );
  }
}

// GET - Get user's own deletion requests
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateUser(request);

    if (!authResult.success || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const user = authResult.user;

    const requests = await prisma.dataDeletionRequest.findMany({
      where: {
        userId: user.id
      },
      orderBy: {
        requestedAt: 'desc'
      },
      include: {
        auditLogs: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      requests
    });

  } catch (error) {
    console.error('❌ Error fetching deletion requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
