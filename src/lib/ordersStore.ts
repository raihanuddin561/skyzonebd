// In-memory orders store
// This will persist across API route recompilations during development
// WARNING: In production, this will reset when the server restarts
// Use a real database (Prisma + PostgreSQL) for production

interface GuestInfo {
  name: string;
  email: string;
  phone: string;
}

interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface Order {
  id: number;
  orderId: string;
  userId: string | null;
  guestInfo: GuestInfo | null;
  items: OrderItem[];
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  notes: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

class OrdersStore {
  private orders: Order[] = [];

  addOrder(order: Order) {
    this.orders.push(order);
    console.log(`📦 OrdersStore: Added order ${order.orderId}. Total orders: ${this.orders.length}`);
  }

  getAllOrders(): Order[] {
    console.log(`📦 OrdersStore: Fetching all orders. Count: ${this.orders.length}`);
    return this.orders;
  }

  getOrdersByUserId(userId: string): Order[] {
    const userOrders = this.orders.filter(order => order.userId === userId);
    console.log(`📦 OrdersStore: User ${userId} has ${userOrders.length} orders`);
    return userOrders;
  }

  getOrderById(orderId: string): Order | undefined {
    return this.orders.find(order => order.orderId === orderId);
  }

  getOrdersCount(): number {
    return this.orders.length;
  }

  clearOrders() {
    this.orders = [];
    console.log('🗑️ OrdersStore: All orders cleared');
  }
}

// Export singleton instance
export const ordersStore = new OrdersStore();
