/**
 * Which order-status transitions are legal, shared by every endpoint that
 * can change an order's status (PATCH /api/orders/[id] — the admin order
 * list's live per-row status dropdown — and PATCH /api/orders, an older
 * bulk-update endpoint with no live frontend caller today but still
 * reachable). Forward-only: prevents nonsensical jumps like DELIVERED ->
 * PENDING. Once an order is SHIPPED/IN_TRANSIT it can no longer be
 * CANCELLED here — that mirrors DELETE /api/orders/[id]'s own "cannot
 * cancel shipped or delivered orders" rule and POST /api/orders/cancel's
 * matching check, so every cancellation-capable endpoint agrees. Terminal
 * states (CANCELLED, DELIVERED, REFUNDED) have no further transitions from
 * here — DELIVERED can only move to RETURNED via the dedicated returns
 * workflow.
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'PROCESSING', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['PACKED', 'SHIPPED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
  RETURNED: ['REFUNDED'],
  REFUNDED: [],
};

export function isAllowedOrderStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  return (ALLOWED_ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
}
