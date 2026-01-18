import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, companyName, phone } = await request.json();

    if (!name || !email || !password || !companyName || !phone) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        companyName,
        phone,
        role: 'BUYER',
        userType: 'RETAIL',
        isVerified: false,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        companyName: true,
        phone: true,
        role: true,
        userType: true,
        isVerified: true,
        isActive: true,
        createdAt: true
      }
    });

    // Generate JWT token
    const token = sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role.toLowerCase()
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      user: {
        ...newUser,
        role: newUser.role.toLowerCase(),
        userType: newUser.userType.toLowerCase()
      },
      token
    }, { status: 201 });

  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}