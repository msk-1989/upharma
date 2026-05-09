import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/medicines/substitutes?id=MEDICINE_ID
// Returns all medicines with the same genericName (different brand, same salt composition)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Medicine ID is required' },
        { status: 400 }
      );
    }

    // Find the source medicine
    const sourceMedicine = await db.medicine.findUnique({
      where: { id },
    });

    if (!sourceMedicine) {
      return NextResponse.json(
        { success: false, error: 'Medicine not found' },
        { status: 404 }
      );
    }

    if (!sourceMedicine.genericName) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'This medicine has no generic name — no substitutes available',
      });
    }

    // Find all active medicines with the same genericName but different id
    const substitutes = await db.medicine.findMany({
      where: {
        id: { not: id },
        genericName: sourceMedicine.genericName,
        active: true,
      },
      include: {
        batches: {
          where: { active: true, stockQty: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = substitutes.map((m) => ({
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      manufacturer: m.manufacturer,
      drugSchedule: m.drugSchedule,
      baseUnit: m.baseUnit,
      unitsPerStrip: m.unitsPerStrip,
      stripsPerBox: m.stripsPerBox,
      saleRate: m.saleRate,
      mrp: m.mrp,
      gstPercent: m.gstPercent,
      totalStock: m.batches.reduce((s, b) => s + b.stockQty, 0),
      bestPrice: m.batches.length > 0 ? Math.min(...m.batches.map((b) => b.saleRate)) : m.saleRate,
      nextExpiry: m.batches.length > 0 ? m.batches[0].expiryDate : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
