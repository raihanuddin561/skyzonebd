import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


// In-memory rate limiting (simple dev fallback)
const requestCache = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // Max 3 requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): { allowed: boolean; error?: string } {
  const now = Date.now();
  const cached = requestCache.get(userId);

  if (cached && now < cached.resetTime) {
    if (cached.count >= RATE_LIMIT) {
      return { allowed: false, error: 'Rate limit exceeded. Please try again later.' };
    }
    cached.count++;
    return { allowed: true };
  }

  // Reset or initialize
  requestCache.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
  return { allowed: true };
}

/**
 * POST /api/data-deletion-requests
 * User creates a new data deletion request
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth(request);

    // Rate limiting
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    // Parse request body
    const body = await request.json();
    const { reason, phone } = body;

    // Validate reason
    if (!reason || reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'Reason is required and must be at least 10 characters' },
        { status: 400 }
      );
    }

    // Check for existing pending request
    const existingRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending deletion request' },
        { status: 400 }
      );
    }

    // Capture client info
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create deletion request
    const deletionRequest = await prisma.dataDeletionRequest.create({
      data: {
        userId: user.id,
        email: user.email,
        phone: phone || '',
        reason: reason.trim(),
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
          },
        },
      },
    });

    // Create audit log
    await prisma.dataDeletionAuditLog.create({
      data: {
        requestId: deletionRequest.id,
        adminId: user.id, // User who created it
        action: 'CREATED',
        newStatus: 'PENDING',
        metadata: { reason, ipAddress, userAgent },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Data deletion request submitted successfully',
      request: deletionRequest,
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating deletion request:', error);
    
    // Handle Response throws from requireAuth
    if (error instanceof Response) {
      return error;
    }

    return NextResponse.json(
      { error: 'Failed to create deletion request' },
      { status: 500 }
    );
  }
}
