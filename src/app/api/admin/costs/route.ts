// app/api/admin/costs/route.ts - Operational Costs Management API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/middleware/permissionMiddleware';

/**
 * GET /api/admin/costs
 * Get all operational costs with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'COSTS_VIEW', 'view');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const where: any = {};
    
    if (category) where.category = category;
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (status) where.paymentStatus = status;
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }
    
    const costs = await prisma.operationalCost.findMany({
      where,
      orderBy: { date: 'desc' }
    });
    
    // Calculate totals by category
    const totalByCategory = costs.reduce((acc, cost) => {
      if (!acc[cost.category]) {
        acc[cost.category] = 0;
      }
      acc[cost.category] += cost.amount;
      return acc;
    }, {} as Record<string, number>);
    
    const totalAmount = costs.reduce((sum, cost) => sum + cost.amount, 0);
    
    return NextResponse.json({
      success: true,
      data: {
        costs,
        summary: {
          totalAmount,
          totalByCategory,
          count: costs.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/costs
 * Create new operational cost entry
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'COSTS_MANAGE', 'create');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const body = await request.json();
    
    const date = body.date ? new Date(body.date) : new Date();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    
    const cost = await prisma.operationalCost.create({
      data: {
        category: body.category,
        subCategory: body.subCategory,
        description: body.description,
        amount: parseFloat(body.amount),
        date,
        month,
        year,
        paymentStatus: body.paymentStatus || 'PENDING',
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        paymentMethod: body.paymentMethod,
        paymentReference: body.paymentReference,
        vendor: body.vendor,
        vendorContact: body.vendorContact,
        isApproved: body.isApproved || false,
        approvedBy: body.approvedBy,
        approvedAt: body.approvedAt ? new Date(body.approvedAt) : null,
        isRecurring: body.isRecurring || false,
        recurringPeriod: body.recurringPeriod,
        notes: body.notes,
        attachmentUrl: body.attachmentUrl
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Cost entry created successfully',
      data: cost
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating cost:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create cost entry',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
