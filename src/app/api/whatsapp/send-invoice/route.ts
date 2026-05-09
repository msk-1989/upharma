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
    const { saleId, phone } = body;

    if (!saleId) {
      return NextResponse.json(
        { success: false, error: 'saleId is required' },
        { status: 400 }
      );
    }

    // Fetch the sale with items
    const sale = await db.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: { select: { name: true, phone: true } },
        items: {
          select: {
            medicineName: true,
            quantity: true,
            unitType: true,
            saleRate: true,
            total: true,
            cgst: true,
            sgst: true,
            gstPercent: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        { success: false, error: 'Sale not found' },
        { status: 404 }
      );
    }

    const customerName = sale.customer?.name || sale.customerName || 'Walk-in Customer';
    const customerPhone = phone || sale.customer?.phone || null;

    // Build WhatsApp-formatted invoice text
    let itemsText = '';
    sale.items.forEach((item, index) => {
      const unitLabel = item.unitType === 'strip' ? 'strip' : item.unitType === 'box' ? 'box' : 'nos';
      itemsText += `${index + 1}. ${item.medicineName || 'Medicine'} x${item.quantity}${unitLabel === 'nos' ? '' : ` ${unitLabel}`} - ${formatINR(item.total)}\n`;
    });

    const cgstRate = sale.items.length > 0 ? (sale.items[0].gstPercent / 2) : 0;
    const sgstRate = sale.items.length > 0 ? (sale.items[0].gstPercent / 2) : 0;

    const invoiceText = `*Upharma Medical Store*
Invoice: ${sale.invoiceNo}
Date: ${formatDate(sale.date)}
Customer: ${customerName}

*Items:*
${itemsText}---
Subtotal: ${formatINR(sale.subtotal)}
CGST (${cgstRate}%): ${formatINR(sale.cgst)}
SGST (${sgstRate}%): ${formatINR(sale.sgst)}
*Total: ${formatINR(sale.grandTotal)}*
Paid: ${formatINR(sale.paidAmount)}${sale.balanceDue > 0 ? `\nDue: ${formatINR(sale.balanceDue)}` : ''}

Thank you! Visit again.`;

    return NextResponse.json({
      success: true,
      message: 'WhatsApp integration not configured. Invoice summary generated.',
      invoiceText,
      customerPhone,
      saleId: sale.id,
      invoiceNo: sale.invoiceNo,
    });
  } catch (error) {
    console.error('WhatsApp send-invoice error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice summary' },
      { status: 500 }
    );
  }
}
