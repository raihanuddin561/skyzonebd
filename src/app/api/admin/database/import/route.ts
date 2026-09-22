import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type ImportEntity = 'products' | 'categories';
type ImportMode = 'insert' | 'upsert';

// Explicit allow-list of writable fields per entity — an imported row is
// never trusted with arbitrary fields (id, timestamps, profit/rating
// fields, foreign keys not listed here are all rejected silently by simply
// not being read out of the row).
const CATEGORY_FIELDS = ['name', 'slug', 'description', 'imageUrl', 'isActive'] as const;
const PRODUCT_FIELDS = [
  'name', 'slug', 'description', 'imageUrl', 'imageUrls', 'thumbnailUrl',
  'brand', 'tags', 'specifications', 'unit', 'basePrice', 'wholesalePrice',
  'moq', 'stockQuantity', 'reorderLevel', 'reorderQuantity', 'availability',
  'sku', 'categoryId', 'isActive', 'isFeatured', 'metaTitle', 'metaDescription',
] as const;

const REQUIRED_PRODUCT_FIELDS = ['name', 'slug', 'imageUrl', 'basePrice', 'wholesalePrice', 'categoryId'];
const REQUIRED_CATEGORY_FIELDS = ['name', 'slug'];

// CSV values arrive as plain strings (there's no type info in a .csv file),
// and a JSON import can just as easily carry a stringified "true"/"123" —
// Prisma rejects a string where a Boolean/Float/Int is expected rather than
// coercing it, so every non-string field this route writes needs an
// explicit conversion pass before it reaches Prisma.
const BOOLEAN_FIELDS = new Set(['isActive', 'isFeatured']);
const NUMBER_FIELDS = new Set(['basePrice', 'wholesalePrice', 'moq', 'stockQuantity', 'reorderLevel', 'reorderQuantity']);
const ARRAY_FIELDS = new Set(['tags', 'imageUrls']);

function coerceValue(field: string, value: unknown): unknown {
  if (value === '' || value === null) return undefined; // treat blank cell as "not provided"
  if (BOOLEAN_FIELDS.has(field)) {
    if (typeof value === 'boolean') return value;
    const normalized = String(value).trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  if (NUMBER_FIELDS.has(field)) {
    return typeof value === 'number' ? value : Number(value);
  }
  if (ARRAY_FIELDS.has(field)) {
    if (Array.isArray(value)) return value;
    return String(value).split(',').map((v) => v.trim()).filter(Boolean);
  }
  return value;
}

function pickAllowed<T extends readonly string[]>(row: Record<string, unknown>, fields: T) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (row[f] !== undefined) {
      const coerced = coerceValue(f, row[f]);
      if (coerced !== undefined) out[f] = coerced;
    }
  }
  return out;
}

interface RowResult {
  index: number;
  success: boolean;
  error?: string;
  id?: string;
}

// POST /api/admin/database/import — admin only.
// Body: { entity: 'products' | 'categories', rows: Record<string, unknown>[], mode: 'insert' | 'upsert' }
// Each row is processed independently (not one all-or-nothing transaction)
// so a batch partially succeeds and reports exactly which rows failed and
// why, rather than an entire CSV/JSON import being thrown out for one bad row.
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdmin(request);

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { entity, rows, mode } = body as {
      entity?: ImportEntity;
      rows?: Record<string, unknown>[];
      mode?: ImportMode;
    };

    if (entity !== 'products' && entity !== 'categories') {
      return NextResponse.json(
        { success: false, error: 'entity must be "products" or "categories"' },
        { status: 400 }
      );
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'rows must be a non-empty array' }, { status: 400 });
    }
    if (rows.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Import refused: maximum 5000 rows per request' },
        { status: 400 }
      );
    }
    const importMode: ImportMode = mode === 'upsert' ? 'upsert' : 'insert';

    let validCategoryIds: Set<string> | null = null;
    if (entity === 'products') {
      const categories = await prisma.category.findMany({ select: { id: true } });
      validCategoryIds = new Set(categories.map((c) => c.id));
    }

    const results: RowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rawRow = rows[i];
      try {
        if (entity === 'categories') {
          const data = pickAllowed(rawRow, CATEGORY_FIELDS);
          const missing = REQUIRED_CATEGORY_FIELDS.filter((f) => !data[f]);
          if (missing.length > 0) {
            results.push({ index: i, success: false, error: `Missing required field(s): ${missing.join(', ')}` });
            continue;
          }
          const record =
            importMode === 'upsert'
              ? await prisma.category.upsert({
                  where: { slug: data.slug as string },
                  create: data as any,
                  update: data as any,
                })
              : await prisma.category.create({ data: data as any });
          results.push({ index: i, success: true, id: record.id });
        } else {
          const data = pickAllowed(rawRow, PRODUCT_FIELDS);
          const missing = REQUIRED_PRODUCT_FIELDS.filter((f) => data[f] === undefined || data[f] === null || data[f] === '');
          if (missing.length > 0) {
            results.push({ index: i, success: false, error: `Missing required field(s): ${missing.join(', ')}` });
            continue;
          }
          if (!validCategoryIds!.has(data.categoryId as string)) {
            results.push({ index: i, success: false, error: `Unknown categoryId: ${data.categoryId}` });
            continue;
          }
          const record =
            importMode === 'upsert'
              ? await prisma.product.upsert({
                  where: { slug: data.slug as string },
                  create: data as any,
                  update: data as any,
                })
              : await prisma.product.create({ data: data as any });
          results.push({ index: i, success: true, id: record.id });
        }
      } catch (rowError) {
        results.push({
          index: i,
          success: false,
          error: rowError instanceof Error ? rowError.message : 'Unknown error',
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.length - succeeded;

    await logActivity({
      userId: authUser.id,
      userName: authUser.name,
      action: 'IMPORT',
      entityType: entity === 'products' ? 'Product' : 'Category',
      description: `Imported ${entity}: ${succeeded} succeeded, ${failed} failed (mode: ${importMode})`,
      metadata: { entity, mode: importMode, succeeded, failed, totalRows: rows.length },
      request,
    });

    return NextResponse.json({
      success: true,
      summary: { total: rows.length, succeeded, failed },
      results,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Data import error:', error);
    return NextResponse.json({ success: false, error: 'Import failed' }, { status: 500 });
  }
}
