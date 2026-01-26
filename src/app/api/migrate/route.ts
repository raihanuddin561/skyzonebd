import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Security: Check for authorization header
    const authHeader = request.headers.get('authorization');
    const secretKey = process.env.MIGRATION_SECRET_KEY || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${secretKey}`) {
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
    const secretKey = process.env.MIGRATION_SECRET_KEY || 'your-secret-key-here';
    
    if (authHeader !== `Bearer ${secretKey}`) {
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
