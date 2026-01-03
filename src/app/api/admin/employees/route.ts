// app/api/admin/employees/route.ts - Employee Management API

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/middleware/permissionMiddleware';

/**
 * GET /api/admin/employees
 * Get all employees with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'EMPLOYEES_VIEW', 'view');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
    const isActive = searchParams.get('active');
    const search = searchParams.get('search');
    
    const where: any = {};
    
    if (department) where.department = department;
    if (isActive !== null) where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    const employees = await prisma.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            salaries: true,
            attendances: true
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/employees
 * Create new employee
 */
export async function POST(request: NextRequest) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'EMPLOYEES_MANAGE', 'create');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const body = await request.json();
    
    // Generate employee ID if not provided
    if (!body.employeeId) {
      const count = await prisma.employee.count();
      body.employeeId = `EMP-${String(count + 1).padStart(4, '0')}`;
    }
    
    const employee = await prisma.employee.create({
      data: {
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender,
        address: body.address,
        city: body.city,
        country: body.country || 'Bangladesh',
        department: body.department,
        designation: body.designation,
        employmentType: body.employmentType || 'FULL_TIME',
        joiningDate: new Date(body.joiningDate),
        baseSalary: parseFloat(body.baseSalary),
        allowances: parseFloat(body.allowances) || 0,
        bonuses: parseFloat(body.bonuses) || 0,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        nidNumber: body.nidNumber,
        tinNumber: body.tinNumber,
        bankAccount: body.bankAccount,
        bankName: body.bankName
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create employee',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
