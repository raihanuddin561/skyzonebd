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

interface WholesaleTierForm {
  minQuantity: string;
  maxQuantity: string;
  price: string;
  discount: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  brand: string;
  unit: string;
  sku: string;
  basePrice: number;
  wholesalePrice: number;
  minOrderQuantity: number;
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
    basePrice: 0,
    wholesalePrice: 0,
    minOrderQuantity: 1,
    tags: [],
    specifications: {},
    isFeatured: false,
    isActive: true,
    metaTitle: '',
    metaDescription: '',
  });

  const [wholesaleTiers, setWholesaleTiers] = useState<WholesaleTierForm[]>([]);

  // Stock is managed separately from the rest of the form — it's an audited
  // event (who changed it, why, by how much), not a plain field to overwrite
  // as a side effect of saving unrelated product details.
  const [currentStock, setCurrentStock] = useState(0);
  const [stockModal, setStockModal] = useState<{ isOpen: boolean; type: 'add' | 'remove' | 'set'; quantity: string; reason: string }>({
    isOpen: false,
    type: 'add',
    quantity: '',
    reason: '',
  });
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);

  const [images, setImages] = useState<string[]>([]);
  const [primaryImage, setPrimaryImage] = useState<string>('');
  const [newTag, setNewTag] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [deleteProductDialog, setDeleteProductDialog] = useState(false);
  const [deactivateDialog, setDeactivateDialog] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

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
          basePrice: product.basePrice || 0,
          wholesalePrice: product.wholesalePrice || 0,
          // A product with no MOQ set (null) has no minimum, not a minimum of
          // zero -- defaulting to 0 here would fail the backend's "MOQ must
          // be greater than 0" rule the moment this form is saved unchanged.
          minOrderQuantity: product.minOrderQuantity || 1,
          tags: product.tags || [],
          specifications: product.specifications || {},
          isFeatured: product.isFeatured || false,
          isActive: product.isActive ?? true,
          metaTitle: product.metaTitle || '',
          metaDescription: product.metaDescription || '',
        });

        setCurrentStock(product.stockQuantity || 0);
        setWholesaleTiers(
          (product.wholesaleTiers || []).map((tier: any) => ({
            minQuantity: String(tier.minQuantity ?? ''),
            maxQuantity: tier.maxQuantity != null ? String(tier.maxQuantity) : '',
            price: String(tier.price ?? ''),
            discount: tier.discount != null ? String(tier.discount) : '',
          }))
        );

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

  const addWholesaleTier = () => {
    setWholesaleTiers([...wholesaleTiers, { minQuantity: '', maxQuantity: '', price: '', discount: '' }]);
  };

  const updateWholesaleTier = (index: number, field: keyof WholesaleTierForm, value: string) => {
    const next = [...wholesaleTiers];
    next[index] = { ...next[index], [field]: value };
    setWholesaleTiers(next);
  };

  const removeWholesaleTier = (index: number) => {
    setWholesaleTiers(wholesaleTiers.filter((_, i) => i !== index));
  };

  const validatePricing = (): string | null => {
    if (!Number.isFinite(formData.basePrice) || formData.basePrice <= 0) {
      return 'Base Price must be greater than 0';
    }
    if (!Number.isFinite(formData.wholesalePrice) || formData.wholesalePrice <= formData.basePrice) {
      return `Wholesale Price (৳${formData.wholesalePrice}) must be greater than Base Price (৳${formData.basePrice})`;
    }
    if (!Number.isFinite(formData.minOrderQuantity) || formData.minOrderQuantity < 1) {
      return 'Minimum Order Quantity must be at least 1';
    }
    for (const tier of wholesaleTiers) {
      if (!tier.minQuantity || !tier.price) continue;
      const tierPrice = parseFloat(tier.price);
      if (tierPrice <= formData.basePrice) {
        return `A wholesale tier's price (৳${tierPrice}) must be greater than Base Price (৳${formData.basePrice})`;
      }
      if (tierPrice > formData.wholesalePrice) {
        return `A wholesale tier's price (৳${tierPrice}) cannot exceed Wholesale Price (৳${formData.wholesalePrice})`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pricingError = validatePricing();
    if (pricingError) {
      toast.error(pricingError);
      return;
    }

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
          wholesaleTiers,
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

  const handleAdjustStock = async () => {
    const quantity = parseInt(stockModal.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error('Enter a valid quantity');
      return;
    }
    if (!stockModal.reason || stockModal.reason.trim().length < 5) {
      toast.error('Reason is required and must be at least 5 characters');
      return;
    }

    setIsAdjustingStock(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/stock/adjust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId,
          adjustmentType: stockModal.type,
          quantity,
          reason: stockModal.reason.trim(),
        }),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setCurrentStock(result.newStock);
        toast.success(`Stock updated: ${result.previousStock} → ${result.newStock} units`);
        setStockModal({ isOpen: false, type: 'add', quantity: '', reason: '' });
      } else {
        toast.error(result.error || (result.details ? result.details.join(', ') : 'Failed to adjust stock'));
      }
    } catch (error) {
      console.error('Stock adjustment error:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setIsAdjustingStock(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);
    try {
      const token = localStorage.getItem('token');
      const newActiveState = !formData.isActive;

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...formData, isActive: newActiveState }),
      });

      const result = await response.json();
      if (result.success) {
        setFormData({ ...formData, isActive: newActiveState });
        toast.success(`Product ${newActiveState ? 'activated' : 'deactivated'} successfully`);
        setDeactivateDialog(false);
      } else {
        toast.error(result.error || 'Failed to update product status');
        setDeactivateDialog(false);
      }
    } catch (error) {
      console.error('Deactivate error:', error);
      toast.error('Failed to update product status');
      setDeactivateDialog(false);
    } finally {
      setIsDeactivating(false);
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

        {/* Pricing */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price (Cost) *
              </label>
              <input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">What the platform pays for this product</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Wholesale Price (Selling Price) *
              </label>
              <input
                type="number"
                value={formData.wholesalePrice}
                onChange={(e) => setFormData({ ...formData, wholesalePrice: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="0"
                step="0.01"
              />
              <p className="text-xs text-gray-500 mt-1">Must be greater than base price</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Order Quantity *
              </label>
              <input
                type="number"
                value={formData.minOrderQuantity}
                onChange={(e) => setFormData({ ...formData, minOrderQuantity: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                min="1"
              />
            </div>
          </div>

          {/* Wholesale Tiers */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Volume Pricing Tiers (optional)</h3>
              <button
                type="button"
                onClick={addWholesaleTier}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + Add Tier
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Give a lower per-unit price at higher quantities, e.g. &quot;50-99 units: ৳18&quot;, &quot;100+ units: ৳15&quot;.
            </p>

            {wholesaleTiers.length === 0 ? (
              <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No volume pricing tiers configured</p>
              </div>
            ) : (
              <div className="space-y-3">
                {wholesaleTiers.map((tier, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Min Qty *</label>
                      <input
                        type="number"
                        value={tier.minQuantity}
                        onChange={(e) => updateWholesaleTier(index, 'minQuantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., 50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Max Qty</label>
                      <input
                        type="number"
                        value={tier.maxQuantity}
                        onChange={(e) => updateWholesaleTier(index, 'maxQuantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="Leave empty for ∞"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Price/Unit (৳) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) => updateWholesaleTier(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Discount (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.discount}
                        onChange={(e) => updateWholesaleTier(index, 'discount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeWholesaleTier(index)}
                        className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm text-gray-600">Current Stock</p>
              <p className="text-2xl font-bold text-gray-900">{currentStock} units</p>
            </div>
            <button
              type="button"
              onClick={() => setStockModal({ isOpen: true, type: 'add', quantity: '', reason: '' })}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Adjust Stock
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Stock changes are logged with a reason so every adjustment can be audited later.
          </p>
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
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setDeactivateDialog(true)}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all shadow-sm ${
                formData.isActive
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
              }`}
            >
              {formData.isActive ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Deactivate Product
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Activate Product
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeleteProductDialog(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-medium transition-all shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete Product
            </button>
          </div>
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

      {/* Adjust Stock Modal */}
      {stockModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !isAdjustingStock) setStockModal({ ...stockModal, isOpen: false }); }}
        >
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">Adjust Stock</h3>
            <p className="text-sm text-gray-600 mb-4">Current stock: <span className="font-semibold">{currentStock} units</span></p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['add', 'remove', 'set'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setStockModal({ ...stockModal, type })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                        stockModal.type === type
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type === 'add' ? 'Add' : type === 'remove' ? 'Remove' : 'Set To'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {stockModal.type === 'set' ? 'New Stock Quantity' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={stockModal.quantity}
                  onChange={(e) => setStockModal({ ...stockModal, quantity: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 50"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <input
                  type="text"
                  value={stockModal.reason}
                  onChange={(e) => setStockModal({ ...stockModal, reason: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Received new shipment from supplier"
                />
                <p className="text-xs text-gray-500 mt-1">At least 5 characters. Recorded in the inventory audit log.</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStockModal({ ...stockModal, isOpen: false })}
                disabled={isAdjustingStock}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdjustStock}
                disabled={isAdjustingStock || !stockModal.quantity}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {isAdjustingStock ? 'Saving...' : 'Confirm Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deactivateDialog}
        onClose={() => !isDeactivating && setDeactivateDialog(false)}
        onConfirm={handleDeactivate}
        title={formData.isActive ? 'Deactivate Product' : 'Activate Product'}
        message={formData.isActive
          ? `Are you sure you want to deactivate "${formData.name}"? The product will be hidden from customers but will remain in the system for order history.`
          : `Are you sure you want to activate "${formData.name}"? The product will become visible to customers again.`
        }
        confirmText={formData.isActive ? 'Deactivate' : 'Activate'}
        cancelText="Cancel"
        type={formData.isActive ? 'warning' : 'info'}
        isLoading={isDeactivating}
      />

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
