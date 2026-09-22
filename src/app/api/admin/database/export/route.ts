import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Intentionally narrow for this first cut — products/categories are the
// most common bulk-data-management targets for this catalog-driven B2B app
// and the simplest to validate safely. Exporting e.g. Order/financial
// tables is a materially bigger validation problem and isn't in scope here.
const EXPORTABLE_ENTITIES = ['products', 'categories'] as const;
type ExportableEntity = (typeof EXPORTABLE_ENTITIES)[number];

const MAX_EXPORT_ROWS = 50000;

// GET /api/admin/database/export?entity=products|categories — admin only.
// Returns the full table as a JSON array. The frontend can additionally
// convert this to CSV client-side via the existing utils/csvExport.ts
// helper — no server-side CSV serialization here.
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAdmin(request);

    const entity = request.nextUrl.searchParams.get('entity') as ExportableEntity | null;
    if (!entity || !EXPORTABLE_ENTITIES.includes(entity)) {
      return NextResponse.json(
        { success: false, error: `entity must be one of: ${EXPORTABLE_ENTITIES.join(', ')}` },
        { status: 400 }
      );
    }

    const count =
      entity === 'products' ? await prisma.product.count() : await prisma.category.count();

    if (count > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          success: false,
          error: `Export refused: ${count} rows exceeds the ${MAX_EXPORT_ROWS}-row export cap.`,
        },
        { status: 400 }
      );
    }

    const rows =
      entity === 'products'
        ? await prisma.product.findMany({ orderBy: { createdAt: 'asc' } })
        : await prisma.category.findMany({ orderBy: { createdAt: 'asc' } });

    await logActivity({
      userId: authUser.id,
      userName: authUser.name,
      action: 'EXPORT',
      entityType: entity === 'products' ? 'Product' : 'Category',
      description: `Exported ${rows.length} ${entity} record(s)`,
      metadata: { entity, rowCount: rows.length },
      request,
    });

    return NextResponse.json({ success: true, entity, rowCount: rows.length, rows });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Data export error:', error);
    return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
  }
}
