// utils/recentlyViewed.ts
//
// Client-side "recently viewed products" tracking, deliberately not
// server-persisted (unlike Wishlist, which is auth-gated and synced via the
// API — see src/contexts/WishlistContext.tsx). Recently-viewed doesn't carry
// Wishlist's cross-device-persistence requirement, and most browsing on this
// storefront happens pre-auth (guest checkout is a first-class flow), so a
// localStorage list — the same approach CartContext already uses for the
// cart itself — covers the real need without a schema change or an auth
// requirement.

const STORAGE_KEY = 'recentlyViewedProducts';
const MAX_ENTRIES = 10;

interface RecentlyViewedEntry {
  productId: string;
  viewedAt: string; // ISO timestamp
}

function readEntries(): RecentlyViewedEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // Corrupted/blocked storage — treat as empty rather than throwing.
    return [];
  }
}

function writeEntries(entries: RecentlyViewedEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full/blocked (e.g. private browsing) — silently no-op, this is
    // a cosmetic convenience feature, never a source of truth.
  }
}

/** Records a product view, moving it to the front if already present. */
export function recordProductView(productId: string): void {
  if (!productId) return;
  const existing = readEntries().filter((entry) => entry.productId !== productId);
  const updated = [{ productId, viewedAt: new Date().toISOString() }, ...existing].slice(0, MAX_ENTRIES);
  writeEntries(updated);
}

/** Returns recently viewed product ids, most recent first, optionally excluding one id (e.g. the product currently being viewed). */
export function getRecentlyViewedIds(excludeProductId?: string): string[] {
  return readEntries()
    .map((entry) => entry.productId)
    .filter((id) => id !== excludeProductId);
}
