import {
  toPoisha,
  fromPoisha,
  allocatePoishaByWeights,
  calculateOrder,
  CalculationSettings,
  ProductPricingInput,
} from '../src/services/calculationService';

import {
  calculateProfitPeriod,
  Stakeholder,
  ShareRuleVersion,
} from '../src/services/profitSharingService';

import {
  getDhakaComponents,
  dhakaToUtcDate,
  getDhakaDayBounds,
  getDhakaMonthBounds,
  getDhakaYearBounds,
  DHAKA_OFFSET_HOURS,
} from '../src/lib/dhakaTime';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
  console.log(`✅ ${msg}`);
}

console.log('Running Phase 2 Calculation & Timezone Verification...');

// 1. Poisha arithmetic
assert(toPoisha(1250.75) === 125075, 'toPoisha(1250.75) === 125075');
assert(fromPoisha(125075) === 1250.75, 'fromPoisha(125075) === 1250.75');

// 2. Largest Remainder Method
const weights = [33.33, 33.33, 33.34];
const totalPoisha = 1000001;
const allocated = allocatePoishaByWeights(totalPoisha, weights);
const sumAllocated = allocated.reduce((a, b) => a + b, 0);
assert(sumAllocated === totalPoisha, `Largest Remainder sum (${sumAllocated}) === total (${totalPoisha})`);

// 3. Order calculation
const p1: ProductPricingInput = {
  productId: 'prod-001',
  name: 'Circuit Breaker 32A',
  unitPricePoisha: 45000,
  costPricePoisha: 28000,
  moq: 5,
  packSize: 5,
  tiers: [
    { minQuantity: 5, maxQuantity: 19, unitPricePoisha: 45000 },
    { minQuantity: 20, maxQuantity: null, unitPricePoisha: 40000 },
  ],
};

const settings: CalculationSettings = {
  vatEnabled: true,
  vatRatePercent: 15,
  pricesInclusiveOfVat: false,
  couponsApplyBeforeVat: true,
  minOrderValuePoisha: 50000,
  enforceMoqForCustomer: true,
};

const orderRes = calculateOrder({
  items: [{ product: p1, quantity: 20 }],
  delivery: { chargePoisha: 15000, freeDeliveryThresholdPoisha: 5000000 },
  extraCharges: { packagingFeePoisha: 5000 },
  settings,
});

assert(orderRes.isOrderValid === true, 'Order passes MOQ & step size');
assert(orderRes.subtotalPoisha === 800000, 'Subtotal is 800,000 poisha (20 * ৳400)');
assert(orderRes.vatPoisha === 120000, '15% VAT is 120,000 poisha (৳1,200)');
assert(orderRes.grandTotalPoisha === 940000, 'Grand Total is 940,000 poisha (৳9,400)');

// 4. Dhaka timezone
assert(DHAKA_OFFSET_HOURS === 6, 'Dhaka offset is +6');
const dhakaMid = dhakaToUtcDate(2026, 11, 4, 0, 0, 0, 0);
assert(dhakaMid.toISOString() === '2026-11-03T18:00:00.000Z', 'Midnight Dhaka is 18:00 UTC previous day');

const bounds = getDhakaDayBounds(new Date('2026-11-03T10:00:00.000Z'));
assert(bounds.start.toISOString() === '2026-11-02T18:00:00.000Z', 'Start of day boundary matches 00:00 BST');
assert(bounds.end.toISOString() === '2026-11-03T17:59:59.999Z', 'End of day boundary matches 23:59:59.999 BST');

console.log('\n🎉 ALL PHASE 2 CALCULATION TESTS PASSED SUCCESFULLY!\n');
