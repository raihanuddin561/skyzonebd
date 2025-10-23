'use client';

import { useState, useRef } from 'react';
import { toast } from 'react-toastify';

interface MultiImageUploadProps {
  onUploadComplete: (urls: string[]) => void;
  folder?: string;
  currentImages?: string[];
  maxImages?: number;
  maxSizeMB?: number;
}

export default function MultiImageUpload({
  onUploadComplete,
  folder = 'images',
  currentImages = [],
  maxImages = 5,
  maxSizeMB = 5,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<string[]>(currentImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check max images limit
    if (images.length + files.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate all files
    const maxSize = maxSizeMB * 1024 * 1024;
    const acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    for (const file of files) {
      if (!acceptedFormats.includes(file.type)) {
        toast.error(`Invalid file type: ${file.name}`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds ${maxSizeMB}MB limit`);
        return;
      }
    }

    // Upload all files
    await uploadFiles(files);
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

      for (const file of files) {
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

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();

        if (result.success) {
          uploadedUrls.push(result.data.url);
        } else {
          throw new Error(result.error || `Failed to upload ${file.name}`);
        }
      }

      const newImages = [...images, ...uploadedUrls];
      setImages(newImages);
      onUploadComplete(newImages);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully! 🎉`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
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
          disabled={uploading || images.length >= maxImages}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {uploading ? 'Uploading...' : 'Add Images'}
        </button>

        <span className="text-sm text-gray-600">
          {images.length} / {maxImages} images
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
        Max {maxImages} images. Max file size: {maxSizeMB}MB per image. Formats: JPG, PNG, WebP, GIF
      </p>
    </div>
  );
}
