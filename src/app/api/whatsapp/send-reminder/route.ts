import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== HELPERS ====================

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ==================== POST HANDLER ====================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId } = body;

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'customerId is required' },
        { status: 400 }
      );
    }

    // Fetch customer with their outstanding balance and recent sales
    const customer = await db.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: {
          where: {
            status: 'Completed',
            balanceDue: { gt: 0 },
          },
          select: {
            invoiceNo: true,
            date: true,
            grandTotal: true,
            paidAmount: true,
            balanceDue: true,
          },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.balance <= 0) {
      return NextResponse.json({
        success: true,
        message: 'No outstanding balance for this customer.',
        reminderText: '',
        hasOutstanding: false,
      });
    }

    // Build pending invoices summary
    let pendingInvoices = '';
    customer.sales.forEach((sale) => {
      pendingInvoices += `• ${sale.invoiceNo} (${formatDate(sale.date)}): Due ${formatINR(sale.balanceDue)}\n`;
    });

    const reminderText = `*Upharma Medical Store*
Payment Reminder

Dear ${customer.name},

Your outstanding balance is *${formatINR(customer.balance)}*

*Pending Invoices:*
${pendingInvoices || 'No specific invoices found.'}

Total Outstanding: *${formatINR(customer.balance)}*

Kindly clear the dues at your earliest convenience. For any queries, please contact us.

Thank you!`;

    return NextResponse.json({
      success: true,
      message: 'WhatsApp integration not configured.',
      reminderText,
      customerPhone: customer.phone,
      customerName: customer.name,
      outstandingBalance: customer.balance,
      pendingCount: customer.sales.length,
      hasOutstanding: true,
    });
  } catch (error) {
    console.error('WhatsApp send-reminder error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate payment reminder' },
      { status: 500 }
    );
  }
}
