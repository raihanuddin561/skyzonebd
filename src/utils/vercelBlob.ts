// Vercel Blob Storage Utilities
import { put, del, list } from '@vercel/blob';

export interface UploadResult {
  url: string;
  pathname: string;
  contentType: string;
  size: number;
}

export interface MultiUploadResult {
  urls: string[];
  files: UploadResult[];
}

/**
 * Upload a single file to Vercel Blob
 */
export async function uploadToBlob(
  file: File,
  options?: {
    folder?: string;
    filename?: string;
    access?: 'public';
  }
): Promise<UploadResult> {
  try {
    const folder = options?.folder || 'uploads';
    const filename = options?.filename || `${Date.now()}-${file.name}`;
    const pathname = `${folder}/${filename}`;

    const blob = await put(pathname, file, {
      access: options?.access || 'public',
      addRandomSuffix: false,
    });

    return {
      url: blob.url,
      pathname: blob.pathname,
      contentType: blob.contentType || file.type,
      size: blob.size,
    };
  } catch (error) {
    console.error('Upload to Blob failed:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload multiple files to Vercel Blob
 */
export async function uploadMultipleToBlob(
  files: File[],
  options?: {
    folder?: string;
    access?: 'public';
  }
): Promise<MultiUploadResult> {
  try {
    const uploadPromises = files.map(file => uploadToBlob(file, options));
    const results = await Promise.all(uploadPromises);

    return {
      urls: results.map(r => r.url),
      files: results,
    };
  } catch (error) {
    console.error('Multiple upload to Blob failed:', error);
    throw new Error(`Failed to upload files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a file from Vercel Blob by URL
 */
export async function deleteFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Delete from Blob failed:', error);
    throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete multiple files from Vercel Blob
 */
export async function deleteMultipleFromBlob(urls: string[]): Promise<void> {
  try {
    await Promise.all(urls.map(url => del(url)));
  } catch (error) {
    console.error('Multiple delete from Blob failed:', error);
    throw new Error(`Failed to delete files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Replace an existing file with a new one
 * Deletes the old file and uploads the new one
 */
export async function replaceInBlob(
  oldUrl: string,
  newFile: File,
  options?: {
    folder?: string;
    filename?: string;
    access?: 'public';
  }
): Promise<UploadResult> {
  try {
    // Upload new file first
    const uploadResult = await uploadToBlob(newFile, options);
    
    // Delete old file (don't fail the operation if delete fails)
    try {
      await deleteFromBlob(oldUrl);
    } catch (deleteError) {
      console.warn('Failed to delete old file, but upload succeeded:', deleteError);
    }

    return uploadResult;
  } catch (error) {
    console.error('Replace in Blob failed:', error);
    throw new Error(`Failed to replace file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List files in a folder
 */
export async function listBlobFiles(options?: {
  prefix?: string;
  limit?: number;
}) {
  try {
    const { blobs } = await list({
      prefix: options?.prefix,
      limit: options?.limit || 1000,
    });

    return blobs;
  } catch (error) {
    console.error('List Blob files failed:', error);
    throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, options?: {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 5 * 1024 * 1024; // 5MB default
  const allowedTypes = options?.allowedTypes || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / (1024 * 1024)}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Extract pathname from Vercel Blob URL for deletion
 */
export function extractPathnameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch {
    return url;
  }
}
