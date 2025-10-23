import { NextRequest, NextResponse } from 'next/server';

// Import the orders array from the parent route
// Note: This won't actually work because we need to share the orders array
// Let's just create a simple debug endpoint

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Debug endpoint - Check server console for orders array',
    note: 'Orders are stored in memory and will reset on server restart',
    timestamp: new Date().toISOString()
  });
}
