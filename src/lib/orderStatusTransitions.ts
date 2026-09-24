import { getPaymentTermsForMethod } from '@/services/invoiceService';

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

/**
 * Payment methods where cash is physically collected at the moment of
 * delivery, matching the literal(s) this codebase actually uses for COD
 * (src/lib/validation.ts / src/app/checkout/page.tsx: 'cash_on_delivery';
 * 'cod' accepted too as a common alternate literal for the same method).
 * Matched case-insensitively.
 */
const COD_PAYMENT_METHODS = ['cod', 'cash_on_delivery'];

export interface DeliveryPaymentGateResult {
  /** Whether the transition to DELIVERED may proceed. */
  allowed: boolean;
  /**
   * When true, the caller must set paymentStatus to PAID as part of the
   * same update that applies the DELIVERED transition — delivery IS the
   * payment event for COD, so this is not a separate verification step.
   */
  autoMarkPaid: boolean;
  /** Present when allowed is false — a caller-facing rejection message. */
  reason?: string;
}

/**
 * Enforces that an order cannot reach DELIVERED — which triggers
 * profit-report generation and ledger revenue recognition
 * (autoGenerateProfitReport) — without payment ever having been verified or
 * collected. Shared by both live places a transition to DELIVERED can
 * happen (PATCH /api/orders/[id] and PATCH /api/orders) so the rule can't
 * diverge between them.
 *
 * - COD orders: cash is physically collected at delivery, so delivery IS
 *   the payment event — allowed, and autoMarkPaid is true.
 * - NET-terms invoice orders (INVOICE_NET30/60/90, per
 *   getPaymentTermsForMethod): deliberately "pay later" (accounts
 *   receivable) — allowed unconditionally, no payment check at all.
 * - Every other payment method (bKash, bank transfer — whose orders start
 *   life at paymentStatus PENDING_VERIFICATION — or any other/unrecognized
 *   method, e.g. a credit-card gateway that isn't actually wired up):
 *   requires the order's paymentStatus to already be PAID (i.e. verified
 *   via POST /api/admin/orders/[id]/verify-payment) before delivery is
 *   allowed.
 */
export function resolveDeliveryPaymentGate(order: {
  paymentMethod: string | null | undefined;
  paymentStatus: string | null | undefined;
}): DeliveryPaymentGateResult {
  const normalizedMethod = (order.paymentMethod ?? '').toLowerCase();

  if (COD_PAYMENT_METHODS.includes(normalizedMethod)) {
    return { allowed: true, autoMarkPaid: true };
  }

  if (getPaymentTermsForMethod(order.paymentMethod ?? '') !== null) {
    return { allowed: true, autoMarkPaid: false };
  }

  if (order.paymentStatus === 'PAID') {
    return { allowed: true, autoMarkPaid: false };
  }

  return {
    allowed: false,
    autoMarkPaid: false,
    reason: 'Cannot mark as delivered — payment has not been verified for this order. Verify payment first.',
  };
}
