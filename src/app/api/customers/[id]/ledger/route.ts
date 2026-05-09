import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/customers/[id]/ledger - Get customer payment/sale ledger
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await db.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Customer not found' }, { status: 404 });
    }

    // Get all sales for this customer
    const sales = await db.sale.findMany({
      where: { customerId: id, status: 'Completed' },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        invoiceNo: true,
        date: true,
        grandTotal: true,
        paidAmount: true,
        balanceDue: true,
        paymentMode: true,
        status: true,
      },
    });

    // Get all payments for this customer
    const payments = await db.payment.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
    });

    // Get returns for this customer
    const returns = await db.return.findMany({
      where: { customerId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: { medicineName: true, quantity: true, total: true },
        },
      },
    });

    // Build ledger entries
    const ledger: Array<{
      id: string;
      date: Date;
      type: 'sale' | 'payment' | 'return';
      reference: string;
      debit: number;
      credit: number;
      balance: number;
      details: string;
    }> = [];

    let runningBalance = 0;

    // Add sales as debit entries
    for (const sale of sales) {
      runningBalance += sale.grandTotal;
      ledger.push({
        id: sale.id,
        date: sale.date,
        type: 'sale',
        reference: sale.invoiceNo,
        debit: sale.grandTotal,
        credit: 0,
        balance: runningBalance,
        details: `Sale - ${sale.paymentMode}`,
      });
    }

    // Add payments as credit entries
    for (const payment of payments) {
      runningBalance -= payment.amount;
      ledger.push({
        id: payment.id,
        date: payment.createdAt,
        type: 'payment',
        reference: payment.reference || `PAY-${payment.id.slice(-6)}`,
        debit: 0,
        credit: payment.amount,
        balance: runningBalance,
        details: `Payment - ${payment.mode}`,
      });
    }

    // Add returns as credit entries
    for (const ret of returns) {
      runningBalance -= ret.totalAmount;
      ledger.push({
        id: ret.id,
        date: ret.createdAt,
        type: 'return',
        reference: ret.returnNo,
        debit: 0,
        credit: ret.totalAmount,
        balance: runningBalance,
        details: `Return - ${ret.reason || 'N/A'}`,
      });
    }

    // Sort by date descending
    ledger.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          balance: customer.balance,
        },
        totalSales: sales.reduce((sum, s) => sum + s.grandTotal, 0),
        totalPayments: payments.reduce((sum, p) => sum + p.amount, 0),
        totalReturns: returns.reduce((sum, r) => sum + r.totalAmount, 0),
        salesCount: sales.length,
        paymentsCount: payments.length,
        returnsCount: returns.length,
        ledger,
      },
    });
  } catch (error) {
    console.error('Customer ledger error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
