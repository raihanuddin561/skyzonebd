'use client'

import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import NoSSR from './NoSSR';

function CartBadge() {
  const { getTotalItems } = useCart();
  const totalItems = getTotalItems();

  return (
    <>
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </>
  );
}

export default function CartIcon() {
  return (
    <Link href="/cart" className="relative hover:text-blue-700 font-medium cursor-pointer">
      <div className="flex items-center gap-1">
        {/* Shopping Cart Icon */}
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          strokeWidth={1.5} 
          stroke="currentColor" 
          className="w-6 h-6"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" 
          />
        </svg>
        
        <span className="hidden sm:inline">Cart</span>
        
        {/* Badge showing item count - only render on client */}
        <NoSSR>
          <CartBadge />
        </NoSSR>
      </div>
    </Link>
  );
}
