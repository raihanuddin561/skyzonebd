import { NextRequest, NextResponse } from 'next/server'
import { prisma, testConnection } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function GET(request: NextRequest) {
  try {
    // Require admin authentication (DB-verified role/isActive, not a raw JWT claim)
    await requireAdmin(request);

    // Test database connection
    const isConnected = await testConnection()
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Database connection failed',
          database: 'sagor_db',
          status: 'disconnected'
        },
        { status: 500 }
      )
    }

    // Get database statistics
    const userCount = await prisma.user.count()
    const productCount = await prisma.product.count()
    const categoryCount = await prisma.category.count()
    const orderCount = await prisma.order.count()
    
    // Get active/inactive product counts
    const activeProducts = await prisma.product.count({ where: { isActive: true } })
    const inactiveProducts = await prisma.product.count({ where: { isActive: false } })

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      database: 'sagor_db',
      status: 'connected',
      statistics: {
        users: userCount,
        products: productCount,
        activeProducts,
        inactiveProducts,
        categories: categoryCount,
        orders: orderCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Database status check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        database: 'sagor_db',
        status: 'error'
      },
      { status: 500 }
    )
  }
}