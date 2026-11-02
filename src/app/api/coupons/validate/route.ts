/**
 * Customer Coupon Validation Endpoint
 * POST /api/coupons/validate
 *
 * Validates a coupon code against current cart items and returns
 * exact poisha discount and failure reasons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { readCoupons } from '@/lib/siteSettings';
import { validateCoupon, CouponRule } from '@/services/calculationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, eligibleSubtotalPoisha = 0, customerOrderCount = 0 } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Please enter a coupon code' },
        { status: 400 }
      );
    }

    const coupons = await readCoupons();
    const normalizedCode = code.trim().toUpperCase();

    const targetCoupon = coupons.find(
      (c) => c.code.toUpperCase() === normalizedCode && c.isActive
    );

    if (!targetCoupon) {
      return NextResponse.json(
        { success: false, error: 'Invalid or inactive coupon code' },
        { status: 404 }
      );
    }

    const couponRule: CouponRule = {
      code: targetCoupon.code,
      type: targetCoupon.type,
      discountValue: targetCoupon.discountValue,
      maxDiscountPoisha: targetCoupon.maxDiscountPoisha,
      minOrderAmountPoisha: targetCoupon.minOrderAmountPoisha,
      startDate: targetCoupon.startDate ? new Date(targetCoupon.startDate) : null,
      endDate: targetCoupon.endDate ? new Date(targetCoupon.endDate) : null,
      totalUsageLimit: targetCoupon.totalUsageLimit,
      currentUsageCount: targetCoupon.currentUsageCount,
      perCustomerUsageLimit: targetCoupon.perCustomerUsageLimit,
      isFirstOrderOnly: targetCoupon.isFirstOrderOnly,
      allowedProductIds: targetCoupon.allowedProductIds,
      excludedProductIds: targetCoupon.excludedProductIds,
      allowedCategoryIds: targetCoupon.allowedCategoryIds,
      excludedCategoryIds: targetCoupon.excludedCategoryIds,
      canReduceDelivery: targetCoupon.canReduceDelivery,
    };

    const validation = validateCoupon(
      couponRule,
      Number(eligibleSubtotalPoisha) || 0,
      Number(customerOrderCount) || 0
    );

    if (!validation.valid) {
      let friendlyMessage = 'Coupon cannot be applied';
      if (validation.reason === 'COUPON_EXPIRED') friendlyMessage = 'This coupon has expired';
      else if (validation.reason === 'COUPON_NOT_YET_ACTIVE') friendlyMessage = 'This coupon is not yet active';
      else if (validation.reason === 'COUPON_USAGE_LIMIT_REACHED') friendlyMessage = 'Coupon usage limit has been reached';
      else if (validation.reason === 'COUPON_FIRST_ORDER_ONLY') friendlyMessage = 'This coupon is only valid for first-time orders';
      else if (validation.reason?.startsWith('COUPON_BELOW_MINIMUM_ORDER')) friendlyMessage = validation.reason.replace('COUPON_BELOW_MINIMUM_ORDER: ', '');
      else if (validation.reason === 'COUPON_NOT_APPLICABLE_TO_ITEMS') friendlyMessage = 'This coupon is not applicable to any items in your cart';

      return NextResponse.json(
        { success: false, error: friendlyMessage, code: validation.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code: targetCoupon.code,
        type: targetCoupon.type,
        discountValue: targetCoupon.discountValue,
        maxDiscountPoisha: targetCoupon.maxDiscountPoisha,
        canReduceDelivery: targetCoupon.canReduceDelivery,
        description: targetCoupon.description,
      },
      message: 'Coupon applied successfully!',
    });
  } catch (error) {
    console.error('Coupon validation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate coupon' },
      { status: 500 }
    );
  }
}

