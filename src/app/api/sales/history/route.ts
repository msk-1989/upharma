import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/sales/history - Get sales with date range and payment filter
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const paymentMode = searchParams.get('payment');
    const invoiceNo = searchParams.get('invoiceNo');
    const customer = searchParams.get('customer');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '500');

    // Build where clause
    const where: any = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom + 'T00:00:00.000Z');
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
      }
    }

    if (paymentMode && paymentMode !== 'all') {
      where.paymentMode = paymentMode;
    }

    if (invoiceNo) {
      where.invoiceNo = { contains: invoiceNo, mode: 'insensitive' };
    }

    if (customer) {
      where.OR = [
        { customerName: { contains: customer, mode: 'insensitive' } },
        { customer: { name: { contains: customer, mode: 'insensitive' } } },
      ];
    }

    const sales = await db.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true, phone: true } },
        user: { select: { name: true } },
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const total = await db.sale.count({ where });

    return NextResponse.json({
      success: true,
      data: sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Sales history error:', error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
