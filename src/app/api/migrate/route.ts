import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { timingSafeEqual } from 'crypto';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


const execAsync = promisify(exec);

// Fails closed if MIGRATION_SECRET_KEY is unset — never fall back to a
// literal (the same "your-secret-key-here" placeholder is published in
// .env.example and in this project's own security documentation, so a
// fallback here would be a publicly-known bearer token granting anyone the
// ability to trigger `prisma migrate deploy` against the live database).
// Matches lib/auth.ts's getJwtSecret() fail-closed doctrine.
function isAuthorizedMigrationRequest(authHeader: string | null): boolean {
  const secretKey = process.env.MIGRATION_SECRET_KEY;
  if (!secretKey) {
    console.error('FATAL: MIGRATION_SECRET_KEY is not set. Rejecting all requests to this endpoint until it is configured.');
    return false;
  }
  if (!authHeader) return false;
  const expected = Buffer.from(`Bearer ${secretKey}`);
  const actual = Buffer.from(authHeader);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  try {
    // Security: Check for authorization header
    const authHeader = request.headers.get('authorization');

    if (!isAuthorizedMigrationRequest(authHeader)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Run Prisma migrate deploy
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');

    return NextResponse.json({
      success: true,
      message: 'Database migrations applied successfully',
      output: stdout,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error.message,
        output: error.stdout,
        stderr: error.stderr,
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check migration status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!isAuthorizedMigrationRequest(authHeader)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check migration status
    const { stdout } = await execAsync('npx prisma migrate status');
    
    return NextResponse.json({
      success: true,
      status: stdout,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check migration status',
        details: error.message,
        output: error.stdout,
      },
      { status: 500 }
    );
  }
}
