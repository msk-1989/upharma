import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/purchase-orders/auto-suggest
// Returns medicines where total stock across all batches < reorderLevel
export async function GET() {
  try {
    // Fetch all active medicines with their batches
    const medicines = await db.medicine.findMany({
      where: { active: true },
      include: {
        batches: {
          where: { active: true },
          select: { stockQty: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const suggestions = medicines
      .map((med) => {
        const currentStock = med.batches.reduce((sum: number, b: any) => sum + b.stockQty, 0);
        const shortage = med.reorderLevel - currentStock;
        return {
          id: med.id,
          name: med.name,
          genericName: med.genericName,
          manufacturer: med.manufacturer,
          currentStock,
          reorderLevel: med.reorderLevel,
          shortage: shortage > 0 ? shortage : 0,
          purchaseRate: med.purchaseRate,
          baseUnit: med.baseUnit,
          unitsPerStrip: med.unitsPerStrip,
          stripsPerBox: med.stripsPerBox,
          suggestedOrderQty: shortage > 0 ? Math.max(shortage, med.unitsPerStrip) : 0,
        };
      })
      .filter((m) => m.shortage > 0)
      .sort((a, b) => b.shortage - a.shortage);

    return NextResponse.json({
      success: true,
      data: suggestions,
      summary: {
        totalBelowReorder: suggestions.length,
        totalShortage: suggestions.reduce((sum, m) => sum + m.shortage, 0),
        estimatedValue: suggestions.reduce((sum, m) => sum + (m.suggestedOrderQty * m.purchaseRate), 0),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
