import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/purchases/[id] - Get single purchase with items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const purchase = await db.purchase.findUnique({
      where: { id },
      include: {
        supplier: {
          select: { id: true, name: true, phone: true, address: true, gstNumber: true, drugLicense: true },
        },
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            medicine: {
              select: { name: true, genericName: true, baseUnit: true, unitsPerStrip: true, stripsPerBox: true },
            },
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ success: false, error: 'Purchase not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: purchase });
  } catch (error) {
    console.error('Purchase get error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
