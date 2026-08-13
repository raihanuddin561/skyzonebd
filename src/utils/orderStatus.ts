// utils/orderStatus.ts
//
// Single source of truth for order-status colors/icons. Previously each of
// admin/page.tsx (dashboard), orders/page.tsx (customer), and
// admin/orders/page.tsx hand-rolled its own color map, and they disagreed:
// "processing" rendered blue on two pages but purple on the third; "shipped"
// rendered purple on two pages but indigo on the third. The same order could
// show a different status color depending which page you were looking at.

const ORDER_STATUS_STYLES: Record<string, { color: string; icon: string; label: string }> = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: '⏳', label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800', icon: '✅', label: 'Confirmed' },
  processing: { color: 'bg-purple-100 text-purple-800', icon: '⚙️', label: 'Processing' },
  shipped: { color: 'bg-indigo-100 text-indigo-800', icon: '🚚', label: 'Shipped' },
  delivered: { color: 'bg-green-100 text-green-800', icon: '📦', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', icon: '❌', label: 'Cancelled' },
};

const FALLBACK = { color: 'bg-gray-100 text-gray-800', icon: '•', label: 'Unknown' };

function lookup(status: string) {
  return ORDER_STATUS_STYLES[status?.toLowerCase()] || FALLBACK;
}

export function getOrderStatusColor(status: string): string {
  return lookup(status).color;
}

export function getOrderStatusIcon(status: string): string {
  return lookup(status).icon;
}

export function getOrderStatusLabel(status: string): string {
  return lookup(status).label;
}
