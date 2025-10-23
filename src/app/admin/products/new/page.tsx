'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export default function NewProduct() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    sku: '',
    description: '',
    category: '',
    brand: '',
    
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
    
    // Images
    mainImage: '',
    additionalImages: [''],
    
    // Specifications
    specifications: [{ key: '', value: '' }],
    
    // SEO & Tags
    tags: '',
    featured: false,
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

      // TODO: Submit to API
      console.log('Submitting product:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Product created successfully!');
      router.push('/admin/products');
    } catch (error) {
      toast.error('Failed to create product');
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Category</option>
                <option value="electronics">Electronics</option>
                <option value="baby-items">Baby Items</option>
                <option value="clothing">Clothing</option>
                <option value="home-garden">Home & Garden</option>
              </select>
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
                <h3 className="font-medium text-gray-900">Pricing Tiers</h3>
                {formData.wholesaleTiers.map((tier, index) => (
                  <div key={index} className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Min Qty
                      </label>
                      <input
                        type="number"
                        value={tier.minQuantity}
                        onChange={(e) => handleWholesaleTierChange(index, 'minQuantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
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
                        placeholder="Leave empty for unlimited"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Price (৳)
                      </label>
                      <input
                        type="number"
                        value={tier.price}
                        onChange={(e) => handleWholesaleTierChange(index, 'price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Discount (%)
                      </label>
                      <input
                        type="number"
                        value={tier.discount}
                        onChange={(e) => handleWholesaleTierChange(index, 'discount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                ))}
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
