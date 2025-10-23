import { put, del, list } from '@vercel/blob';

/**
 * Upload an image to Vercel Blob Storage
 * @param file - File to upload
 * @param folder - Optional folder path (e.g., 'products', 'banners')
 * @returns URL of the uploaded file
 */
export async function uploadImage(file: File, folder: string = 'images'): Promise<string> {
  try {
    const filename = `${folder}/${Date.now()}-${file.name}`;
    
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return blob.url;
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Upload multiple images to Vercel Blob Storage
 * @param files - Array of files to upload
 * @param folder - Optional folder path
 * @returns Array of URLs of uploaded files
 */
export async function uploadMultipleImages(
  files: File[],
  folder: string = 'images'
): Promise<string[]> {
  try {
    const uploadPromises = files.map((file) => uploadImage(file, folder));
    return await Promise.all(uploadPromises);
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw new Error('Failed to upload images');
  }
}

/**
 * Delete an image from Vercel Blob Storage
 * @param url - URL of the file to delete
 */
export async function deleteImage(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Error deleting from Vercel Blob:', error);
    throw new Error('Failed to delete image');
  }
}

/**
 * Delete multiple images from Vercel Blob Storage
 * @param urls - Array of URLs to delete
 */
export async function deleteMultipleImages(urls: string[]): Promise<void> {
  try {
    await del(urls);
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw new Error('Failed to delete images');
  }
}

/**
 * List all blobs with optional prefix filter
 * @param prefix - Optional prefix to filter blobs (e.g., 'products/')
 */
export async function listImages(prefix?: string) {
  try {
    const { blobs } = await list({
      prefix: prefix,
    });
    return blobs;
  } catch (error) {
    console.error('Error listing blobs:', error);
    throw new Error('Failed to list images');
  }
}

/**
 * Get optimized image URL with transformations
 * @param url - Original blob URL
 * @param options - Transformation options
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg' | 'png';
  } = {}
): string {
  const { width, height, quality = 80, format } = options;
  const urlObj = new URL(url);
  const params = new URLSearchParams();

  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  if (quality) params.set('q', quality.toString());
  if (format) params.set('fm', format);

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}
