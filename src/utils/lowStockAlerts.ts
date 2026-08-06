// utils/lowStockAlerts.ts
// Amazon-style gap-closure Phase 1: proactive low-stock notification.
// Previously the only way to learn a product had crossed its reorder point
// was for an admin to manually visit GET /api/admin/stock/reorder-alerts —
// a pull-based report nobody is reminded to check. This module fires an
// email the moment a stock decrement actually crosses the threshold.

import { emailService } from '@/lib/email';
import { logError } from '@/lib/logger';

/**
 * Fires a low-stock alert email if, and only if, this specific stock
 * change just crossed the product's reorderLevel (previousStock was above
 * it, newStock is at or below it) — not on every order placed while stock
 * is already known-low, which would spam whoever receives these emails.
 *
 * Deliberately best-effort and non-blocking: a failed/unconfigured email
 * must never fail the stock-moving operation that triggered it. Call this
 * AFTER the triggering transaction has committed, the same pattern already
 * used for order-confirmation emails.
 */
export async function alertIfCrossedReorderLevel(product: {
  id: string;
  name: string;
  sku: string | null;
  reorderLevel: number | null;
}, previousStock: number, newStock: number): Promise<void> {
  const reorderLevel = product.reorderLevel ?? 20;
  const justCrossed = previousStock > reorderLevel && newStock <= reorderLevel;
  if (!justCrossed) return;

  const alertEmail = process.env.ADMIN_ALERT_EMAIL;
  if (!alertEmail) return; // Not configured — nothing to send to, not an error.

  try {
    await emailService.sendLowStockAlert(alertEmail, {
      name: product.name,
      sku: product.sku,
      stockQuantity: newStock,
      reorderLevel,
    });
  } catch (error) {
    logError(`Failed to send low-stock alert for product ${product.id}`, error, 'LowStockAlert');
  }
}
