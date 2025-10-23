import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

// Mock user database - In production, use a real database
const users = [
  {
    id: '1',
    email: 'demo@skyzonebd.com',
    password: 'demo123', // In production, this should be hashed
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
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token
    });

  } catch (error) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}