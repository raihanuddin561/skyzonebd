/**
 * @jest-environment node
 */
// __tests__/utils/lowStockAlerts.test.ts
//
// Amazon-style gap-closure Phase 1: proactive low-stock alerting.
// alertIfCrossedReorderLevel should fire exactly when a stock change
// crosses the reorder threshold (not on every order while already low),
// and only when ADMIN_ALERT_EMAIL is configured.

const sendLowStockAlert = jest.fn().mockResolvedValue({ success: true });
jest.mock('@/lib/email', () => ({
  emailService: { sendLowStockAlert: (...args: any[]) => sendLowStockAlert(...args) },
}));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

import { alertIfCrossedReorderLevel } from '@/utils/lowStockAlerts';

const product = { id: 'p1', name: 'Widget', sku: 'SKU-1', reorderLevel: 10 };
const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...ORIGINAL_ENV, ADMIN_ALERT_EMAIL: 'ops@example.com' };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

it('sends an alert when stock crosses from above the reorder level to at/below it', async () => {
  await alertIfCrossedReorderLevel(product, 12, 8);
  expect(sendLowStockAlert).toHaveBeenCalledWith('ops@example.com', {
    name: 'Widget', sku: 'SKU-1', stockQuantity: 8, reorderLevel: 10,
  });
});

it('does not send an alert if stock was already at/below the reorder level before this change', async () => {
  await alertIfCrossedReorderLevel(product, 9, 7);
  expect(sendLowStockAlert).not.toHaveBeenCalled();
});

it('does not send an alert if stock stays above the reorder level', async () => {
  await alertIfCrossedReorderLevel(product, 20, 15);
  expect(sendLowStockAlert).not.toHaveBeenCalled();
});

it('does not send anything if ADMIN_ALERT_EMAIL is not configured', async () => {
  delete process.env.ADMIN_ALERT_EMAIL;
  await alertIfCrossedReorderLevel(product, 12, 8);
  expect(sendLowStockAlert).not.toHaveBeenCalled();
});

it('falls back to a default reorderLevel of 20 when the product has none set', async () => {
  await alertIfCrossedReorderLevel({ ...product, reorderLevel: null }, 25, 15);
  expect(sendLowStockAlert).toHaveBeenCalledWith('ops@example.com', expect.objectContaining({ reorderLevel: 20 }));
});

it('does not throw if the email send fails — best-effort only', async () => {
  sendLowStockAlert.mockRejectedValueOnce(new Error('provider down'));
  await expect(alertIfCrossedReorderLevel(product, 12, 8)).resolves.toBeUndefined();
});
