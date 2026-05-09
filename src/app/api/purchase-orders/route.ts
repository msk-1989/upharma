import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/purchase-orders?status=Draft&supplierId=...&from=DATE&to=DATE&page=1&limit=20
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to + 'T23:59:59.999Z');
    }
    if (search) {
      where.OR = [
        { poNumber: { contains: search } },
        { supplier: { name: { contains: search } } },
        { notes: { contains: search } },
      ];
    }

    const [purchaseOrders, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          supplier: { select: { id: true, name: true, phone: true } },
          user: { select: { id: true, name: true } },
          items: { select: { id: true, medicineId: true, medicineName: true, quantity: true, receivedQty: true } },
          _count: { select: { items: true } },
        },
      }),
      db.purchaseOrder.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: purchaseOrders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// POST /api/purchase-orders
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { supplierId, expectedDate, notes, items, userId } = body;

    if (!supplierId || !items || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Supplier and at least one item are required' }, { status: 400 });
    }

    // Validate supplier exists
    const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    // Calculate totals and prepare items
    let subtotal = 0;
    let totalGst = 0;
    const poItemsData: any[] = [];

    for (const item of items) {
      if (!item.medicineId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json({ success: false, error: 'Each item must have a medicine and positive quantity' }, { status: 400 });
      }

      const medicine = await db.medicine.findUnique({ where: { id: item.medicineId } });
      if (!medicine) {
        return NextResponse.json({ success: false, error: `Medicine not found: ${item.medicineId}` }, { status: 404 });
      }

      const purchaseRate = item.purchaseRate || medicine.purchaseRate || 0;
      const gstPercent = medicine.gstPercent || 12;

      // Calculate quantity in smallest units
      let qtySmallest = item.quantity;
      if (item.unitType === 'strip') qtySmallest = item.quantity * medicine.unitsPerStrip;
      else if (item.unitType === 'box') qtySmallest = item.quantity * medicine.stripsPerBox * medicine.unitsPerStrip;

      const lineBase = qtySmallest * purchaseRate;
      const lineGst = lineBase * gstPercent / 100;

      subtotal += lineBase;
      totalGst += lineGst;

      poItemsData.push({
        medicineId: medicine.id,
        medicineName: medicine.name,
        quantity: item.quantity,
        unitType: item.unitType || 'strip',
        purchaseRate,
        gstPercent,
        notes: item.notes || null,
        receivedQty: 0,
      });
    }

    const grandTotal = subtotal + totalGst;

    // Auto-generate PO number: PO-YYYYMMDD-NNN
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, '0') +
      String(today.getDate()).padStart(2, '0');
    const prefix = `PO-${dateStr}-`;

    const lastPO = await db.purchaseOrder.findFirst({
      where: { poNumber: { startsWith: prefix } },
      orderBy: { createdAt: 'desc' },
      select: { poNumber: true },
    });

    let nextNum = 1;
    if (lastPO?.poNumber) {
      const parts = lastPO.poNumber.split('-');
      const num = parseInt(parts[parts.length - 1]);
      if (!isNaN(num)) nextNum = num + 1;
    }

    const poNumber = `${prefix}${String(nextNum).padStart(3, '0')}`;

    const purchaseOrder = await db.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        subtotal: Math.round(subtotal * 100) / 100,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        status: 'Draft',
        notes: notes || null,
        userId: userId || null,
        items: { create: poItemsData },
      },
      include: {
        supplier: { select: { id: true, name: true, phone: true, address: true } },
        user: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ success: true, data: purchaseOrder }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
