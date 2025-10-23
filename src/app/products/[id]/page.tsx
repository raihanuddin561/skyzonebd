'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useProduct, useRelatedProducts } from '@/hooks/useProducts';
import { Product } from '@/types/cart';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const productId = parseInt(params.id as string);
  
  const { product, loading: productLoading } = useProduct(productId);
  const { products: relatedProducts, loading: relatedLoading } = useRelatedProducts(productId);
  
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('description');

  useEffect(() => {
    if (product) {
      // Set quantity based on user type: ONLY wholesale uses MOQ, guests/retail always start at 1
      const initialQty = (user && user.userType === 'wholesale') ? product.minOrderQuantity : 1;
      setQuantity(initialQty);
      setSelectedImage(product.imageUrl);
    } else if (!productLoading && !product) {
      router.push('/products');
    }
  }, [product, productLoading, router, user]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    setIsAdding(true);
    
    try {
      addToCart(product, quantity);
      toast.success(`Added ${quantity} ${product.name}(s) to cart`);
    } catch (error) {
      toast.error('Failed to add item to cart');
      console.error('Error adding to cart:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (product) {
      // Enforce MOQ ONLY for wholesale users, guests/retail can order from 1
      const minQty = (user && user.userType === 'wholesale') ? product.minOrderQuantity : 1;
      setQuantity(Math.max(newQuantity, minQty));
    }
  };

  const calculateTotalPrice = () => {
    if (!product) return 0;
    
    // Check for bulk pricing
    if (product.bulkPricing) {
      const applicablePricing = product.bulkPricing
        .filter(bp => quantity >= bp.quantity)
        .sort((a, b) => b.quantity - a.quantity)[0];
      
      if (applicablePricing) {
        return applicablePricing.price * quantity;
      }
    }
    
    return product.price * quantity;
  };

  if (productLoading || !product) {
    return (
      <main className="min-h-screen bg-white">
        <Header />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading product details...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <Header />
      
      {/* Breadcrumb */}
      <div className="bg-gray-50 py-4">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-700">Home</Link>
            <span className="text-gray-500">/</span>
            <Link href="/products" className="text-blue-600 hover:text-blue-700">Products</Link>
            <span className="text-gray-500">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Product Images */}
          <div>
            <div className="mb-4">
              <Image
                src={selectedImage}
                alt={product.name}
                width={600}
                height={400}
                className="w-full h-96 object-cover rounded-lg border"
              />
            </div>
            
            {/* Image Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(image)}
                    className={`flex-shrink-0 w-20 h-20 rounded border-2 ${
                      selectedImage === image ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <div className="mb-4">
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 mb-4">
                {product.rating && (
                  <div className="flex items-center">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.floor(product.rating!) ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600">
                      {product.rating} ({product.reviews} reviews)
                    </span>
                  </div>
                )}
                <span className={`px-2 py-1 rounded text-sm ${
                  product.availability === 'in_stock' 
                    ? 'bg-green-100 text-green-800' 
                    : product.availability === 'limited'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {product.availability === 'in_stock' ? 'In Stock' : 
                   product.availability === 'limited' ? 'Limited Stock' : 'Out of Stock'}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-3xl font-bold text-blue-600">৳{product.price.toLocaleString()}</span>
                {product.discount && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                    {product.discount}% OFF
                  </span>
                )}
              </div>
              {/* Show MOQ ONLY for wholesale users, NOT for guests or retail */}
              {(user && user.userType === 'wholesale') && (
                <p className="text-sm text-gray-600">
                  Minimum Order Quantity: {product.minOrderQuantity} units
                </p>
              )}
              {product.stock && (
                <p className="text-sm text-gray-600">
                  Available Stock: {product.stock} units
                </p>
              )}
            </div>

            {/* Bulk Pricing */}
            {product.bulkPricing && (
              <div className="mb-6">
                <h3 className="font-semibold mb-2">Bulk Pricing</h3>
                <div className="grid grid-cols-2 gap-2">
                  {product.bulkPricing.map((pricing, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                      <span className="font-medium">{pricing.quantity}+ units:</span>
                      <span className="text-blue-600 ml-2">৳{pricing.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Add to Cart */}
            <div className="mb-6">
              {product.availability === 'in_stock' || product.availability === 'limited' ? (
                <>
                  <div className="flex items-center gap-4 mb-4">
                    <div>
                      <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                        Quantity {(user && user.userType === 'wholesale') ? `(Min: ${product.minOrderQuantity})` : ''}
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        min={(user && user.userType === 'wholesale') ? product.minOrderQuantity : 1}
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || ((user && user.userType === 'wholesale') ? product.minOrderQuantity : 1))}
                        className="w-24 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Total Price</p>
                      <p className="text-xl font-bold text-blue-600">
                        ৳{calculateTotalPrice().toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleAddToCart}
                    disabled={isAdding}
                    className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAdding ? 'Adding...' : 'Add to Cart'}
                  </button>
                  
                  {product.availability === 'limited' && (
                    <p className="text-sm text-yellow-600 mt-2 text-center">
                      ⚠ Limited stock available - Order soon!
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <button
                    disabled
                    className="w-full py-3 px-6 rounded-lg font-semibold bg-gray-300 text-gray-600 cursor-not-allowed mb-2"
                  >
                    Out of Stock
                  </button>
                  <p className="text-sm text-red-600">
                    This product is currently unavailable. Please check back later.
                  </p>
                  <button
                    onClick={() => toast.info('We will notify you when this product is back in stock')}
                    className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                  >
                    Notify Me When Available
                  </button>
                </div>
              )}
            </div>

            {/* Company Info */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Seller Information</h3>
              <div className="flex items-center gap-4">
                {product.companyLogo && (
                  <Image
                    src={product.companyLogo}
                    alt={product.companyName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">{product.companyName}</p>
                  {product.companyLocation && (
                    <p className="text-sm text-gray-600">{product.companyLocation}</p>
                  )}
                  {product.companyVerified && (
                    <span className="inline-flex items-center text-sm text-green-600">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Seller
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="mt-12">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {['description', 'specifications', 'shipping', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-8">
            {activeTab === 'description' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Description</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
                
                {product.tags && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-2">Tags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Product Specifications</h3>
                {product.specifications ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <div key={key} className="flex border-b pb-2">
                        <span className="font-medium text-gray-700 w-1/2">{key}:</span>
                        <span className="text-gray-600 w-1/2">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No specifications available</p>
                )}
              </div>
            )}

            {activeTab === 'shipping' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Shipping & Returns</h3>
                <div className="space-y-4">
                  {product.leadTime && (
                    <div>
                      <h4 className="font-medium">Lead Time:</h4>
                      <p className="text-gray-600">{product.leadTime}</p>
                    </div>
                  )}
                  {product.shippingInfo && (
                    <div>
                      <h4 className="font-medium">Shipping Information:</h4>
                      <p className="text-gray-600">{product.shippingInfo}</p>
                    </div>
                  )}
                  {product.returnPolicy && (
                    <div>
                      <h4 className="font-medium">Return Policy:</h4>
                      <p className="text-gray-600">{product.returnPolicy}</p>
                    </div>
                  )}
                  {product.warranty && (
                    <div>
                      <h4 className="font-medium">Warranty:</h4>
                      <p className="text-gray-600">{product.warranty}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
                {product.rating && product.reviews ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">{product.rating}/5</div>
                    <div className="flex justify-center text-yellow-400 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < Math.floor(product.rating!) ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="text-gray-600">{product.reviews} reviews</p>
                    <p className="text-gray-500 mt-4">Review system coming soon...</p>
                  </div>
                ) : (
                  <p className="text-gray-500">No reviews available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h3 className="text-2xl font-semibold mb-8">Related Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.id}`}
                  className="group"
                >
                  <div className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <Image
                      src={relatedProduct.imageUrl}
                      alt={relatedProduct.name}
                      width={200}
                      height={150}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                    <h4 className="font-medium group-hover:text-blue-600 truncate">
                      {relatedProduct.name}
                    </h4>
                    <p className="text-blue-600 font-bold">৳{relatedProduct.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">{relatedProduct.companyName}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
