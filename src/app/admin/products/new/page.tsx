'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

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

export default function NewProduct() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [additionalImageFiles, setAdditionalImageFiles] = useState<File[]>([]);
  const [mainImagePreview, setMainImagePreview] = useState<string>('');
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(true);
  
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    sku: '',
    description: '',
    category: '',
    brand: '',
    unit: 'piece',
    
    // Pricing
    retailPrice: '',
    salePrice: '',
    retailMOQ: '1',
    
    // Wholesale
    wholesaleEnabled: false,
    wholesaleMOQ: '',
    wholesaleTiers: [
      { minQuantity: '50', maxQuantity: '99', price: '', discount: '' },
      { minQuantity: '100', maxQuantity: '499', price: '', discount: '' },
      { minQuantity: '500', maxQuantity: '', price: '', discount: '' },
    ],
    
    // Inventory
    stock: '',
    availability: 'in_stock',
    
    // Specifications
    specifications: [{ key: '', value: '' }],
    
    // SEO & Tags
    tags: '',
    featured: false,
    
    // Hero Slider
    addToHeroSlider: false,
    heroSlideTitle: '',
    heroSlideSubtitle: '',
    heroSlideButtonText: 'Shop Now',
    heroSlideBgColor: '#3B82F6',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleWholesaleTierChange = (index: number, field: string, value: string) => {
    const newTiers = [...formData.wholesaleTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, wholesaleTiers: newTiers });
  };

  const handleSpecificationChange = (index: number, field: 'key' | 'value', value: string) => {
    const newSpecs = [...formData.specifications];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    setFormData({ ...formData, specifications: newSpecs });
  };

  const addSpecification = () => {
    setFormData({
      ...formData,
      specifications: [...formData.specifications, { key: '', value: '' }]
    });
  };

  const removeSpecification = (index: number) => {
    const newSpecs = formData.specifications.filter((_, i) => i !== index);
    setFormData({ ...formData, specifications: newSpecs });
  };

  const handleMainImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMainImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMainImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAdditionalImageFiles(prev => [...prev, ...files]);
      
      // Create previews
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setAdditionalImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImageFiles(prev => prev.filter((_, i) => i !== index));
    setAdditionalImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const response = await fetch('/api/categories');
        const data = await response.json();
        
        if (data.success && data.data) {
          setCategories(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        toast.error('Failed to load categories');
      } finally {
        setLoadingCategories(false);
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
            { id: '1', name: 'Piece', symbol: 'piece', isActive: true },
            { id: '2', name: 'Kilogram', symbol: 'kg', isActive: true },
            { id: '3', name: 'Liter', symbol: 'liter', isActive: true },
            { id: '4', name: 'Meter', symbol: 'meter', isActive: true },
            { id: '5', name: 'Box', symbol: 'box', isActive: true },
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch units:', error);
        // Use default units if API fails
        setUnits([
          { id: '1', name: 'Piece', symbol: 'piece', isActive: true },
          { id: '2', name: 'Kilogram', symbol: 'kg', isActive: true },
          { id: '3', name: 'Liter', symbol: 'liter', isActive: true },
          { id: '4', name: 'Meter', symbol: 'meter', isActive: true },
          { id: '5', name: 'Box', symbol: 'box', isActive: true },
        ]);
      } finally {
        setLoadingUnits(false);
      }
    };

    fetchCategories();
    fetchUnits();
  }, []);

  const uploadImage = async (file: File, folder: string = 'products'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = localStorage.getItem('token');
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    const result = await response.json();
    return result.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.retailPrice || !formData.category) {
        toast.error('Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      if (!mainImageFile) {
        toast.error('Please upload a main product image');
        setIsSubmitting(false);
        return;
      }

      // Upload images ONLY when submitting
      toast.info('Uploading images...');
      const mainImageUrl = await uploadImage(mainImageFile, 'products');
      
      const additionalImageUrls: string[] = [];
      for (const file of additionalImageFiles) {
        const url = await uploadImage(file, 'products');
        additionalImageUrls.push(url);
      }

      // Prepare product data
      const productData = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku: formData.sku,
        description: formData.description,
        categoryId: formData.category,
        brand: formData.brand,
        unit: formData.unit || 'piece',
        retailPrice: parseFloat(formData.retailPrice),
        salePrice: formData.salePrice ? parseFloat(formData.salePrice) : null,
        retailMOQ: parseInt(formData.retailMOQ),
        price: parseFloat(formData.retailPrice), // For backward compatibility
        wholesaleEnabled: formData.wholesaleEnabled,
        wholesaleMOQ: formData.wholesaleMOQ ? parseInt(formData.wholesaleMOQ) : 5,
        stockQuantity: parseInt(formData.stock),
        availability: formData.availability,
        imageUrl: mainImageUrl,
        imageUrls: [mainImageUrl, ...additionalImageUrls],
        specifications: formData.specifications.reduce((acc, spec) => {
          if (spec.key && spec.value) {
            acc[spec.key] = spec.value;
          }
          return acc;
        }, {} as Record<string, string>),
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        isFeatured: formData.featured,
        minOrderQuantity: formData.wholesaleEnabled ? parseInt(formData.wholesaleMOQ || '5') : 1,
        // Include wholesale tiers if wholesale is enabled
        wholesaleTiers: formData.wholesaleEnabled ? formData.wholesaleTiers.filter(
          tier => tier.minQuantity && tier.price
        ) : [],
      };

      // Submit to API
      toast.info('Creating product...');
      const token = localStorage.getItem('token');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create product');
      }

      const result = await response.json();
      const createdProductId = result.data?.id;

      // If addToHeroSlider is checked, create a hero slide for this product
      if (formData.addToHeroSlider && createdProductId && formData.heroSlideTitle) {
        try {
          const heroSlideResponse = await fetch('/api/hero-slides', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: formData.heroSlideTitle,
              subtitle: formData.heroSlideSubtitle || null,
              imageUrl: mainImageUrl || '',
              linkUrl: `/products/${createdProductId}`,
              productId: createdProductId,
              buttonText: formData.heroSlideButtonText,
              bgColor: formData.heroSlideBgColor,
              textColor: '#FFFFFF',
              isActive: true,
            }),
          });

          if (heroSlideResponse.ok) {
            toast.success('Product added to hero slider!');
          }
        } catch (error) {
          console.error('Failed to create hero slide:', error);
          toast.warning('Product created but failed to add to hero slider');
        }
      }

      toast.success('Product created successfully!');
      router.push('/admin/products');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create product');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="text-gray-600 mt-1">Create a new product listing</p>
        </div>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Premium Bluetooth Headphones"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU *
              </label>
              <input
                type="text"
                name="sku"
                required
                value={formData.sku}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., ELEC-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={handleInputChange}
                disabled={loadingCategories}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingCategories ? 'Loading categories...' : 'Select Category'}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {categories.length === 0 && !loadingCategories && (
                <p className="text-xs text-red-500 mt-1">
                  No categories found. Please create categories first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Samsung"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                required
                disabled={loadingUnits}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
              {units.length === 0 && !loadingUnits && (
                <p className="text-xs text-red-500 mt-1">
                  No units found. Please create units first from Units Management.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">Unit of measurement for pricing</p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Detailed product description..."
              />
            </div>
          </div>
        </div>

        {/* Pricing - B2C */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Retail Pricing (B2C)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retail Price (৳) *
              </label>
              <input
                type="number"
                name="retailPrice"
                required
                value={formData.retailPrice}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sale Price (৳)
              </label>
              <input
                type="number"
                name="salePrice"
                value={formData.salePrice}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="4500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Retail MOQ
              </label>
              <input
                type="number"
                name="retailMOQ"
                value={formData.retailMOQ}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
          </div>
        </div>

        {/* Wholesale Pricing - B2B */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Wholesale Pricing (B2B)</h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="wholesaleEnabled"
                checked={formData.wholesaleEnabled}
                onChange={handleInputChange}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Enable Wholesale</span>
            </label>
          </div>

          {formData.wholesaleEnabled && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wholesale MOQ *
                </label>
                <input
                  type="number"
                  name="wholesaleMOQ"
                  value={formData.wholesaleMOQ}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Pricing Tiers (Alibaba-style Bulk Pricing)</h3>
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      wholesaleTiers: [...formData.wholesaleTiers, { minQuantity: '', maxQuantity: '', price: '', discount: '' }]
                    })}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Tier
                  </button>
                </div>
                <div className="text-sm text-gray-600 mb-3 p-3 bg-blue-50 rounded">
                  <strong>💡 Tip:</strong> Like Alibaba, create multiple price tiers. Example: "1-5 pcs: ৳20/pc", "6-10 pcs: ৳18/pc", "11+ pcs: ৳15/pc"
                </div>
                {formData.wholesaleTiers.map((tier, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Qty *
                      </label>
                      <input
                        type="number"
                        value={tier.minQuantity}
                        onChange={(e) => handleWholesaleTierChange(index, 'minQuantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., 1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Max Qty
                      </label>
                      <input
                        type="number"
                        value={tier.maxQuantity}
                        onChange={(e) => handleWholesaleTierChange(index, 'maxQuantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="Leave empty for ∞"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price/Piece (৳) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.price}
                        onChange={(e) => handleWholesaleTierChange(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={tier.discount}
                        onChange={(e) => handleWholesaleTierChange(index, 'discount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        placeholder="e.g., 10"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => {
                          const newTiers = formData.wholesaleTiers.filter((_, i) => i !== index);
                          setFormData({ ...formData, wholesaleTiers: newTiers });
                        }}
                        className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                {formData.wholesaleTiers.length === 0 && (
                  <div className="text-center p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 mb-2">No pricing tiers added yet</p>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        wholesaleTiers: [{ minQuantity: '1', maxQuantity: '5', price: '', discount: '' }]
                      })}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add First Tier
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Inventory */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stock Quantity *
              </label>
              <input
                type="number"
                name="stock"
                required
                value={formData.stock}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Availability *
              </label>
              <select
                name="availability"
                required
                value={formData.availability}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="in_stock">In Stock</option>
                <option value="limited">Limited Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Images */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Images</h2>
          
          {/* Main Image */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Main Image * <span className="text-gray-500 text-xs">(Will be uploaded when you submit)</span>
            </label>
            <div className="flex items-start gap-4">
              {mainImagePreview ? (
                <div className="relative">
                  <img 
                    src={mainImagePreview} 
                    alt="Main preview" 
                    className="w-32 h-32 object-cover rounded-lg border-2 border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setMainImageFile(null);
                      setMainImagePreview('');
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs text-gray-500 mt-1">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMainImageChange}
                    className="hidden"
                  />
                </label>
              )}
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  Upload a high-quality main product image. Recommended size: 800x800px or larger.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPG, PNG, WebP, GIF (Max 5MB)
                </p>
              </div>
            </div>
          </div>

          {/* Additional Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Images <span className="text-gray-500 text-xs">(Optional, will be uploaded when you submit)</span>
            </label>
            <div className="flex flex-wrap gap-4">
              {additionalImagePreviews.map((preview, index) => (
                <div key={index} className="relative">
                  <img 
                    src={preview} 
                    alt={`Additional ${index + 1}`} 
                    className="w-24 h-24 object-cover rounded-lg border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-gray-500 mt-1">Add</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleAdditionalImagesChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Add multiple product images to show different angles or details
            </p>
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Specifications</h2>
            <button
              type="button"
              onClick={addSpecification}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              + Add Specification
            </button>
          </div>

          <div className="space-y-3">
            {formData.specifications.map((spec, index) => (
              <div key={index} className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={spec.key}
                  onChange={(e) => handleSpecificationChange(index, 'key', e.target.value)}
                  placeholder="Key (e.g., Battery Life)"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                    placeholder="Value (e.g., 20 hours)"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpecification(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Additional Options */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Options</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="wireless, bluetooth, headphones"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleInputChange}
                className="rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700">
                Mark as Featured Product
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="addToHeroSlider"
                checked={formData.addToHeroSlider}
                onChange={handleInputChange}
                className="rounded border-gray-300"
              />
              <label className="text-sm font-medium text-gray-700">
                Add to Hero Slider (Homepage Banner)
              </label>
            </div>

            {/* Hero Slider Settings - Only show if addToHeroSlider is checked */}
            {formData.addToHeroSlider && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                <h4 className="font-semibold text-blue-900">Hero Slider Settings</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slide Title *
                  </label>
                  <input
                    type="text"
                    name="heroSlideTitle"
                    value={formData.heroSlideTitle}
                    onChange={handleInputChange}
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
                    name="heroSlideSubtitle"
                    value={formData.heroSlideSubtitle}
                    onChange={handleInputChange}
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
                      name="heroSlideButtonText"
                      value={formData.heroSlideButtonText}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Background Color
                    </label>
                    <input
                      type="color"
                      name="heroSlideBgColor"
                      value={formData.heroSlideBgColor}
                      onChange={handleInputChange}
                      className="w-full h-10 px-1 py-1 border rounded-lg"
                    />
                  </div>
                </div>

                <p className="text-sm text-blue-700">
                  💡 This product will be featured in the homepage hero slider with its image and details.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isSubmitting ? 'Creating Product...' : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
