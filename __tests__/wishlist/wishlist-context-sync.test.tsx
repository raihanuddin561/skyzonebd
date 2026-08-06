// __tests__/wishlist/wishlist-context-sync.test.tsx
// Verifies WishlistContext's new API-sync behavior (Amazon-Style Wholesale
// Platform Gap Closure — Phase 4 part 2): an authenticated user's wishlist
// loads from the server on mount and mutations sync to the API in the
// background, while a guest keeps the pre-existing in-memory-only behavior
// (no API calls at all).

import { renderHook, waitFor, act } from '@testing-library/react';
import { WishlistProvider, useWishlist } from '@/contexts/WishlistContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/utils/apiClient';

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/utils/apiClient', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const product = { id: 'p1', name: 'Widget', price: 100, companyName: 'Acme', imageUrl: 'img.jpg' };

function jsonResponse(data: any) {
  return { json: async () => data };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WishlistContext — guest (unauthenticated)', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false, isLoading: false });
  });

  it('never calls the wishlist API', async () => {
    const { result } = renderHook(() => useWishlist(), { wrapper: WishlistProvider });

    act(() => {
      result.current.addToWishlist(product as any);
    });

    expect(result.current.items).toHaveLength(1);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('WishlistContext — authenticated', () => {
  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: true, isLoading: false });
  });

  it('loads the server wishlist on mount', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [product] } }));

    const { result } = renderHook(() => useWishlist(), { wrapper: WishlistProvider });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(api.get).toHaveBeenCalledWith('/api/wishlist');
  });

  it('optimistically adds locally and syncs the add to the API', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [] } }));
    (api.post as jest.Mock).mockResolvedValueOnce(jsonResponse({ success: true }));

    const { result } = renderHook(() => useWishlist(), { wrapper: WishlistProvider });
    await waitFor(() => expect(api.get).toHaveBeenCalled());

    act(() => {
      result.current.addToWishlist(product as any);
    });

    expect(result.current.items).toHaveLength(1);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/wishlist', { productId: 'p1' }));
  });

  it('optimistically removes locally and syncs the removal to the API', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce(jsonResponse({ success: true, data: { items: [product] } }));
    (api.delete as jest.Mock).mockResolvedValueOnce(jsonResponse({ success: true }));

    const { result } = renderHook(() => useWishlist(), { wrapper: WishlistProvider });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => {
      result.current.removeFromWishlist('p1');
    });

    expect(result.current.items).toHaveLength(0);
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/api/wishlist/p1'));
  });
});
