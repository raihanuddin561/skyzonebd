// __tests__/checkout/checkout-address-validation.test.tsx
// Verifies the checkout page's address validation: (1) errors are shown as
// field-specific inline messages, not a single generic toast, and (2) since
// shipping and billing addresses are almost always identical in Bangladesh,
// only one of the two is required — the filled value is mirrored into the
// empty field on submit.

import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CheckoutPage from '@/app/checkout/page';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-toastify';

jest.mock('@/contexts/CartContext', () => ({ useCart: jest.fn() }));
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/app/components/Header', () => ({ __esModule: true, default: () => null }));
jest.mock('@/app/components/Footer', () => ({ __esModule: true, default: () => null }));
jest.mock('react-toastify', () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const cartItem = {
  product: { id: 'p1', name: 'Widget', price: 100, imageUrl: 'img.jpg' },
  quantity: 2,
};

function mockPaymentConfigResponse() {
  return Promise.resolve({
    ok: true,
    json: async () => ({ success: true, data: [] }),
  });
}

function mockOrderResponse() {
  return Promise.resolve({
    ok: true,
    clone: () => ({ text: async () => '' }),
    json: async () => ({
      success: true,
      data: {
        order: {
          orderId: 'ORD-1',
          items: [],
          shippingAddress: '',
          billingAddress: '',
          paymentMethod: 'cash_on_delivery',
          total: 200,
          orderNumber: 'ORD-1',
        },
      },
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  (useCart as jest.Mock).mockReturnValue({
    items: [cartItem],
    getTotalItems: () => 2,
    getTotalPrice: () => 200,
    clearCart: jest.fn(),
    isLoaded: true,
  });
  (useAuth as jest.Mock).mockReturnValue({ user: null });

  global.fetch = jest.fn((url: string) => {
    if (String(url).includes('/api/payment-config')) return mockPaymentConfigResponse();
    if (String(url).includes('/api/orders')) return mockOrderResponse();
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as any;

  Storage.prototype.setItem = jest.fn();
  Storage.prototype.getItem = jest.fn();
});

function fillGuestInfo() {
  fireEvent.change(screen.getByPlaceholderText('Enter your full name'), { target: { value: 'Jane Doe' } });
  fireEvent.change(screen.getByPlaceholderText('+880-1711-123456'), { target: { value: '01711123456' } });
}

describe('Checkout address validation', () => {
  it('shows field-specific inline errors, not a generic toast, when both addresses are empty', async () => {
    render(<CheckoutPage />);
    fillGuestInfo();

    fireEvent.click(screen.getByRole('button', { name: 'Place Order' }));

    expect(await screen.findByText(/Shipping Address is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Billing Address is required/i)).toBeInTheDocument();
    expect(toast.error).not.toHaveBeenCalledWith('Please fill in all required fields');
    expect(global.fetch).not.toHaveBeenCalledWith('/api/orders', expect.anything());
  });

  it('accepts just one address and mirrors it into the other on submit', async () => {
    render(<CheckoutPage />);
    fillGuestInfo();
    fireEvent.click(screen.getByText('Cash on Delivery'));

    fireEvent.change(
      screen.getByPlaceholderText('Enter your complete shipping address...'),
      { target: { value: '123 Gulshan Ave, Dhaka' } }
    );

    fireEvent.click(screen.getByRole('button', { name: 'Place Order' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ method: 'POST' }));
    });

    const ordersCall = (global.fetch as jest.Mock).mock.calls.find(([url]) => url === '/api/orders');
    const body = JSON.parse(ordersCall[1].body);
    expect(body.shippingAddress).toBe('123 Gulshan Ave, Dhaka');
    expect(body.billingAddress).toBe('123 Gulshan Ave, Dhaka');
  });

  it('clears a field error as soon as the user starts fixing it', async () => {
    render(<CheckoutPage />);
    fillGuestInfo();

    fireEvent.click(screen.getByRole('button', { name: 'Place Order' }));
    expect(await screen.findByText(/Shipping Address is required/i)).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('Enter your complete shipping address...'),
      { target: { value: '123 Gulshan Ave, Dhaka' } }
    );

    await waitFor(() => {
      expect(screen.queryByText(/Shipping Address is required/i)).not.toBeInTheDocument();
    });
  });
});
