'use client';

import { useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'react-toastify';

/**
 * Component to automatically detect and clear cart items with old numeric IDs
 * This runs once when the app loads and checks if cart items have invalid IDs
 */
export function CartMigration() {
  const { items, clearCart } = useCart();

  useEffect(() => {
    // Check if any cart items have numeric IDs (old format)
    const hasOldFormat = items.some(item => {
      const id = item.product.id;
      const idStr = String(id);
      return typeof id === 'number' || (typeof id === 'string' && !idStr.startsWith('cm'));
    });

    if (hasOldFormat && items.length > 0) {
      console.warn('⚠️ Detected old cart format with numeric IDs. Clearing cart...');
      console.log('Old cart items:', items.map(item => ({ 
        id: item.product.id, 
        name: item.product.name 
      })));
      
      // Clear the cart
      clearCart();
      
      // Show toast to user
      toast.info('Your cart has been cleared due to a system update. Please add products again.', {
        autoClose: 5000
      });
      
      // Reload to fetch fresh products from database
      window.location.reload();
    }
  }, [items, clearCart]);

  return null; // This component doesn't render anything
}
