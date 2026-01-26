/**
 * Admin Financial Ledger Reconciliation API
 * POST /api/admin/financial/ledger/reconcile
 * 
 * Reconcile ledger entries and compare with orders
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { reconcileLedgerEntries } from '@/lib/financialLedger';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


export async function POST(request: NextRequest) {
  const notices: string[] = [];

  try {
    // Authenticate admin
    const adminUser = await requireAdmin(request);
    
    const body = await request.json();
    const { entryIds, action } = body;
    
    if (action === 'reconcile' && entryIds && Array.isArray(entryIds)) {
      // Mark specific entries as reconciled
      const result = await reconcileLedgerEntries(entryIds, adminUser.id);
      
      return NextResponse.json({
        success: true,
        notices: [`Successfully reconciled ${result.count} ledger entries`],
        data: {
          reconciledCount: result.count,
        },
      });
    }
    
    if (action === 'compare') {
      // Compare ledger totals with order totals for a period
      const { startDate, endDate } = body;
      
      if (!startDate || !endDate) {
        return NextResponse.json(
          {
            success: false,
            error: 'Start date and end date are required for comparison',
            notices: ['Missing date range'],
          },
          { status: 400 }
        );
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Get ledger totals
      const ledgerEntries = await prisma.financialLedger.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      });
      
      const ledgerRevenue = ledgerEntries
        .filter(e => e.sourceType === 'ORDER' && e.direction === 'CREDIT')
        .reduce((sum, e) => sum + e.amount, 0);
      
      const ledgerCOGS = ledgerEntries
        .filter(e => e.sourceType === 'ORDER' && e.direction === 'DEBIT')
        .reduce((sum, e) => sum + e.amount, 0);
      
      // Get order totals
      const deliveredOrders = await prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          totalCost: true,
        },
      });
      
      const orderRevenue = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
      const orderCOGS = deliveredOrders.reduce((sum, o) => sum + (o.totalCost || 0), 0);
      
      // Calculate discrepancies
      const revenueDifference = Math.abs(ledgerRevenue - orderRevenue);
      const cogsDifference = Math.abs(ledgerCOGS - orderCOGS);
      
      const revenueMatches = revenueDifference < 0.01; // Allow for rounding
      const cogsMatches = cogsDifference < 0.01;
      
      if (!revenueMatches) {
        notices.push(`Revenue discrepancy detected: BDT ${revenueDifference.toFixed(2)}`);
      }
      
      if (!cogsMatches) {
        notices.push(`COGS discrepancy detected: BDT ${cogsDifference.toFixed(2)}`);
      }
      
      if (revenueMatches && cogsMatches) {
        notices.push('Ledger entries match order totals perfectly');
      }
      
      return NextResponse.json({
        success: true,
        notices,
        data: {
          period: {
            start: startDate,
            end: endDate,
          },
          ledger: {
            revenue: ledgerRevenue,
            cogs: ledgerCOGS,
            entryCount: ledgerEntries.length,
          },
          orders: {
            revenue: orderRevenue,
            cogs: orderCOGS,
            orderCount: deliveredOrders.length,
          },
          reconciliation: {
            revenueMatches,
            cogsMatches,
            revenueDifference,
            cogsDifference,
            overallMatch: revenueMatches && cogsMatches,
          },
        },
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid action. Use "reconcile" or "compare"',
        notices: ['Invalid request action'],
      },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Reconciliation Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to perform reconciliation',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred'],
      },
      { status: 500 }
    );
  }
}
