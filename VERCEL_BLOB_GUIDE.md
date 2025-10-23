# Vercel Blob Storage Integration Guide

## Overview
This guide explains how to use Vercel Blob for image storage in your Next.js application.

## Setup

### 1. Install Dependencies
```bash
npm install @vercel/blob
```

### 2. Environment Variables
Add to your `.env.local` file:
```env
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

To get your Vercel Blob token:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Storage → Blob
4. Create a new Blob store (if you haven't)
5. Copy the `BLOB_READ_WRITE_TOKEN`

### 3. Add to Vercel Environment Variables
In your Vercel project settings:
- Go to Settings → Environment Variables
- Add `BLOB_READ_WRITE_TOKEN` with your token

## Usage

### Single Image Upload Component

```tsx
import ImageUpload from '@/app/components/ImageUpload';

function MyComponent() {
  const handleUploadComplete = (url: string) => {
    console.log('Image uploaded:', url);
    // Save URL to database or state
  };

  return (
    <ImageUpload
      onUploadComplete={handleUploadComplete}
      folder="products"
      currentImage="/images/current.jpg"
      onDelete={() => console.log('Image deleted')}
      maxSizeMB={5}
    />
  );
}
```

### Multiple Images Upload Component

```tsx
import MultiImageUpload from '@/app/components/MultiImageUpload';

function MyComponent() {
  const handleUploadComplete = (urls: string[]) => {
    console.log('Images uploaded:', urls);
    // Save URLs to database or state
  };

  return (
    <MultiImageUpload
      onUploadComplete={handleUploadComplete}
      folder="products/gallery"
      currentImages={['/img1.jpg', '/img2.jpg']}
      maxImages={5}
      maxSizeMB={5}
    />
  );
}
```

### Direct API Usage

#### Upload Image
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('folder', 'products');

const response = await fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
  body: formData,
});

const result = await response.json();
console.log('Uploaded URL:', result.data.url);
```

#### Delete Image
```typescript
const response = await fetch('/api/upload', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ url: imageUrl }),
});
```

### Using Blob Storage Utilities

```typescript
import { 
  uploadImage, 
  uploadMultipleImages, 
  deleteImage, 
  listImages,
  getOptimizedImageUrl 
} from '@/utils/blobStorage';

// Upload single image
const url = await uploadImage(file, 'products');

// Upload multiple images
const urls = await uploadMultipleImages([file1, file2], 'banners');

// Delete image
await deleteImage(url);

// List images in a folder
const blobs = await listImages('products/');

// Get optimized image URL
const optimizedUrl = getOptimizedImageUrl(url, {
  width: 800,
  height: 600,
  quality: 80,
  format: 'webp'
});
```

## API Routes

### POST /api/upload
Upload a single image to Vercel Blob.

**Headers:**
- `Authorization: Bearer <token>` (Admin only)

**Body (FormData):**
- `file`: The image file
- `folder`: Optional folder path (default: 'images')

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://xxxxx.public.blob.vercel-storage.com/...",
    "pathname": "images/1234567890-photo.jpg",
    "contentType": "image/jpeg",
    "size": 123456
  }
}
```

### DELETE /api/upload
Delete an image from Vercel Blob.

**Headers:**
- `Authorization: Bearer <token>` (Admin only)

**Body:**
```json
{
  "url": "https://xxxxx.public.blob.vercel-storage.com/..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

## Features

### File Validation
- **Allowed types**: JPEG, JPG, PNG, WebP, GIF
- **Max file size**: 5MB (configurable)
- **Security**: Admin-only access

### Image Optimization
Vercel Blob automatically optimizes images. You can request specific sizes:
```typescript
// Original: https://blob.vercel-storage.com/image.jpg
// Optimized: https://blob.vercel-storage.com/image.jpg?w=800&h=600&q=80
```

### Folder Organization
Organize images by category:
- `products/` - Product images
- `banners/` - Banner images
- `categories/` - Category images
- `users/avatars/` - User avatars

## Best Practices

1. **Always use folders** for better organization
2. **Delete old images** when updating to avoid storage costs
3. **Use optimized URLs** for better performance
4. **Set appropriate file size limits** based on use case
5. **Validate on both client and server** for security

## Example: Product Image Management

```tsx
'use client';

import { useState } from 'react';
import MultiImageUpload from '@/app/components/MultiImageUpload';

export default function ProductForm() {
  const [productImages, setProductImages] = useState<string[]>([]);

  const handleImagesUpdate = (urls: string[]) => {
    setProductImages(urls);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Save product with image URLs
    const productData = {
      name: 'Product Name',
      imageUrls: productImages, // Array of Vercel Blob URLs
      // ... other fields
    };

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Product Images</label>
        <MultiImageUpload
          onUploadComplete={handleImagesUpdate}
          folder="products"
          currentImages={productImages}
          maxImages={5}
        />
      </div>
      
      <button type="submit">Save Product</button>
    </form>
  );
}
```

## Troubleshooting

### Error: "BLOB_READ_WRITE_TOKEN is not set"
Add the token to your `.env.local` file and restart the dev server.

### Error: "Failed to upload image"
- Check if the file size is under 5MB
- Verify the file type is allowed
- Ensure you have a valid admin token

### Images not displaying
- Check if the URLs are correct
- Verify the blob store is public
- Check browser console for CORS errors

## Cost Optimization

Vercel Blob pricing:
- **Storage**: ~$0.15/GB per month
- **Bandwidth**: ~$0.40/GB

Tips to reduce costs:
1. Delete unused images regularly
2. Use image optimization to reduce file sizes
3. Consider using CDN caching
4. Compress images before upload

## Security

- ✅ Admin-only upload/delete
- ✅ File type validation
- ✅ File size limits
- ✅ JWT authentication required
- ✅ Public read access (for displaying images)

## Migration from Local Storage

To migrate existing images:
1. Use the `ImageUpload` component for each image
2. Update database with new Vercel Blob URLs
3. Delete old local images
4. Update all image references in your code

## Support

For issues with Vercel Blob, check:
- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [Vercel Support](https://vercel.com/support)
