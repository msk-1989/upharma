import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/customers/[id] - Get single customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await db.customer.findUnique({
      where: { id },
      include: {
        sales: {
          where: { status: 'Completed' },
          take: 20,
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
            items: {
              select: {
                medicineName: true,
                quantity: true,
                total: true,
              },
            },
          },
        },
        payments: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Calculate monthly loyalty points earned
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlySales = await db.sale.aggregate({
      where: {
        customerId: id,
        status: 'Completed',
        date: { gte: startOfMonth },
      },
      _sum: {
        loyaltyPointsEarned: true,
      },
    });

    const monthlyPointsEarned = monthlySales._sum.loyaltyPointsEarned || 0;

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        monthlyPointsEarned,
      },
    });
  } catch (error) {
    console.error('Customer get error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Handle loyalty points adjustment
    let loyaltyPoints = customer.loyaltyPoints;
    if (body.loyaltyPoints !== undefined) {
      // Set absolute value
      loyaltyPoints = body.loyaltyPoints;
    } else if (body.adjustPoints !== undefined) {
      // Add/subtract points
      loyaltyPoints = customer.loyaltyPoints + body.adjustPoints;
      if (loyaltyPoints < 0) {
        loyaltyPoints = 0;
      }
    }

    const updated = await db.customer.update({
      where: { id },
      data: {
        name: body.name ?? customer.name,
        phone: body.phone !== undefined ? body.phone : customer.phone,
        email: body.email !== undefined ? body.email : customer.email,
        address: body.address !== undefined ? body.address : customer.address,
        doctorName: body.doctorName !== undefined ? body.doctorName : customer.doctorName,
        balance: body.balance !== undefined ? body.balance : customer.balance,
        totalPurchases: body.totalPurchases !== undefined ? body.totalPurchases : customer.totalPurchases,
        active: body.active !== undefined ? body.active : customer.active,
        loyaltyPoints,
        creditLimit: body.creditLimit !== undefined ? body.creditLimit : customer.creditLimit,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Customer update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update customer' }, { status: 500 });
  }
}
