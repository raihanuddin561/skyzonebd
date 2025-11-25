import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verify, JwtPayload } from 'jsonwebtoken';

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

// Increase body size limit for this route
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds timeout

export async function POST(request: NextRequest) {
  console.log('🔵 Upload API called');
  
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    console.log('🔍 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid auth header');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    console.log('🔍 Token length:', token.length);
    
    let decoded: DecodedToken;
    try {
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      console.log('🔍 JWT Secret exists:', !!jwtSecret);
      decoded = verify(token, jwtSecret) as DecodedToken;
      console.log('✅ Token verified, role:', decoded.role);
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid token', details: error instanceof Error ? error.message : 'Unknown' },
        { status: 401 }
      );
    }

    // Only admin can upload images (check both ADMIN and admin for case-insensitivity)
    if (decoded.role.toUpperCase() !== 'ADMIN') {
      console.log('❌ Not admin, role:', decoded.role);
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    console.log('✅ Admin verified');

    // Parse form data with error handling
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      console.error('Failed to parse form data:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid form data', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'images';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file is actually a file
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file object' },
        { status: 400 }
      );
    }

    // Check file has content
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'File is empty' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB - increased for better compatibility)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit. Please compress the image.' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `${folder}/${Date.now()}-${file.name}`;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN;
    
    console.log('🔍 Upload attempt - Token exists:', !!blobToken);
    console.log('🔍 File details:', { name: file.name, size: file.size, type: file.type });
    
    if (!blobToken) {
      console.error('❌ No Blob token found in environment variables');
      console.error('❌ Available env keys:', Object.keys(process.env).filter(k => k.includes('BLOB')));
      return NextResponse.json(
        { success: false, error: 'Storage configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    console.log('📤 Uploading to Vercel Blob...');
    let blob;
    try {
      blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: true,
        token: blobToken,
      });
    } catch (uploadError) {
      console.error('Vercel Blob upload error:', uploadError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to upload to storage',
          details: uploadError instanceof Error ? uploadError.message : 'Storage error'
        },
        { status: 500 }
      );
    }

    if (!blob || !blob.url) {
      return NextResponse.json(
        { success: false, error: 'Upload completed but no URL returned' },
        { status: 500 }
      );
    }

    console.log('✅ Image uploaded successfully:', blob.url);

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: blob.contentType,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Upload Image API Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    
    // Ensure we always return valid JSON
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to upload image',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: DecodedToken;
    try {
      decoded = verify(token, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Only admin can delete images (check both ADMIN and admin for case-insensitivity)
    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }

    // Delete from Vercel Blob
    const { del } = await import('@vercel/blob');
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN;
    
    if (!blobToken) {
      console.error('❌ No Blob token found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Storage configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    await del(url, { token: blobToken });

    console.log('✅ Image deleted successfully:', url);

    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete Image API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
