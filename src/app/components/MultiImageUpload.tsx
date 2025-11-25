'use client';

import { useState, useRef } from 'react';
import { toast } from 'react-toastify';

interface MultiImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  folder?: string;
  currentImages?: string[];
  maxImages?: number;
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export default function MultiImageUpload({
  onUploadComplete,
  folder = 'images',
  currentImages = [],
  maxImages = 5,
  maxSizeMB = 5,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(currentImages);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resize and compress image
  const resizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height;
            if (width > height) {
              width = maxWidth;
              height = width / aspectRatio;
            } else {
              height = maxHeight;
              width = height * aspectRatio;
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Use better image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'));
                return;
              }

              // Create new file with same name but optimized
              const newFile = new File([blob], file.name, {
                type: 'image/jpeg', // Convert all to JPEG for consistency
                lastModified: Date.now(),
              });

              console.log(`📐 Resized ${file.name}: ${Math.round(file.size / 1024)}KB → ${Math.round(newFile.size / 1024)}KB`);
              resolve(newFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check max images limit
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate file formats
    const acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    for (const file of files) {
      if (!acceptedFormats.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`);
        return;
      }
    }

    // Process and resize images
    setProcessing(true);
    try {
      const resizedFiles: File[] = [];
      for (const file of files) {
        try {
          const resized = await resizeImage(file);
          
          // Check if resized file is within size limit
          const maxSize = maxSizeMB * 1024 * 1024;
          if (resized.size > maxSize) {
            toast.warning(`${file.name} still too large after compression. Skipping.`);
            continue;
          }
          
          resizedFiles.push(resized);
        } catch (error) {
          console.error('Error resizing image:', error);
          toast.error(`Failed to process ${file.name}`);
        }
      }

      if (resizedFiles.length > 0) {
        await uploadFiles(resizedFiles);
      }
    } catch (error) {
      console.error('Error processing images:', error);
      toast.error('Failed to process images');
    } finally {
      setProcessing(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to upload images');
        return;
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}...`);
        
        console.log('📤 Uploading file:', file.name, 'Size:', file.size, 'Type:', file.type);
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        console.log('📥 Upload response status:', response.status);
        
        const result = await response.json();
        console.log('📥 Upload response data:', result);

        if (!response.ok) {
          console.error('❌ Upload failed:', result);
          throw new Error(result.error || result.details || `Failed to upload ${file.name}`);
        }

        if (result.success) {
          uploadedUrls.push(result.data.url);
          console.log('✅ File uploaded successfully:', result.data.url);
        } else {
          throw new Error(result.error || result.details || `Failed to upload ${file.name}`);
        }
      }

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onUploadComplete(newImages);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully! 🎉`);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';
      toast.error(errorMessage);
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (urlToDelete: string, index: number) => {
    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to delete images');
        return;
      }

      const response = await fetch('/api/upload', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToDelete }),
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const result = await response.json();

      if (result.success) {
        const newImages = images.filter((_, i) => i !== index);
        setImages(newImages);
        onUploadComplete(newImages);
        toast.success('Image deleted successfully!');
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || processing || images.length >= maxImages}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {processing ? 'Processing...' : uploading ? 'Uploading...' : 'Add Images'}
        </button>

        <span className="text-sm text-gray-600">
          {images.length} / {maxImages} images
          {uploadProgress && <span className="ml-2 text-blue-600">{uploadProgress}</span>}
        </span>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((url, index) => (
            <div key={index} className="relative group">
              <img
                src={url}
                alt={`Image ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg shadow-md"
              />
              <button
                type="button"
                onClick={() => handleDelete(url, index)}
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Max {maxImages} images. Images will be auto-resized to {maxWidth}x{maxHeight}px and compressed. Formats: JPG, PNG, WebP, GIF
      </p>
    </div>
  );
}
