/**
 * Admin Coupons Management API
 * GET /api/admin/coupons - List all coupons with stats
 * POST /api/admin/coupons - Create or update coupon
 * DELETE /api/admin/coupons - Delete coupon by code or id
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { UserRole, isAdmin } from '@/types/roles';
import { readCoupons, writeCoupons, StoredCouponConfig } from '@/lib/siteSettings';
import { logActivity } from '@/lib/activityLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const coupons = await readCoupons(true);
    return NextResponse.json({ success: true, data: coupons });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ success: false, error: 'Failed to fetch coupons' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      code,
      type,
      discountValue,
      maxDiscountPoisha,
      minOrderAmountPoisha,
      startDate,
      endDate,
      totalUsageLimit,
      perCustomerUsageLimit,
      allowedProductIds,
      excludedProductIds,
      allowedCategoryIds,
      excludedCategoryIds,
      isFirstOrderOnly,
      canReduceDelivery,
      isActive = true,
      description,
    } = body;

    if (!code || !type) {
      return NextResponse.json(
        { success: false, error: 'Coupon code and type are required' },
        { status: 400 }
      );
    }

    const coupons = await readCoupons(true);
    const normalizedCode = code.trim().toUpperCase();

    const existingIdx = coupons.findIndex(
      (c) => c.id === id || c.code.toUpperCase() === normalizedCode
    );

    const couponEntry: StoredCouponConfig = {
      id: id || `coup-${Date.now()}`,
      code: normalizedCode,
      type,
      discountValue: Number(discountValue) || 0,
      maxDiscountPoisha: maxDiscountPoisha ? Number(maxDiscountPoisha) : null,
      minOrderAmountPoisha: minOrderAmountPoisha ? Number(minOrderAmountPoisha) : 0,
      startDate: startDate || null,
      endDate: endDate || null,
      totalUsageLimit: totalUsageLimit ? Number(totalUsageLimit) : null,
      currentUsageCount: existingIdx >= 0 ? coupons[existingIdx].currentUsageCount : 0,
      perCustomerUsageLimit: perCustomerUsageLimit ? Number(perCustomerUsageLimit) : null,
      allowedProductIds: allowedProductIds || [],
      excludedProductIds: excludedProductIds || [],
      allowedCategoryIds: allowedCategoryIds || [],
      excludedCategoryIds: excludedCategoryIds || [],
      isFirstOrderOnly: !!isFirstOrderOnly,
      canReduceDelivery: !!canReduceDelivery,
      isActive: isActive !== false,
      description: description || '',
    };

    if (existingIdx >= 0) {
      coupons[existingIdx] = couponEntry;
    } else {
      coupons.push(couponEntry);
    }

    await writeCoupons(coupons);

    await logActivity({
      userId: authUser.id,
      userName: authUser.name || 'Admin',
      action: existingIdx >= 0 ? 'UPDATE' : 'CREATE',
      entityType: 'Coupon',
      entityId: couponEntry.id,
      entityName: couponEntry.code,
      description: `${existingIdx >= 0 ? 'Updated' : 'Created'} promotional coupon ${couponEntry.code}`,
      request,
    });

    return NextResponse.json({
      success: true,
      data: couponEntry,
      message: `Coupon ${couponEntry.code} saved successfully`,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Save coupon error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save coupon' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    if (!isAdmin(authUser.role as UserRole)) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');

    if (!id && !code) {
      return NextResponse.json({ success: false, error: 'Coupon id or code required' }, { status: 400 });
    }

    let coupons = await readCoupons(true);
    const initialCount = coupons.length;
    coupons = coupons.filter(
      (c) => c.id !== id && c.code.toUpperCase() !== (code || '').toUpperCase()
    );

    if (coupons.length === initialCount) {
      return NextResponse.json({ success: false, error: 'Coupon not found' }, { status: 404 });
    }

    await writeCoupons(coupons);

    await logActivity({
      userId: authUser.id,
      userName: authUser.name || 'Admin',
      action: 'DELETE',
      entityType: 'Coupon',
      entityId: id || code || '',
      entityName: code || id || '',
      description: `Deleted promotional coupon ${code || id}`,
      request,
    });

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ success: false, error: 'Failed to delete coupon' }, { status: 500 });
  }
}

