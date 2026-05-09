import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sales/[id] - Get single sale with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const sale = await db.sale.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, address: true, doctorName: true },
        },
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            medicine: {
              select: { name: true, genericName: true, baseUnit: true, unitsPerStrip: true, stripsPerBox: true },
            },
            batch: {
              select: { batchNo: true, expiryDate: true },
            },
          },
        },
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ success: false, error: 'Sale not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: sale });
  } catch (error) {
    console.error('Sale get error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
