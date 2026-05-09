import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/racks — List all racks with batch count
export async function GET() {
  try {
    const racks = await db.rack.findMany({
      where: { active: true },
      orderBy: [{ aisle: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { batches: true },
        },
      },
    });

    // For each rack, also get total item qty
    const racksWithStats = await Promise.all(
      racks.map(async (rack) => {
        const batchAgg = await db.medicineBatch.aggregate({
          where: { rackId: rack.id, active: true },
          _sum: { stockQty: true },
        });
        return {
          ...rack,
          totalItems: batchAgg._sum.stockQty || 0,
        };
      })
    );

    return NextResponse.json({ success: true, data: racksWithStats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/racks — Create rack
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Rack name is required' },
        { status: 400 }
      );
    }

    const rack = await db.rack.create({
      data: {
        name: body.name.trim(),
        aisle: body.aisle?.trim() || null,
        section: body.section?.trim() || null,
        description: body.description?.trim() || null,
      },
    });

    return NextResponse.json({ success: true, data: rack }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
