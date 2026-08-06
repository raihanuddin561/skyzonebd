import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { requireAdmin } from '@/lib/auth';

// Vercel configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// POST - Upload multiple images
export async function POST(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9): previously a hand-rolled JWT decode +
    // `role.toUpperCase() !== 'ADMIN'` check that excluded SUPER_ADMIN from
    // uploading images (docs/architecture-review/14_Technical_Debt.md §22).
    await requireAdmin(request);

    // Parse form data
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const folder = (formData.get('folder') as string) || 'images';

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Validate each file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    const uploadResults = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!allowedTypes.includes(file.type)) {
        errors.push({
          index: i,
          filename: file.name,
          error: 'Invalid file type'
        });
        continue;
      }

      // Validate file size
      if (file.size > maxSize) {
        errors.push({
          index: i,
          filename: file.name,
          error: 'File size exceeds 5MB limit'
        });
        continue;
      }

      try {
        // Upload to Vercel Blob
        const filename = `${folder}/${Date.now()}-${i}-${file.name}`;
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN;
        
        if (!blobToken) {
          throw new Error('No Blob token configured');
        }

        const blob = await put(filename, file, {
          access: 'public',
          addRandomSuffix: true,
          token: blobToken,
        });

        uploadResults.push({
          index: i,
          url: blob.url,
          pathname: blob.pathname,
          contentType: blob.contentType,
          size: file.size,
        });
      } catch (error) {
        errors.push({
          index: i,
          filename: file.name,
          error: error instanceof Error ? error.message : 'Upload failed'
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      data: uploadResults,
      errors: errors.length > 0 ? errors : undefined,
      message: `Uploaded ${uploadResults.length} of ${files.length} file(s)`
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Multi Upload API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}

// DELETE - Delete multiple images
export async function DELETE(request: NextRequest) {
  try {
    // Canonical auth (ADR-009 / P2-9) — see POST above for why this replaced
    // a hand-rolled, SUPER_ADMIN-excluding check.
    await requireAdmin(request);

    // Get URLs from request body
    const body = await request.json();
    const urls = body.urls as string[];

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No URLs provided' },
        { status: 400 }
      );
    }

    const deleteResults = [];
    const errors = [];

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN || process.env.SKY_ZONE_BD_BLOB_READ_WRITE_TOKEN;
    
    if (!blobToken) {
      return NextResponse.json(
        { success: false, error: 'Storage configuration error' },
        { status: 500 }
      );
    }

    for (const url of urls) {
      try {
        await del(url, { token: blobToken });
        deleteResults.push({ url, success: true });
      } catch (error) {
        errors.push({
          url,
          error: error instanceof Error ? error.message : 'Delete failed'
        });
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      deleted: deleteResults.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Deleted ${deleteResults.length} of ${urls.length} file(s)`
    });

  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Multi Delete API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete images' },
      { status: 500 }
    );
  }
}
