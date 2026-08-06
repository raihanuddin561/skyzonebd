/**
 * Admin Financial Reports - Accounts Receivable
 * GET /api/admin/financial/accounts-receivable
 *
 * Track all outstanding (UNPAID/PARTIALLY_PAID/OVERDUE) customer invoices
 * for NET30/60/90 orders. Mirrors outstanding-payouts/route.ts's aging
 * pattern (Amazon-style gap-closure Phase 2 part 3), swapping
 * ProfitDistribution/Partner for Invoice/User.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { formatCurrency } from '@/lib/financialCalculator';
import { getPaginationParams, createPaginationResponse } from '@/lib/paginationHelper';
import { differenceInDays } from 'date-fns';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

export async function GET(request: NextRequest) {
  const notices: string[] = [];

  try {
    await requireAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // UNPAID, PARTIALLY_PAID, OVERDUE (for filtering)
    const customerId = searchParams.get('customerId');
    const overdue = searchParams.get('overdue') === 'true'; // Show only overdue
    const sortBy = searchParams.get('sortBy') || 'dueDate'; // dueDate, amount, daysOutstanding

    const { skip, take, page, limit } = getPaginationParams(searchParams);

    const where: any = {
      status: status || { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
    };
    if (customerId) where.customerId = customerId;

    const total = await prisma.invoice.count({ where });

    const invoices = await prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: sortBy === 'amount'
        ? { amount: 'desc' }
        : sortBy === 'daysOutstanding'
        ? { dueDate: 'asc' }
        : { dueDate: 'asc' },
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { orderNumber: true } },
      },
    });

    if (invoices.length === 0) {
      notices.push('No outstanding invoices found for the specified criteria');
    }

    // Enrich with calculated aging fields — computed on read, mirroring
    // outstanding-payouts (no stored OVERDUE status is trusted blindly;
    // dueDate < now is the actual signal).
    const enrichedInvoices = invoices.map((inv) => {
      const outstandingBalance = inv.amount - inv.paidAmount;
      const daysOutstanding = differenceInDays(new Date(), inv.dueDate);
      const isOverdue = daysOutstanding > 0 && inv.status !== 'PAID' && inv.status !== 'CANCELLED';
      const urgency = daysOutstanding > 60 ? 'high' : daysOutstanding > 30 ? 'medium' : daysOutstanding > 0 ? 'low' : 'none';

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        orderId: inv.orderId,
        orderNumber: inv.order.orderNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.name,
        customerEmail: inv.customer?.email,
        customerPhone: inv.customer?.phone,
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        paymentTerms: inv.paymentTerms,
        amount: inv.amount,
        paidAmount: inv.paidAmount,
        outstandingBalance,
        status: inv.status,
        notes: inv.notes,
        // Calculated fields
        daysOutstanding,
        isOverdue,
        urgency,
        // Formatted values
        amountFormatted: formatCurrency(inv.amount),
        outstandingBalanceFormatted: formatCurrency(outstandingBalance),
      };
    });

    let filteredInvoices = enrichedInvoices;
    if (overdue) {
      filteredInvoices = enrichedInvoices.filter((i) => i.isOverdue);
    }

    const totalOutstanding = filteredInvoices.reduce((sum, i) => sum + i.outstandingBalance, 0);
    const unpaidCount = filteredInvoices.filter((i) => i.status === 'UNPAID').length;
    const partiallyPaidCount = filteredInvoices.filter((i) => i.status === 'PARTIALLY_PAID').length;
    const overdueCount = filteredInvoices.filter((i) => i.isOverdue).length;
    const highUrgencyCount = filteredInvoices.filter((i) => i.urgency === 'high').length;

    const byCustomer = filteredInvoices.reduce((acc, inv) => {
      const key = inv.customerId || 'unknown';
      if (!acc[key]) {
        acc[key] = {
          customerId: inv.customerId,
          customerName: inv.customerName,
          totalOutstanding: 0,
          count: 0,
          oldestDueDate: inv.dueDate,
        };
      }
      acc[key].totalOutstanding += inv.outstandingBalance;
      acc[key].count += 1;
      if (inv.dueDate < acc[key].oldestDueDate) {
        acc[key].oldestDueDate = inv.dueDate;
      }
      return acc;
    }, {} as Record<string, any>);

    const customerSummaries = Object.values(byCustomer)
      .map((c: any) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        totalOutstanding: c.totalOutstanding,
        count: c.count,
        oldestDaysOutstanding: differenceInDays(new Date(), c.oldestDueDate),
        totalOutstandingFormatted: formatCurrency(c.totalOutstanding),
      }))
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

    const pagination = createPaginationResponse(total, page, limit);

    return NextResponse.json({
      success: true,
      notices,
      data: {
        invoices: filteredInvoices,
        summary: {
          totalOutstanding,
          unpaidCount,
          partiallyPaidCount,
          overdueCount,
          highUrgencyCount,
          averageOutstanding: filteredInvoices.length > 0 ? totalOutstanding / filteredInvoices.length : 0,
          totalOutstandingFormatted: formatCurrency(totalOutstanding),
        },
        byCustomer: customerSummaries,
      },
      pagination,
      meta: {
        generatedAt: new Date().toISOString(),
        filters: { status, customerId, overdue, sortBy },
      },
    });
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Accounts Receivable Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch accounts receivable',
        details: error instanceof Error ? error.message : 'Unknown error',
        notices: ['Server error occurred'],
      },
      { status: 500 }
    );
  }
}
