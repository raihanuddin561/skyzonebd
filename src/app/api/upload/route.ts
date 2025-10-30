import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { verify, JwtPayload } from 'jsonwebtoken';

interface DecodedToken extends JwtPayload {
  userId: string;
  role: string;
}

export async function POST(request: NextRequest) {
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

    // Only admin can upload images (check both ADMIN and admin for case-insensitivity)
    if (decoded.role.toUpperCase() !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'images';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
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

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 5MB limit' },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob
    const filename = `${folder}/${Date.now()}-${file.name}`;
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN;
    
    if (!blobToken) {
      console.error('❌ No Blob token found in environment variables');
      return NextResponse.json(
        { success: false, error: 'Storage configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
      token: blobToken,
    });

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
    return NextResponse.json(
      { success: false, error: 'Failed to upload image' },
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
