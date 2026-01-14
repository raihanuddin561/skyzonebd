'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Unit {
  id: string;
  name: string;
  symbol: string;
  description: string | null;
  isActive: boolean;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand: string;
  unit: string;
  sku: string;
  retailPrice: number;
  salePrice: number | null;
  comparePrice: number | null;
  stockQuantity: number;
  minOrderQuantity: number;
  wholesaleEnabled: boolean;
  wholesaleMOQ: number;
  baseWholesalePrice: number | null;
  tags: string[];
  specifications: Record<string, string>;
  isFeatured: boolean;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
}

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [productId, setProductId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  const [showNewUnitModal, setShowNewUnitModal] = useState(false);
  const [newUnitData, setNewUnitData] = useState({ name: '', symbol: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    description: '',
    categoryId: '',
    brand: '',
    unit: '',
    sku: '',
    retailPrice: 0,
    salePrice: null,
    comparePrice: null,
    stockQuantity: 0,
    minOrderQuantity: 0,
    wholesaleEnabled: false,
    wholesaleMOQ: 0,
    baseWholesalePrice: null,
    tags: [],
    specifications: {},
    isFeatured: false,
    isActive: true,
    metaTitle: '',
    metaDescription: '',
  });

  const [images, setImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [deleteProductDialog, setDeleteProductDialog] = useState(false);
  
  // Hero Slider state
  const [addToHeroSlider, setAddToHeroSlider] = useState(false);
  const [heroSlideTitle, setHeroSlideTitle] = useState('');
  const [heroSlideSubtitle, setHeroSlideSubtitle] = useState('');
  const [heroSlideButtonText, setHeroSlideButtonText] = useState('Shop Now');
  const [heroSlideBgColor, setHeroSlideBgColor] = useState('#3B82F6');
  const [existingHeroSlide, setExistingHeroSlide] = useState<any>(null);

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await params;
      setProductId(resolvedParams.id);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (productId) {
      fetchProduct();
      fetchCategories();
      fetchUnits();
    }
  }, [productId]);

  const fetchProduct = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching product with ID:', productId);
      const response = await fetch(`/api/products/${productId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const result = await response.json();
      console.log('Product fetch result:', result);

      if (result.success && result.data.product) {
        const product = result.data.product;
        console.log('Product loaded successfully:', product.name);
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          description: product.description || '',
          categoryId: product.categoryId || '',
          brand: product.brand || '',
          unit: product.unit || '',
          sku: product.sku || '',
          retailPrice: product.retailPrice || 0,
          salePrice: product.salePrice || null,
          comparePrice: product.comparePrice || null,
          stockQuantity: product.stockQuantity || 0,
          minOrderQuantity: product.minOrderQuantity || 0,
          wholesaleEnabled: product.wholesaleEnabled || false,
          wholesaleMOQ: product.wholesaleMOQ || 0,
          baseWholesalePrice: product.baseWholesalePrice || null,
          tags: product.tags || [],
          specifications: product.specifications || {},
          isFeatured: product.isFeatured || false,
          isActive: product.isActive !== false,
          metaTitle: product.metaTitle || '',
          metaDescription: product.metaDescription || '',
        });
        
        setImages(product.imageUrls || [product.imageUrl] || []);
        setPrimaryImage(product.imageUrl || '');

        // Check if product has existing hero slide
        console.log('Checking for hero slide for product:', productId);
        const heroSlideResponse = await fetch(`/api/hero-slides`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const heroSlideResult = await heroSlideResponse.json();
        console.log('Hero slides response:', heroSlideResult);
        if (heroSlideResult.success) {
          const existingSlide = heroSlideResult.data.find((slide: any) => slide.productId === productId);
          console.log('Found existing hero slide:', existingSlide);
          if (existingSlide) {
            setExistingHeroSlide(existingSlide);
            setAddToHeroSlider(true);
            setHeroSlideTitle(existingSlide.title || '');
            setHeroSlideSubtitle(existingSlide.subtitle || '');
            setHeroSlideButtonText(existingSlide.buttonText || 'Shop Now');
            setHeroSlideBgColor(existingSlide.bgColor || '#3B82F6');
            console.log('Hero slide settings loaded:', {
              title: existingSlide.title,
              subtitle: existingSlide.subtitle,
              buttonText: existingSlide.buttonText,
              bgColor: existingSlide.bgColor
            });
          } else {
            console.log('No hero slide found for this product');
          }
        }
      } else {
        console.error('Product not found in API response:', result);
        toast.error('Product not found');
        router.push('/admin/products');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast.error('Failed to load product. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await fetch('/api/units?active=true');
      const data = await response.json();
      
      if (data.success && data.data) {
        setUnits(data.data);
      } else {
        // If units table doesn't exist, use default units
        setUnits([
          { id: '1', name: 'Piece', symbol: 'piece', description: null, isActive: true },
          { id: '2', name: 'Kilogram', symbol: 'kg', description: null, isActive: true },
          { id: '3', name: 'Liter', symbol: 'liter', description: null, isActive: true },
          { id: '4', name: 'Meter', symbol: 'meter', description: null, isActive: true },
          { id: '5', name: 'Box', symbol: 'box', description: null, isActive: true },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch units:', error);
      // Use default units if API fails
      setUnits([
        { id: '1', name: 'Piece', symbol: 'piece', description: null, isActive: true },
        { id: '2', name: 'Kilogram', symbol: 'kg', description: null, isActive: true },
        { id: '3', name: 'Liter', symbol: 'liter', description: null, isActive: true },
        { id: '4', name: 'Meter', symbol: 'meter', description: null, isActive: true },
        { id: '5', name: 'Box', symbol: 'box', description: null, isActive: true },
      ]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('folder', 'products');

      const response = await fetch('/api/upload/multi', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (result.success && result.data) {
        const newImages = result.data.map((img: { url: string }) => img.url);
        setImages([...images, ...newImages]);
        if (!primaryImage && newImages.length > 0) {
          setPrimaryImage(newImages[0]);
        }
        toast.success(`Uploaded ${newImages.length} image(s)`);
      } else {
        toast.error('Failed to upload images');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    setImageToDelete(imageUrl);
  };

  const confirmDeleteImage = async () => {
    if (!imageToDelete) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload/multi', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: [imageToDelete] }),
      });

      const result = await response.json();
      if (result.success) {
        setImages(images.filter(img => img !== imageToDelete));
        if (primaryImage === imageToDelete) {
          setPrimaryImage(images[0] || '');
        }
        toast.success('Image deleted');
        setImageToDelete(null);
      } else {
        toast.error('Failed to delete image');
        setImageToDelete(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete image');
      setImageToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: primaryImage,
          imageUrls: images,
          price: formData.retailPrice,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // Handle hero slider
        if (addToHeroSlider && heroSlideTitle) {
          try {
            const heroSlideData = {
              title: heroSlideTitle,
              subtitle: heroSlideSubtitle || null,
              imageUrl: primaryImage,
              linkUrl: `/products/${productId}`,
              productId: productId,
              buttonText: heroSlideButtonText,
              bgColor: heroSlideBgColor,
              textColor: '#FFFFFF',
              isActive: true,
            };

            if (existingHeroSlide) {
              // Update existing hero slide
              await fetch(`/api/hero-slides/${existingHeroSlide.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(heroSlideData),
              });
              toast.success('Product and hero slide updated!');
            } else {
              // Create new hero slide
              await fetch('/api/hero-slides', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(heroSlideData),
              });
              toast.success('Product updated and added to hero slider!');
            }
          } catch (error) {
            console.error('Failed to update hero slide:', error);
            toast.warning('Product updated but hero slide update failed');
          }
        } else if (!addToHeroSlider && existingHeroSlide) {
          // Remove from hero slider if unchecked
          try {
            await fetch(`/api/hero-slides/${existingHeroSlide.id}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });
            toast.success('Product updated and removed from hero slider');
          } catch (error) {
            console.error('Failed to remove hero slide:', error);
          }
        } else {
          toast.success('Product updated successfully');
        }
        
        router.push('/admin/products');
      } else {
        toast.error(result.error || 'Failed to update product');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData({ ...formData, tags: [...formData.tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      setFormData({
        ...formData,
        specifications: { ...formData.specifications, [newSpecKey]: newSpecValue }
      });
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    const specs = { ...formData.specifications };
    delete specs[key];
    setFormData({ ...formData, specifications: specs });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Edit Product</h1>
            <p className="text-gray-600 mt-1">Update product information and images</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ← Back
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug *
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                  disabled={loadingUnits}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingUnits ? 'Loading units...' : 'Select Unit'}
                  </option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.symbol}>
                      {unit.name} ({unit.symbol})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewUnitModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  + New
                </button>
              </div>
              {units.length === 0 && !loadingUnits && (
                <p className="text-xs text-red-500 mt-1">
                  No units found. Please create a unit first.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Unit of measurement for pricing</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Images</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Images
            </label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            {uploading && <p className="text-sm text-blue-600 mt-2">Uploading...</p>}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <Image
                  src={image}
                  alt={`Product ${index + 1}`}
                  width={200}
                  height={200}
                  className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                />
                <div className="absolute top-2 right-2 flex gap-1">
                  {image === primaryImage && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">Primary</span>
                  )}
                  {image !== primaryImage && (
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(image)}
                      className="bg-white text-gray-700 text-xs px-2 py-1 rounded hover:bg-gray-100"
                    >
                      Set Primary
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(image)}
                    className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing - Retail pricing disabled (Enable later if needed) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing & Inventory</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Retail pricing hidden - wholesale only */}
            {false && (
            <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retail Price *
              </label>
              <input
                type="number"
                value={formData.retailPrice}
                onChange={(e) => setFormData({ ...formData, retailPrice: parseFloat(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Price
              </label>
              <input
                type="number"
                value={formData.salePrice || ''}
                onChange={(e) => setFormData({ ...formData, salePrice: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Compare Price
              </label>
              <input
                type="number"
                value={formData.comparePrice || ''}
                onChange={(e) => setFormData({ ...formData, comparePrice: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
            </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity *
              </label>
              <input
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Order Quantity
              </label>
              <input
                type="number"
                value={formData.minOrderQuantity}
                onChange={(e) => setFormData({ ...formData, minOrderQuantity: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tags</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Add tag"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addTag}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span
                key={index}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-2"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-red-600 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <input
              type="text"
              value={newSpecKey}
              onChange={(e) => setNewSpecKey(e.target.value)}
              placeholder="Specification name"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newSpecValue}
              onChange={(e) => setNewSpecValue(e.target.value)}
              placeholder="Specification value"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={addSpecification}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Specification
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(formData.specifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <div>
                  <span className="font-medium text-gray-700">{key}:</span>
                  <span className="text-gray-600 ml-2">{value}</span>
                </div>
                <button
                  type="button"
                  onClick={() => removeSpecification(key)}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Featured Product</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.wholesaleEnabled}
                onChange={(e) => setFormData({ ...formData, wholesaleEnabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Enable Wholesale</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={addToHeroSlider}
                onChange={(e) => {
                  console.log('Hero slider checkbox toggled:', e.target.checked);
                  setAddToHeroSlider(e.target.checked);
                }}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">
                Add to Hero Slider
                {existingHeroSlide && <span className="text-xs text-green-600 ml-2">(Has slide)</span>}
              </span>
            </label>
          </div>

          {/* Debug Info - Remove this after testing */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
              <strong>Debug:</strong> addToHeroSlider={String(addToHeroSlider)}, 
              existingHeroSlide={existingHeroSlide ? 'Found' : 'None'}
            </div>
          )}

          {/* Hero Slider Settings */}
          {addToHeroSlider && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
              <h4 className="font-semibold text-blue-900">
                Hero Slider Settings
                {existingHeroSlide && <span className="text-xs ml-2">(Editing existing slide)</span>}
              </h4>
              
              {existingHeroSlide && (
                <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  ✓ This product already has a hero slide. Changes will update it.
                </p>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slide Title *
                </label>
                <input
                  type="text"
                  value={heroSlideTitle}
                  onChange={(e) => setHeroSlideTitle(e.target.value)}
                  placeholder="Featured Product! Limited Stock"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slide Subtitle
                </label>
                <input
                  type="text"
                  value={heroSlideSubtitle}
                  onChange={(e) => setHeroSlideSubtitle(e.target.value)}
                  placeholder="Special offer - Get it now!"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={heroSlideButtonText}
                    onChange={(e) => setHeroSlideButtonText(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={heroSlideBgColor}
                    onChange={(e) => setHeroSlideBgColor(e.target.value)}
                    className="w-full h-10 px-1 py-1 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <button
            type="button"
            onClick={() => setDeleteProductDialog(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            Delete Product
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* New Unit Modal */}
      {showNewUnitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Unit</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Name *
                </label>
                <input
                  type="text"
                  value={newUnitData.name}
                  onChange={(e) => setNewUnitData({ ...newUnitData, name: e.target.value })}
                  placeholder="e.g., Kilogram"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Symbol *
                </label>
                <input
                  type="text"
                  value={newUnitData.symbol}
                  onChange={(e) => setNewUnitData({ ...newUnitData, symbol: e.target.value })}
                  placeholder="e.g., kg"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <input
                  type="text"
                  value={newUnitData.description}
                  onChange={(e) => setNewUnitData({ ...newUnitData, description: e.target.value })}
                  placeholder="e.g., Weight measurement"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowNewUnitModal(false);
                  setNewUnitData({ name: '', symbol: '', description: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!newUnitData.name || !newUnitData.symbol) {
                    toast.error('Please fill in required fields');
                    return;
                  }

                  try {
                    const token = localStorage.getItem('token');
                    const response = await fetch('/api/units', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        name: newUnitData.name,
                        symbol: newUnitData.symbol,
                        description: newUnitData.description || null,
                        isActive: true,
                      }),
                    });

                    const result = await response.json();
                    if (result.success) {
                      toast.success('Unit created successfully');
                      await fetchUnits(); // Refresh units list
                      setFormData({ ...formData, unit: newUnitData.symbol }); // Set new unit as selected
                      setShowNewUnitModal(false);
                      setNewUnitData({ name: '', symbol: '', description: '' });
                    } else {
                      toast.error(result.error || 'Failed to create unit');
                    }
                  } catch (error) {
                    console.error('Error creating unit:', error);
                    toast.error('Failed to create unit');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Create Unit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Image Confirmation Dialog */}
      <ConfirmDialog
        isOpen={imageToDelete !== null}
        onClose={() => setImageToDelete(null)}
        onConfirm={confirmDeleteImage}
        title="Delete Image"
        message="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Delete Product Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteProductDialog}
        onClose={() => setDeleteProductDialog(false)}
        onConfirm={async () => {
          // Handle product deletion
          try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/products/${productId}`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            const result = await response.json();
            if (result.success) {
              toast.success('Product deleted successfully');
              setTimeout(() => {
                router.push('/admin/products');
              }, 1000);
            } else {
              const errorMsg = result.message || result.error || 'Failed to delete product';
              toast.error(errorMsg, { autoClose: 5000 });
              if (result.suggestion) {
                setTimeout(() => {
                  toast.info(result.suggestion, { autoClose: 7000 });
                }, 500);
              }
              setDeleteProductDialog(false);
            }
          } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete product');
            setDeleteProductDialog(false);
          }
        }}
        title="Delete Product"
        message={`Are you sure you want to delete "${formData.name}"? This action cannot be undone and will permanently remove the product from your store.`}
        confirmText="Delete Product"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}
