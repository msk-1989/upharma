import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const schedule = searchParams.get('schedule') || '';

    const where: Prisma.MedicineWhereInput = { active: true };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { genericName: { contains: search } },
        { barcode: { contains: search } },
        { manufacturer: { contains: search } },
        { alternateBarcodes: { contains: search } },
      ];
    }
    if (category && category !== 'all') where.category = category;
    if (schedule && schedule !== 'all') where.drugSchedule = schedule;

    const medicines = await db.medicine.findMany({
      where,
      include: {
        batches: { where: { active: true }, orderBy: { expiryDate: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    const data = medicines.map((m) => ({
      ...m,
      totalStock: m.batches.reduce((s, b) => s + b.stockQty, 0),
      nextExpiry: m.batches.length > 0 ? m.batches[0].expiryDate : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const medicine = await db.medicine.create({ data: body });
    return NextResponse.json({ success: true, data: medicine }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
