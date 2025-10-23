import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

// Mock user database - In production, use a real database
let users = [
  {
    id: '1',
    email: 'demo@skyzonebd.com',
    password: 'demo123',
    name: 'Demo User',
    companyName: 'Demo Company Ltd.',
    phone: '+880-1711-123456',
    role: 'buyer',
    userType: 'retail',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'admin@skyzonebd.com',
    password: '11admin22',
    name: 'Admin User',
    companyName: 'SkyzoneBD Admin',
    phone: '+880-1711-654321',
    role: 'admin',
    userType: 'retail',
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

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
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = {
      id: (users.length + 1).toString(),
      name,
      email,
      password, // In production, hash this password
      companyName,
      phone,
      role: 'buyer' as const,
      userType: 'retail' as const,
      isVerified: false,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    // Generate JWT token
    const token = sign(
      { 
        userId: newUser.id, 
        email: newUser.email, 
        role: newUser.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token
    }, { status: 201 });

  } catch (error) {
    console.error('Register API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}