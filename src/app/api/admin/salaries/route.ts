// app/api/admin/salaries/route.ts - Salary Management API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/middleware/permissionMiddleware';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout


/**
 * GET /api/admin/salaries
 * Get all salary records with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'SALARIES_VIEW', 'view');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    
    const where: any = {};
    
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    if (employeeId) where.employeeId = employeeId;
    if (status) where.paymentStatus = status;
    
    const salaries = await prisma.salary.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    
    return NextResponse.json({
      success: true,
      data: salaries
    });
  } catch (error) {
    console.error('Error fetching salaries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch salaries' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/salaries
 * Create salary record (usually generated automatically)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'SALARIES_MANAGE', 'create');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const body = await request.json();
    
    // Calculate totals
    const grossSalary = 
      parseFloat(body.baseSalary) +
      parseFloat(body.allowances || 0) +
      parseFloat(body.bonuses || 0) +
      parseFloat(body.overtime || 0);
    
    const totalDeductions = 
      parseFloat(body.tax || 0) +
      parseFloat(body.providentFund || 0) +
      parseFloat(body.insurance || 0) +
      parseFloat(body.loan || 0) +
      parseFloat(body.otherDeductions || 0);
    
    const netSalary = grossSalary - totalDeductions;
    
    const salary = await prisma.salary.create({
      data: {
        employeeId: body.employeeId,
        month: parseInt(body.month),
        year: parseInt(body.year),
        baseSalary: parseFloat(body.baseSalary),
        allowances: parseFloat(body.allowances) || 0,
        bonuses: parseFloat(body.bonuses) || 0,
        overtime: parseFloat(body.overtime) || 0,
        grossSalary,
        tax: parseFloat(body.tax) || 0,
        providentFund: parseFloat(body.providentFund) || 0,
        insurance: parseFloat(body.insurance) || 0,
        loan: parseFloat(body.loan) || 0,
        otherDeductions: parseFloat(body.otherDeductions) || 0,
        totalDeductions,
        netSalary,
        paymentStatus: body.paymentStatus || 'PENDING',
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
        paymentMethod: body.paymentMethod,
        paymentReference: body.paymentReference,
        workingDays: parseInt(body.workingDays) || 0,
        presentDays: parseInt(body.presentDays) || 0,
        absentDays: parseInt(body.absentDays) || 0,
        leaveDays: parseInt(body.leaveDays) || 0,
        notes: body.notes
      },
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Salary record created successfully',
      data: salary
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating salary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create salary record',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/salaries/generate
 * Generate salary records for all employees for a specific month
 */
export async function generateMonthlySalaries(month: number, year: number) {
  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true }
    });
    
    const salaryRecords = await Promise.all(
      employees.map(async (employee) => {
        // Check if salary already exists
        const existing = await prisma.salary.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: employee.id,
              month,
              year
            }
          }
        });
        
        if (existing) return existing;
        
        // Get attendance data for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        
        const attendances = await prisma.attendance.findMany({
          where: {
            employeeId: employee.id,
            date: {
              gte: startDate,
              lte: endDate
            }
          }
        });
        
        const workingDays = attendances.length;
        const presentDays = attendances.filter(a => 
          a.status === 'PRESENT' || a.status === 'WORK_FROM_HOME'
        ).length;
        const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
        const leaveDays = attendances.filter(a => 
          a.status === 'LEAVE' || a.status === 'SICK_LEAVE' || a.status === 'CASUAL_LEAVE'
        ).length;
        
        const overtime = attendances.reduce((sum, a) => sum + (a.overtime || 0), 0);
        const overtimePay = overtime * (employee.baseSalary / 160) * 1.5; // 1.5x hourly rate
        
        const grossSalary = employee.baseSalary + employee.allowances + employee.bonuses + overtimePay;
        const tax = grossSalary * 0.05; // 5% tax (simplified)
        const providentFund = employee.baseSalary * 0.1; // 10% PF
        const totalDeductions = tax + providentFund;
        const netSalary = grossSalary - totalDeductions;
        
        return await prisma.salary.create({
          data: {
            employeeId: employee.id,
            month,
            year,
            baseSalary: employee.baseSalary,
            allowances: employee.allowances,
            bonuses: employee.bonuses,
            overtime: overtimePay,
            grossSalary,
            tax,
            providentFund,
            totalDeductions,
            netSalary,
            workingDays,
            presentDays,
            absentDays,
            leaveDays,
            paymentStatus: 'PENDING'
          }
        });
      })
    );
    
    return NextResponse.json({
      success: true,
      message: `Generated ${salaryRecords.length} salary records`,
      data: salaryRecords
    });
  } catch (error) {
    console.error('Error generating salaries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate salaries' },
      { status: 500 }
    );
  }
}
