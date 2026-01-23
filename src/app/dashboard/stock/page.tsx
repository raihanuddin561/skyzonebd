'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import ProtectedRoute from "../../components/ProtectedRoute";
import Header from "../../components/Header";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface StockItem {
  id: string | number;
  productId: string | number;
  productName: string;
  sku: string;
  categoryName: string;
  imageUrl: string;
  
  // Stock Information
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  inTransit: number;
  damaged: number;
  
  // Warehouse Information
  warehouseLocations: {
    warehouse: string;
    quantity: number;
    location: string;
  }[];
  
  // Reorder Information
  reorderPoint: number;
  reorderQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  
  // Sales Information
  avgDailySales: number;
  daysOfStock: number;
  
  // Status
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
  
  lastRestocked: string;
  lastSold: string;
}

interface StockTransaction {
  id: number;
  productName: string;
  type: 'in' | 'out' | 'adjustment' | 'return' | 'damage';
  quantity: number;
  reason: string;
  warehouse: string;
  performedBy: string;
  timestamp: string;
}

function StockManagement() {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inventory' | 'transactions' | 'alerts'>('inventory');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterWarehouse, setFilterWarehouse] = useState("all");
  
  // Stock Adjustment Modal
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [adjustmentData, setAdjustmentData] = useState({
    type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    warehouse: '',
    reason: '',
  });

  useEffect(() => {
    fetchStockData();
  }, []);

  const fetchStockData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch products from API
      const response = await fetch('/api/products', {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        const transformedStockItems: StockItem[] = result.data.products.map((product: any) => {
          const stock = product.stockQuantity || 0;
          const moq = product.minOrderQuantity || 1;
          const reorderPoint = Math.max(moq * 2, 10); // Reorder when stock reaches 2x MOQ or minimum 10
          const avgDailySales = Math.floor(Math.random() * 10) + 5; // Simulated - would come from sales data
          const daysOfStock = stock > 0 ? Math.floor(stock / avgDailySales) : 0;
          
          // Determine stock status
          let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
          if (stock === 0) {
            stockStatus = 'out_of_stock';
          } else if (stock <= reorderPoint) {
            stockStatus = 'low_stock';
          } else if (stock > reorderPoint * 10) {
            stockStatus = 'overstock';
          } else {
            stockStatus = 'in_stock';
          }
          
          return {
            id: product.id,
            productId: product.id,
            productName: product.name,
            sku: product.sku || `SKU-${product.id.substring(0, 8).toUpperCase()}`,
            categoryName: product.category?.name || 'Uncategorized',
            imageUrl: product.imageUrl || '/images/placeholder.jpg',
            totalStock: stock,
            availableStock: stock,
            reservedStock: 0, // Would come from order data
            inTransit: 0, // Would come from purchase orders
            damaged: 0,
            warehouseLocations: [
              { warehouse: "Main Warehouse", quantity: stock, location: "Default" }
            ],
            reorderPoint: reorderPoint,
            reorderQuantity: moq * 5,
            minStockLevel: moq,
            maxStockLevel: reorderPoint * 20,
            avgDailySales: avgDailySales,
            daysOfStock: daysOfStock,
            stockStatus: stockStatus,
            lastRestocked: product.updatedAt || product.createdAt,
            lastSold: product.updatedAt || product.createdAt,
          };
        });
        
        setStockItems(transformedStockItems);
        
        // Initialize empty transactions (would be fetched from separate endpoint)
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStockItems = stockItems.filter(item => {
    const matchesSearch = 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || item.stockStatus === filterStatus;
    const matchesWarehouse = filterWarehouse === "all" || 
      item.warehouseLocations.some(loc => loc.warehouse === filterWarehouse);
    return matchesSearch && matchesStatus && matchesWarehouse;
  });

  const lowStockItems = stockItems.filter(item => 
    item.availableStock <= item.reorderPoint
  );

  const outOfStockItems = stockItems.filter(item => 
    item.availableStock === 0
  );

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to adjust stock');
        return;
      }

      // Calculate new stock quantity
      const quantityChange = adjustmentData.type === 'in' 
        ? adjustmentData.quantity 
        : -adjustmentData.quantity;
      
      const newStockQuantity = Math.max(0, selectedProduct.totalStock + quantityChange);

      // Update product stock via API
      const response = await fetch(`/api/products/${selectedProduct.productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stockQuantity: newStockQuantity
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Create transaction record
        const newTransaction: StockTransaction = {
          id: transactions.length + 1,
          productName: selectedProduct.productName,
          type: adjustmentData.type,
          quantity: adjustmentData.quantity,
          reason: adjustmentData.reason,
          warehouse: adjustmentData.warehouse,
          performedBy: "Admin User",
          timestamp: new Date().toISOString(),
        };

        setTransactions([newTransaction, ...transactions]);
        
        // Refresh stock data
        await fetchStockData();
        
        toast.success(`Stock adjusted successfully! New stock: ${newStockQuantity}`);
        setShowAdjustmentModal(false);
        setAdjustmentData({ type: 'in', quantity: 0, warehouse: '', reason: '' });
        setSelectedProduct(null);
      } else {
        toast.error(result.error || 'Failed to adjust stock');
      }
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'bg-green-100 text-green-800';
      case 'low_stock': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock': return 'bg-red-100 text-red-800';
      case 'overstock': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'in': return 'bg-green-100 text-green-800';
      case 'out': return 'bg-blue-100 text-blue-800';
      case 'adjustment': return 'bg-yellow-100 text-yellow-800';
      case 'return': return 'bg-purple-100 text-purple-800';
      case 'damage': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Header />
      <ToastContainer />
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-gray-600 mt-1">Monitor and manage inventory levels</p>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stockItems.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {stockItems.reduce((sum, item) => sum + item.totalStock, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {lowStockItems.length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {outOfStockItems.length}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-600">In Transit</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {stockItems.reduce((sum, item) => sum + item.inTransit, 0)}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex border-b overflow-x-auto">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'inventory'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Inventory Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'transactions'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Stock Transactions
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-6 py-3 font-medium whitespace-nowrap ${
                  activeTab === 'alerts'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Alerts ({lowStockItems.length + outOfStockItems.length})
              </button>
            </div>

            {/* Inventory Tab */}
            {activeTab === 'inventory' && (
              <div className="p-6">
                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <input
                      type="text"
                      placeholder="Search by name or SKU..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Status</option>
                      <option value="in_stock">In Stock</option>
                      <option value="low_stock">Low Stock</option>
                      <option value="out_of_stock">Out of Stock</option>
                      <option value="overstock">Overstock</option>
                    </select>
                  </div>
                  <div>
                    <select
                      value={filterWarehouse}
                      onChange={(e) => setFilterWarehouse(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Warehouses</option>
                      <option value="Main Warehouse">Main Warehouse</option>
                      <option value="Secondary Warehouse">Secondary Warehouse</option>
                    </select>
                  </div>
                </div>

                {/* Stock Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reserved</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">In Transit</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days of Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                        </tr>
                      ) : filteredStockItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No items found</td>
                        </tr>
                      ) : (
                        filteredStockItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-12 h-12 rounded-lg object-cover"
                                />
                                <div>
                                  <div className="font-medium text-gray-900">{item.productName}</div>
                                  <div className="text-sm text-gray-500">{item.categoryName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-mono text-gray-600">{item.sku}</td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-bold text-gray-900">{item.availableStock}</div>
                              <div className="text-xs text-gray-500">of {item.totalStock}</div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-600">{item.reservedStock}</td>
                            <td className="px-4 py-4 text-sm text-gray-600">{item.inTransit}</td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">{item.daysOfStock} days</div>
                              <div className="text-xs text-gray-500">{item.avgDailySales}/day</div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.stockStatus)}`}>
                                {item.stockStatus.replace('_', ' ').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <button
                                onClick={() => {
                                  setSelectedProduct(item);
                                  setShowAdjustmentModal(true);
                                }}
                                className="px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                Adjust
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm font-medium text-gray-900">{transaction.productName}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(transaction.type)}`}>
                              {transaction.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-sm font-bold ${transaction.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'in' ? '+' : '-'}{transaction.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">{transaction.warehouse}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{transaction.reason}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">{transaction.performedBy}</td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(transaction.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="p-6">
                {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-16 h-16 mx-auto mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">All stock levels are healthy!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {outOfStockItems.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-red-600 mb-3">⚠️ Out of Stock ({outOfStockItems.length})</h3>
                        <div className="space-y-2">
                          {outOfStockItems.map(item => (
                            <div key={item.id} className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 rounded-lg object-contain bg-white p-1" />
                                <div>
                                  <div className="font-medium text-gray-900">{item.productName}</div>
                                  <div className="text-sm text-gray-600">SKU: {item.sku}</div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedProduct(item);
                                  setShowAdjustmentModal(true);
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                              >
                                Restock Now
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {lowStockItems.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-yellow-600 mb-3">⚡ Low Stock Alerts ({lowStockItems.length})</h3>
                        <div className="space-y-2">
                          {lowStockItems.map(item => (
                            <div key={item.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 rounded-lg object-contain bg-white p-1" />
                                <div>
                                  <div className="font-medium text-gray-900">{item.productName}</div>
                                  <div className="text-sm text-gray-600">
                                    Current: {item.availableStock} | Reorder Point: {item.reorderPoint}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedProduct(item);
                                  setAdjustmentData({
                                    type: 'in',
                                    quantity: item.reorderQuantity,
                                    warehouse: item.warehouseLocations[0]?.warehouse || '',
                                    reason: 'Automatic reorder'
                                  });
                                  setShowAdjustmentModal(true);
                                }}
                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                              >
                                Reorder ({item.reorderQuantity})
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
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

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Adjust Stock - {selectedProduct.productName}
            </h2>
            
            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transaction Type
                </label>
                <select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as 'in' | 'out' | 'adjustment' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="in">Stock In (Receive)</option>
                  <option value="out">Stock Out (Remove)</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) || 0 })}
                  placeholder="Enter quantity"
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse
                </label>
                <select
                  value={adjustmentData.warehouse}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, warehouse: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Warehouse</option>
                  <option value="Main Warehouse">Main Warehouse</option>
                  <option value="Secondary Warehouse">Secondary Warehouse</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={adjustmentData.reason}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, reason: e.target.value })}
                  placeholder="Enter reason for adjustment"
                  rows={3}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Current Stock Summary:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Available:</span>
                    <span className="font-bold text-gray-900 ml-2">{selectedProduct.availableStock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Reserved:</span>
                    <span className="font-bold text-gray-900 ml-2">{selectedProduct.reservedStock}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">In Transit:</span>
                    <span className="font-bold text-gray-900 ml-2">{selectedProduct.inTransit}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900 ml-2">{selectedProduct.totalStock}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustmentModal(false);
                    setSelectedProduct(null);
                    setAdjustmentData({ type: 'in', quantity: 0, warehouse: '', reason: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default function StockManagementPage() {
  return (
    <ProtectedRoute requireAuth={true} requiredRole="admin">
      <StockManagement />
    </ProtectedRoute>
  );
}
