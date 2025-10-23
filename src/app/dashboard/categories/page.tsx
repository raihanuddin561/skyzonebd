'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import Header from "../../components/Header";

interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string;
  productsCount: number;
  isActive: boolean;
  createdAt: string;
}

function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    icon: "",
  });

  useEffect(() => {
    // TODO: Fetch from API
    const mockCategories: Category[] = [
      {
        id: 1,
        name: "Electronics",
        slug: "electronics",
        icon: "📱",
        productsCount: 25,
        isActive: true,
        createdAt: "2024-01-01T00:00:00"
      },
      {
        id: 2,
        name: "Baby Items",
        slug: "baby-items",
        icon: "👶",
        productsCount: 18,
        isActive: true,
        createdAt: "2024-01-02T00:00:00"
      },
      {
        id: 3,
        name: "Fashion",
        slug: "fashion",
        icon: "👗",
        productsCount: 32,
        isActive: true,
        createdAt: "2024-01-03T00:00:00"
      },
      {
        id: 4,
        name: "Home & Kitchen",
        slug: "home-kitchen",
        icon: "🏠",
        productsCount: 15,
        isActive: false,
        createdAt: "2024-01-04T00:00:00"
      }
    ];
    setCategories(mockCategories);
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingCategory) {
      // Update existing category
      setCategories(categories.map(cat => 
        cat.id === editingCategory.id 
          ? { ...cat, ...formData }
          : cat
      ));
      setEditingCategory(null);
    } else {
      // Add new category
      const newCategory: Category = {
        id: Math.max(...categories.map(c => c.id), 0) + 1,
        ...formData,
        productsCount: 0,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      setCategories([...categories, newCategory]);
    }
    
    setShowAddModal(false);
    setFormData({ name: "", slug: "", icon: "" });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      icon: category.icon,
    });
    setShowAddModal(true);
  };

  const handleDelete = (id: number) => {
    const category = categories.find(c => c.id === id);
    if (category && category.productsCount > 0) {
      alert(`Cannot delete category "${category.name}" because it has ${category.productsCount} products. Please reassign or remove products first.`);
      return;
    }
    
    if (confirm("Are you sure you want to delete this category?")) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const toggleActive = (id: number) => {
    setCategories(categories.map(cat => 
      cat.id === id ? { ...cat, isActive: !cat.isActive } : cat
    ));
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    });
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Categories Management</h1>
              <p className="text-gray-600 mt-1">Organize your product categories</p>
            </div>
            <button
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: "", slug: "", icon: "" });
                setShowAddModal(true);
              }}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Category
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {categories.filter(c => c.isActive).length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Products</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {categories.reduce((sum, c) => sum + c.productsCount, 0)}
              </p>
            </div>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="col-span-full text-center py-8 text-gray-500">
                No categories found. Add your first category!
              </div>
            ) : (
              categories.map((category) => (
                <div 
                  key={category.id} 
                  className={`bg-white rounded-lg shadow p-6 ${!category.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{category.icon}</div>
                      <div>
                        <h3 className="font-bold text-gray-900">{category.name}</h3>
                        <p className="text-sm text-gray-500">/{category.slug}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleActive(category.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        category.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {category.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-gray-900">{category.productsCount}</p>
                    <p className="text-sm text-gray-600">Products</p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Back Button */}
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g., Electronics"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g., electronics"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">URL-friendly version of the name</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., 📱"
                  required
                  maxLength={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCategory(null);
                    setFormData({ name: "", slug: "", icon: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {editingCategory ? 'Update' : 'Add'} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function CategoriesManagementPage() {
  return (
    <ProtectedRoute requireAuth={true} requiredRole="admin">
      <CategoriesManagement />
    </ProtectedRoute>
  );
}
