import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const medicine = await db.medicine.findUnique({
      where: { id },
      include: { batches: { where: { active: true }, orderBy: { expiryDate: 'asc' } } },
    });
    if (!medicine) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: { ...medicine, totalStock: medicine.batches.reduce((s, b) => s + b.stockQty, 0) } });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    // Whitelist allowed fields to prevent Prisma errors from extra keys
    const { name, genericName, manufacturer, category, drugSchedule, hsnCode, gstPercent, barcode, alternateBarcodes, baseUnit, unitsPerStrip, stripsPerBox, allowLooseSale, purchaseRate, saleRate, mrp, reorderLevel, imageUrl } = body;
    const medicine = await db.medicine.update({
      where: { id },
      data: { name, genericName, manufacturer, category, drugSchedule, hsnCode, gstPercent, barcode, alternateBarcodes, baseUnit, unitsPerStrip, stripsPerBox, allowLooseSale, purchaseRate, saleRate, mrp, reorderLevel, imageUrl },
    });
    return NextResponse.json({ success: true, data: medicine });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.medicine.update({ where: { id }, data: { active: false } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
