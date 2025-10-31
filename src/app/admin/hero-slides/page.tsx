'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  retailPrice: number;
}

interface HeroSlide {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkUrl: string | null;
  productId: string | null;
  buttonText: string;
  position: number;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  product?: Product;
}

export default function HeroSlidesAdmin() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '',
    productId: '',
    buttonText: 'Shop Now',
    bgColor: '#3B82F6',
    textColor: '#FFFFFF',
  });

  useEffect(() => {
    if (!authLoading && (!user || user.role?.toUpperCase() !== 'ADMIN')) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role?.toUpperCase() === 'ADMIN') {
      fetchSlides();
      fetchProducts();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSlides = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/hero-slides', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSlides(data.data);
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
      toast.error('Failed to fetch slides');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const submitData = {
        ...formData,
        productId: formData.productId || null,
        linkUrl: formData.linkUrl || null,
        subtitle: formData.subtitle || null,
      };

      const url = editingId ? `/api/hero-slides/${editingId}` : '/api/hero-slides';
      const method = editingId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Hero slide ${editingId ? 'updated' : 'created'} successfully`);
        setShowForm(false);
        setEditingId(null);
        setFormData({
          title: '',
          subtitle: '',
          imageUrl: '',
          linkUrl: '',
          productId: '',
          buttonText: 'Shop Now',
          bgColor: '#3B82F6',
          textColor: '#FFFFFF',
        });
        fetchSlides();
      } else {
        toast.error(data.error || `Failed to ${editingId ? 'update' : 'create'} slide`);
      }
    } catch (error) {
      console.error('Error saving slide:', error);
      toast.error('Failed to save slide');
    }
  };

  const handleEdit = (slide: HeroSlide) => {
    setEditingId(slide.id);
    setFormData({
      title: slide.title,
      subtitle: slide.subtitle || '',
      imageUrl: slide.imageUrl,
      linkUrl: slide.linkUrl || '',
      productId: slide.productId || '',
      buttonText: slide.buttonText,
      bgColor: slide.bgColor,
      textColor: slide.textColor,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      if (data.success) {
        setFormData({ ...formData, imageUrl: data.url });
        toast.success('Image uploaded successfully');
      } else {
        toast.error('Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this slide?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/hero-slides/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Slide deleted successfully');
        fetchSlides();
      } else {
        toast.error('Failed to delete slide');
      }
    } catch (error) {
      console.error('Error deleting slide:', error);
      toast.error('Failed to delete slide');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/hero-slides/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(`Slide ${!currentStatus ? 'activated' : 'deactivated'}`);
        fetchSlides();
      }
    } catch (error) {
      console.error('Error toggling slide:', error);
      toast.error('Failed to update slide');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hero Slides Management</h1>
            <p className="text-gray-600 mt-2">Manage homepage banner slides</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
            >
              Back to Admin
            </Link>
            <button
              onClick={() => {
                if (showForm && editingId) {
                  setEditingId(null);
                  setFormData({
                    title: '',
                    subtitle: '',
                    imageUrl: '',
                    linkUrl: '',
                    productId: '',
                    buttonText: 'Shop Now',
                    bgColor: '#3B82F6',
                    textColor: '#FFFFFF',
                  });
                }
                setShowForm(!showForm);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              {showForm ? 'Cancel' : '+ Add New Slide'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Hero Slide' : 'Create New Hero Slide'}
            </h2>
            
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">💡 How Hero Slides Work:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>With Product:</strong> Product image & details shown on the right side</li>
                <li>• <strong>Without Product:</strong> Full-width banner with your custom image</li>
                <li>• <strong>Position:</strong> Lower numbers appear first in the slider</li>
                <li>• <strong>Active/Inactive:</strong> Only active slides are visible on homepage</li>
              </ul>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Slide title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Subtitle</label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Slide subtitle"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Image *</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {uploading && <p className="text-sm text-blue-600 mt-1">Uploading...</p>}
                {formData.imageUrl && (
                  <div className="mt-2">
                    <img src={formData.imageUrl} alt="Preview" className="w-32 h-20 object-cover rounded" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Or Image URL</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Link to Product (Product will be shown in hero slide)
                </label>
                <select
                  value={formData.productId}
                  onChange={(e) => {
                    const productId = e.target.value;
                    setFormData({ 
                      ...formData, 
                      productId,
                      linkUrl: productId ? `/products/${productId}` : ''
                    });
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">No product - Just banner with link</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - ৳{product.retailPrice}
                    </option>
                  ))}
                </select>
                {formData.productId && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Product will be displayed on the right side of the hero slide
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Or Custom Link URL</label>
                <input
                  type="text"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="/products or /categories/electronics"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Button Text</label>
                <input
                  type="text"
                  value={formData.buttonText}
                  onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Background Color</label>
                <input
                  type="color"
                  value={formData.bgColor}
                  onChange={(e) => setFormData({ ...formData, bgColor: e.target.value })}
                  className="w-full h-10 px-1 py-1 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Text Color</label>
                <input
                  type="color"
                  value={formData.textColor}
                  onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                  className="w-full h-10 px-1 py-1 border rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={uploading || !formData.imageUrl}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {editingId ? 'Update Slide' : 'Create Slide'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {slides.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No hero slides yet. Create your first slide!</p>
            </div>
          ) : (
            slides.map((slide) => (
              <div key={slide.id} className="bg-white rounded-lg shadow-md p-6 flex gap-6">
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="w-48 h-32 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{slide.title}</h3>
                  {slide.subtitle && <p className="text-gray-600 mb-2">{slide.subtitle}</p>}
                  {slide.product && (
                    <p className="text-sm text-blue-600 mb-2">
                      Linked to: {slide.product.name}
                    </p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Position: {slide.position}</span>
                    <span>Button: {slide.buttonText}</span>
                    <span className="flex items-center gap-1">
                      BG: <div className="w-4 h-4 rounded border" style={{ backgroundColor: slide.bgColor }}></div>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleActive(slide.id, slide.isActive)}
                    className={`px-4 py-2 rounded-lg transition ${
                      slide.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {slide.isActive ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => handleEdit(slide)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(slide.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
