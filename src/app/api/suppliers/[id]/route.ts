import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/suppliers/[id] - Get single supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supplier = await db.supplier.findUnique({
      where: { id },
      include: {
        purchases: {
          take: 20,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            invoiceNo: true,
            date: true,
            grandTotal: true,
            paidAmount: true,
            balanceDue: true,
            status: true,
          },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: supplier });
  } catch (error) {
    console.error('Supplier get error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/suppliers/[id] - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supplier = await db.supplier.findUnique({ where: { id } });
    if (!supplier) {
      return NextResponse.json({ success: false, error: 'Supplier not found' }, { status: 404 });
    }

    const updated = await db.supplier.update({
      where: { id },
      data: {
        name: body.name ?? supplier.name,
        contactPerson: body.contactPerson !== undefined ? body.contactPerson : supplier.contactPerson,
        phone: body.phone !== undefined ? body.phone : supplier.phone,
        email: body.email !== undefined ? body.email : supplier.email,
        address: body.address !== undefined ? body.address : supplier.address,
        gstNumber: body.gstNumber !== undefined ? body.gstNumber : supplier.gstNumber,
        drugLicense: body.drugLicense !== undefined ? body.drugLicense : supplier.drugLicense,
        balance: body.balance !== undefined ? body.balance : supplier.balance,
        active: body.active !== undefined ? body.active : supplier.active,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Supplier update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update supplier' }, { status: 500 });
  }
}
