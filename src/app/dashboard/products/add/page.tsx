'use client';

import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MultiImageUpload from '@/app/components/MultiImageUpload';
import Header from '@/app/components/Header';
import ProtectedRoute from '@/app/components/ProtectedRoute';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function AddProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    categoryId: '',
    brand: '',
    retailPrice: '',
    baseWholesalePrice: '',
    imageUrls: [] as string[],
    stock: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchCategories();
    // Detect if mobile device
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(mobile);
      console.log('Device type:', mobile ? 'Mobile' : 'Desktop');
    };
    checkMobile();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleImageUpload = (urls: string[]) => {
    setProductData({ ...productData, imageUrls: urls });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to add products');
        setLoading(false);
        return;
      }

      // Validate required fields
      if (!productData.name || !productData.retailPrice || !productData.categoryId || productData.imageUrls.length === 0) {
        toast.error('Please fill in all required fields and upload at least one image');
        setLoading(false);
        return;
      }

      // Auto-generate slug from product name
      const slug = productData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Get the first image as primary imageUrl
      const imageUrl = productData.imageUrls[0];

      const payload = {
        name: productData.name,
        slug: slug,
        description: productData.description,
        categoryId: productData.categoryId,
        brand: productData.brand,
        retailPrice: parseFloat(productData.retailPrice),
        price: parseFloat(productData.retailPrice), // Required field
        imageUrl: imageUrl, // Required field
        baseWholesalePrice: productData.baseWholesalePrice ? parseFloat(productData.baseWholesalePrice) : null,
        imageUrls: productData.imageUrls,
        stockQuantity: productData.stock ? parseInt(productData.stock) : 0,
        tags: productData.tags.split(',').map((t) => t.trim()).filter(Boolean),
        isFeatured: false,
        isActive: true,
      };

      console.log('📤 Submitting product:', payload);

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', response.status);
      
      let result;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
        console.log('📥 Response data:', result);
      } else {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error('Server returned invalid response');
      }

      if (!response.ok) {
        throw new Error(result?.error || result?.details || 'Failed to create product');
      }

      if (result.success) {
        toast.success('Product created successfully! 🎉');
        // Reset form
        setProductData({
          name: '',
          description: '',
          categoryId: '',
          brand: '',
          retailPrice: '',
          baseWholesalePrice: '',
          imageUrls: [],
          stock: '',
          tags: '',
        });
      } else {
        throw new Error(result.error || result.details || 'Failed to create product');
      }
    } catch (error) {
      console.error('Error creating product:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create product';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <Header />
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Product</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Product Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Images * {isMobile && <span className="text-xs text-blue-600">(Mobile Mode)</span>}
                </label>
                <MultiImageUpload
                  onUploadComplete={handleImageUpload}
                  folder="products"
                  currentImages={productData.imageUrls}
                  maxImages={5}
                  maxSizeMB={isMobile ? 3.5 : 3}
                  skipProcessing={isMobile}
                />
                {isMobile && (
                  <p className="text-xs text-orange-600 mt-1">
                    💡 Mobile Tip: Images must be under 3.5MB. Use a photo compression app first for best results.
                  </p>
                )}
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={productData.description}
                  onChange={(e) => setProductData({ ...productData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category and Brand */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={productData.categoryId}
                    onChange={(e) => setProductData({ ...productData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
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
                    value={productData.brand}
                    onChange={(e) => setProductData({ ...productData, brand: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Retail Price (৳) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productData.retailPrice}
                    onChange={(e) => setProductData({ ...productData, retailPrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wholesale Price (৳)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={productData.baseWholesalePrice}
                    onChange={(e) => setProductData({ ...productData, baseWholesalePrice: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stock Quantity
                </label>
                <input
                  type="number"
                  value={productData.stock}
                  onChange={(e) => setProductData({ ...productData, stock: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={productData.tags}
                  onChange={(e) => setProductData({ ...productData, tags: e.target.value })}
                  placeholder="e.g., new, bestseller, featured"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium"
                >
                  {loading ? 'Creating...' : 'Create Product'}
                </button>
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
