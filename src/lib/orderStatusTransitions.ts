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

export interface ResolveOrderStatusUpdateInput {
  requestedStatus?: string | null;
  requestedPaymentStatus?: string | null;
  currentStatus: string;
  paymentMethod: string | null | undefined;
  currentPaymentStatus: string | null | undefined;
  /**
   * The payment-status values this specific caller accepts. Deliberately a
   * parameter, not a shared constant — PATCH /api/orders/[id] and PATCH
   * /api/orders intentionally validate against different whitelists today
   * (the bulk endpoint's is narrower, a known pre-existing gap), and
   * unifying them here would silently change that endpoint's behavior
   * rather than just deduplicating control flow.
   */
  validPaymentStatuses: readonly string[];
}

export type ResolveOrderStatusUpdateResult =
  | {
      ok: true;
      updateData: { status?: string; paymentStatus?: string };
      isCancelling: boolean;
      isDeliveringNow: boolean;
    }
  | {
      ok: false;
      error: string;
      statusCode: number;
    };

/**
 * The status/paymentStatus validation and transition/payment-gate decision
 * logic shared by both live order-status endpoints (PATCH /api/orders/[id]
 * and PATCH /api/orders). Each endpoint still runs its own transaction
 * (their Prisma `include` shapes and post-update side effects — activity
 * logging, response shaping — genuinely differ), but the part that
 * actually decides WHETHER a transition is allowed and WHAT the final
 * update payload should be is identical, and drifting between the two was
 * exactly how the payment-status whitelist and the transition-validation
 * gap were previously found. Centralizing it here means a future fix only
 * needs to happen once.
 */
export function resolveOrderStatusUpdate(
  input: ResolveOrderStatusUpdateInput
): ResolveOrderStatusUpdateResult {
  const updateData: { status?: string; paymentStatus?: string } = {};

  if (input.requestedStatus) {
    const nextStatus = input.requestedStatus.toUpperCase();
    updateData.status = nextStatus;

    // A status change with no actual transition (re-submitting the same
    // status) is a no-op, not an error — only validate real transitions.
    if (nextStatus !== input.currentStatus && !isAllowedOrderStatusTransition(input.currentStatus, nextStatus)) {
      return {
        ok: false,
        error: `Cannot change order status from ${input.currentStatus} to ${nextStatus}`,
        statusCode: 400,
      };
    }
  }

  // Payment-status gate on the transition INTO DELIVERED — an order can
  // never reach DELIVERED (and trigger autoGenerateProfitReport, which
  // recognizes revenue in the ledger) without payment actually collected
  // or verified. See resolveDeliveryPaymentGate's doc comment for the
  // exact rule per payment method.
  const isDeliveringNow = updateData.status === 'DELIVERED' && input.currentStatus !== 'DELIVERED';
  const deliveryPaymentGate = isDeliveringNow
    ? resolveDeliveryPaymentGate({ paymentMethod: input.paymentMethod, paymentStatus: input.currentPaymentStatus })
    : null;

  if (deliveryPaymentGate && !deliveryPaymentGate.allowed) {
    return {
      ok: false,
      error: deliveryPaymentGate.reason ?? 'Cannot mark as delivered.',
      statusCode: 400,
    };
  }

  if (input.requestedPaymentStatus) {
    const normalizedPaymentStatus = input.requestedPaymentStatus.toUpperCase();
    if (!input.validPaymentStatuses.includes(normalizedPaymentStatus)) {
      return { ok: false, error: 'Invalid payment status', statusCode: 400 };
    }
    updateData.paymentStatus = normalizedPaymentStatus;
  }

  // COD: delivery IS the payment event — automatically mark PAID as part of
  // this same update (overriding any paymentStatus the request body sent),
  // instead of blocking the transition like every other method.
  if (deliveryPaymentGate?.autoMarkPaid) {
    updateData.paymentStatus = 'PAID';
  }

  const isCancelling = updateData.status === 'CANCELLED' && input.currentStatus !== 'CANCELLED';

  return { ok: true, updateData, isCancelling, isDeliveringNow };
}
