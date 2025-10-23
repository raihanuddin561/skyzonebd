import { NextRequest, NextResponse } from 'next/server'
import { prisma, testConnection } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    return NextResponse.json({
      success: true,
      message: 'Database connected successfully!',
      database: 'sagor_db',
      status: 'connected',
      statistics: {
        users: userCount,
        products: productCount,
        categories: categoryCount,
        orders: orderCount
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Database status check failed:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database status check failed',
        error: error.message,
        database: 'sagor_db',
        status: 'error'
      },
      { status: 500 }
    )
  }
}