// app/api/admin/employees/[id]/route.ts - Single Employee Operations

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/middleware/permissionMiddleware';

/**
 * GET /api/admin/employees/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'EMPLOYEES_VIEW', 'view');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        salaries: {
          orderBy: { createdAt: 'desc' },
          take: 12 // Last 12 months
        },
        attendances: {
          orderBy: { date: 'desc' },
          take: 30 // Last 30 days
        }
      }
    });
    
    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: employee
    });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/employees/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'EMPLOYEES_MANAGE', 'edit');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const { id } = await params;
    const body = await request.json();
    
    const employee = await prisma.employee.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender,
        address: body.address,
        city: body.city,
        country: body.country,
        department: body.department,
        designation: body.designation,
        employmentType: body.employmentType,
        baseSalary: body.baseSalary !== undefined ? parseFloat(body.baseSalary) : undefined,
        allowances: body.allowances !== undefined ? parseFloat(body.allowances) : undefined,
        bonuses: body.bonuses !== undefined ? parseFloat(body.bonuses) : undefined,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        nidNumber: body.nidNumber,
        tinNumber: body.tinNumber,
        bankAccount: body.bankAccount,
        bankName: body.bankName,
        isActive: body.isActive,
        resignationDate: body.resignationDate ? new Date(body.resignationDate) : null
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/employees/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check permission
    const permCheck = await checkPermission(request, 'EMPLOYEES_MANAGE', 'delete');
    if (!permCheck.authorized) {
      return permCheck.response;
    }

    const { id } = await params;
    await prisma.employee.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete employee' },
      { status: 500 }
    );
  }
}
