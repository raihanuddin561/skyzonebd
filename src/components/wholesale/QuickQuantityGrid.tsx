'use client'

import { useState } from 'react';
import { Product } from '@/types/cart';
import { toast } from 'react-toastify';

interface QuickQuantityGridProps {
  products: Product[];
  onBulkAdd: (items: { productId: string; quantity: number }[]) => void;
  userType?: 'WHOLESALE' | 'RETAIL' | null;
}

export default function QuickQuantityGrid({ products, onBulkAdd, userType }: QuickQuantityGridProps) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleQuantityChange = (productId: string | number, value: string) => {
    const numValue = parseInt(value) || 0;
    if (numValue >= 0) {
      setQuantities(prev => ({
        ...prev,
        [String(productId)]: numValue
      }));
    }
  };

  const handleQuickSet = (productId: string | number, quantity: number, product: Product) => {
    const moq = (userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1;
    const finalQty = Math.max(quantity, moq);
    
    setQuantities(prev => ({
      ...prev,
      [String(productId)]: finalQty
    }));
  };

  const getEffectiveMOQ = (product: Product) => {
    return (userType === 'WHOLESALE' && product.minOrderQuantity) ? product.minOrderQuantity : 1;
  };

  const handleBulkAdd = async () => {
    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({
        productId: String(productId),
        quantity
      }));

    if (items.length === 0) {
      toast.warning('Please enter quantities for at least one product');
      return;
    }

    // Validate MOQ for wholesale users
    if (userType === 'WHOLESALE') {
      const invalidItems = items.filter(item => {
        const product = products.find(p => String(p.id) === item.productId);
        const moq = product?.minOrderQuantity || 1;
        return item.quantity < moq;
      });

      if (invalidItems.length > 0) {
        toast.error('Some quantities are below minimum order quantity');
        return;
      }
    }

    setIsProcessing(true);
    try {
      await onBulkAdd(items);
      // Clear quantities after successful add
      setQuantities({});
    } finally {
      setIsProcessing(false);
    }
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const getTotalValue = () => {
    return Object.entries(quantities).reduce((sum, [productId, qty]) => {
      const product = products.find(p => String(p.id) === String(productId));
      return sum + (product ? product.price * qty : 0);
    }, 0);
  };

  const selectedCount = Object.entries(quantities).filter(([_, qty]) => qty > 0).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Quick Order Grid
            </h3>
            <p className="text-sm text-blue-100 mt-1">Enter quantities and add multiple products at once</p>
          </div>
          {selectedCount > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold">{getTotalItems()}</div>
              <div className="text-sm text-blue-100">items selected</div>
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 max-h-[600px] overflow-y-auto">
          {products.map((product) => {
            const moq = getEffectiveMOQ(product);
              const currentQty = quantities[String(product.id)] || 0;
            const isInvalid = currentQty > 0 && currentQty < moq;

            return (
              <div 
                key={product.id}
                className={`flex items-center gap-4 p-4 border rounded-lg transition-all ${
                  currentQty > 0 ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                } ${isInvalid ? 'border-red-300 bg-red-50' : ''}`}
              >
                {/* Product Image */}
                <div className="w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-contain p-1"
                  />
                </div>

                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{product.name}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm">
                    <span className="text-blue-600 font-bold">৳{product.price.toLocaleString()}</span>
                    {userType === 'WHOLESALE' && moq > 1 && (
                      <span className="text-gray-500">MOQ: {moq}</span>
                    )}
                    {product.availability === 'in_stock' && (
                      <span className="text-green-600 text-xs">✓ In Stock</span>
                    )}
                  </div>
                </div>

                {/* Quick Set Buttons */}
                {userType === 'WHOLESALE' && (
                  <div className="flex gap-1 flex-shrink-0">
                    {[moq, moq * 2, moq * 5].map((qty) => (
                      <button
                        key={qty}
                        onClick={() => handleQuickSet(product.id, qty, product)}
                        className="px-2 py-1 text-xs font-medium bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded border border-gray-300 transition-colors"
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                )}

                {/* Quantity Input */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => {
                      const newQty = Math.max(0, currentQty - moq);
                      setQuantities(prev => ({ ...prev, [String(product.id)]: newQty }));
                    }}
                    disabled={currentQty === 0}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed rounded border border-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                    </svg>
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={currentQty || ''}
                    onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                    placeholder="0"
                    className={`w-20 text-center px-2 py-1.5 border rounded font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isInvalid ? 'border-red-300 text-red-600' : 'border-gray-300'
                    }`}
                  />

                  <button
                    onClick={() => {
                      const newQty = currentQty + moq;
                      setQuantities(prev => ({ ...prev, [String(product.id)]: newQty }));
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Subtotal */}
                {currentQty > 0 && (
                  <div className="text-right w-24 flex-shrink-0">
                    <div className="font-bold text-gray-900">৳{(product.price * currentQty).toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{currentQty} × ৳{product.price}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      {selectedCount > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-gray-600">Total Value</div>
              <div className="text-2xl font-bold text-gray-900">৳{getTotalValue().toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">Selected Products</div>
              <div className="text-xl font-bold text-gray-900">{selectedCount} / {products.length}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setQuantities({})}
              className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={handleBulkAdd}
              disabled={isProcessing}
              className="flex-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Add {getTotalItems()} Items to Cart
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
