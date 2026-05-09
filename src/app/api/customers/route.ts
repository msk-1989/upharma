import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('include') === 'history';

    if (includeHistory) {
      const customers = await db.customer.findMany({
        orderBy: { name: 'asc' },
        include: {
          sales: {
            where: { status: 'Completed' },
            take: 10,
            orderBy: { date: 'desc' },
            select: {
              id: true,
              invoiceNo: true,
              date: true,
              grandTotal: true,
              paidAmount: true,
              balanceDue: true,
              paymentMode: true,
              loyaltyPointsEarned: true,
              loyaltyPointsUsed: true,
            },
          },
        },
      });
      return NextResponse.json({ success: true, data: customers });
    }

    const customers = await db.customer.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ success: true, data: customers });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customer = await db.customer.create({ data: body });
    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
