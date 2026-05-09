import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== HELPERS ====================

function escapeCsvField(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function amt(value: number): string {
  return value.toFixed(2);
}

// ==================== SALES CSV ====================

async function generateSalesCsv(from: Date, to: Date): Promise<string> {
  const sales = await db.sale.findMany({
    where: {
      date: { gte: from, lte: to },
      status: 'Completed',
    },
    include: {
      customer: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const headers = ['InvoiceNo', 'Date', 'Customer', 'Subtotal', 'CGST', 'SGST', 'GrandTotal', 'PaymentMode', 'Status'];
  const rows = sales.map((sale) => [
    escapeCsvField(sale.invoiceNo),
    escapeCsvField(formatDate(sale.date)),
    escapeCsvField(sale.customer?.name || sale.customerName || 'Walk-in'),
    escapeCsvField(amt(sale.subtotal)),
    escapeCsvField(amt(sale.cgst)),
    escapeCsvField(amt(sale.sgst)),
    escapeCsvField(amt(sale.grandTotal)),
    escapeCsvField(sale.paymentMode),
    escapeCsvField(sale.status),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ==================== PURCHASES CSV ====================

async function generatePurchasesCsv(from: Date, to: Date): Promise<string> {
  const purchases = await db.purchase.findMany({
    where: {
      date: { gte: from, lte: to },
      status: 'Completed',
    },
    include: {
      supplier: { select: { name: true } },
    },
    orderBy: { date: 'asc' },
  });

  const headers = ['InvoiceNo', 'Date', 'Supplier', 'Subtotal', 'CGST', 'SGST', 'IGST', 'GrandTotal', 'PaidAmount', 'BalanceDue', 'Status'];
  const rows = purchases.map((p) => [
    escapeCsvField(p.invoiceNo),
    escapeCsvField(formatDate(p.date)),
    escapeCsvField(p.supplier?.name || 'Unknown'),
    escapeCsvField(amt(p.subtotal)),
    escapeCsvField(amt(p.cgst)),
    escapeCsvField(amt(p.sgst)),
    escapeCsvField(amt(p.igst)),
    escapeCsvField(amt(p.grandTotal)),
    escapeCsvField(amt(p.paidAmount)),
    escapeCsvField(amt(p.balanceDue)),
    escapeCsvField(p.status),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ==================== MEDICINES CSV ====================

async function generateMedicinesCsv(): Promise<string> {
  const medicines = await db.medicine.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  const headers = ['Name', 'GenericName', 'Manufacturer', 'Category', 'DrugSchedule', 'HSNCode', 'GSTPercent', 'PurchaseRate', 'SaleRate', 'MRP', 'ReorderLevel', 'BaseUnit', 'UnitsPerStrip'];
  const rows = medicines.map((m) => [
    escapeCsvField(m.name),
    escapeCsvField(m.genericName),
    escapeCsvField(m.manufacturer),
    escapeCsvField(m.category),
    escapeCsvField(m.drugSchedule),
    escapeCsvField(m.hsnCode),
    escapeCsvField(amt(m.gstPercent)),
    escapeCsvField(amt(m.purchaseRate)),
    escapeCsvField(amt(m.saleRate)),
    escapeCsvField(amt(m.mrp)),
    escapeCsvField(m.reorderLevel),
    escapeCsvField(m.baseUnit),
    escapeCsvField(m.unitsPerStrip),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ==================== CUSTOMERS CSV ====================

async function generateCustomersCsv(): Promise<string> {
  const customers = await db.customer.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });

  const headers = ['Name', 'Phone', 'Email', 'Address', 'Balance', 'TotalPurchases', 'LoyaltyPoints', 'CreditLimit'];
  const rows = customers.map((c) => [
    escapeCsvField(c.name),
    escapeCsvField(c.phone),
    escapeCsvField(c.email),
    escapeCsvField(c.address),
    escapeCsvField(amt(c.balance)),
    escapeCsvField(amt(c.totalPurchases)),
    escapeCsvField(c.loyaltyPoints),
    escapeCsvField(amt(c.creditLimit)),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ==================== STOCK CSV ====================

async function generateStockCsv(): Promise<string> {
  const batches = await db.medicineBatch.findMany({
    where: {
      active: true,
      stockQty: { gt: 0 },
    },
    include: {
      medicine: { select: { name: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });

  const headers = ['Medicine', 'BatchNo', 'ExpiryDate', 'Qty', 'PurchaseRate', 'SaleRate', 'MRP', 'StockValue'];
  const rows = batches.map((b) => [
    escapeCsvField(b.medicine.name),
    escapeCsvField(b.batchNo),
    escapeCsvField(formatDate(b.expiryDate)),
    escapeCsvField(b.stockQty),
    escapeCsvField(amt(b.purchaseRate)),
    escapeCsvField(amt(b.saleRate)),
    escapeCsvField(amt(b.mrp)),
    escapeCsvField(amt(b.stockQty * b.purchaseRate)),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

// ==================== GET HANDLER ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';

    let csv: string;
    let filename: string;

    switch (type) {
      case 'sales': {
        const fromStr = searchParams.get('from');
        const toStr = searchParams.get('to');
        if (!fromStr || !toStr) {
          return NextResponse.json(
            { error: 'Missing required parameters: from and to dates are required' },
            { status: 400 }
          );
        }
        const from = new Date(fromStr);
        const to = new Date(toStr);
        to.setHours(23, 59, 59, 999);
        csv = await generateSalesCsv(from, to);
        filename = `sales_${fromStr}_to_${toStr}.csv`;
        break;
      }

      case 'purchases': {
        const fromStr = searchParams.get('from');
        const toStr = searchParams.get('to');
        if (!fromStr || !toStr) {
          return NextResponse.json(
            { error: 'Missing required parameters: from and to dates are required' },
            { status: 400 }
          );
        }
        const from = new Date(fromStr);
        const to = new Date(toStr);
        to.setHours(23, 59, 59, 999);
        csv = await generatePurchasesCsv(from, to);
        filename = `purchases_${fromStr}_to_${toStr}.csv`;
        break;
      }

      case 'medicines': {
        csv = await generateMedicinesCsv();
        filename = 'medicines.csv';
        break;
      }

      case 'customers': {
        csv = await generateCustomersCsv();
        filename = 'customers.csv';
        break;
      }

      case 'stock': {
        csv = await generateStockCsv();
        filename = 'stock_valuation.csv';
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Supported types: sales, purchases, medicines, customers, stock' },
          { status: 400 }
        );
    }

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('CSV export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV export' },
      { status: 500 }
    );
  }
}
