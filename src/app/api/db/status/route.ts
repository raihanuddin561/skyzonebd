import { NextRequest, NextResponse } from 'next/server'
import { prisma, testConnection } from '@/lib/db'
import { verify } from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    try {
      const decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string; role: string };
      
      if (decoded.role.toUpperCase() !== 'ADMIN' && decoded.role.toUpperCase() !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

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