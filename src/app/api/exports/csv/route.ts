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
      supplier: { select: { name: true, address: true } },
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

// ==================== GST CSV ====================

async function generateGstCsv(fromStr: string, toStr: string): Promise<string> {
  const dateFilter: Record<string, unknown> = {};
  if (fromStr) dateFilter.gte = new Date(fromStr);
  if (toStr) { const to = new Date(toStr); to.setHours(23, 59, 59, 999); dateFilter.lte = to; }

  const sales = await db.sale.findMany({
    where: { status: 'Completed', ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: true },
  });

  const gstByRate: Record<string, { rate: string; taxable: number; cgst: number; sgst: number; totalGst: number; items: number }> = {};
  for (const item of sales.flatMap(s => s.items)) {
    const key = `${item.gstPercent}%`;
    if (!gstByRate[key]) gstByRate[key] = { rate: `${item.gstPercent}%`, taxable: 0, cgst: 0, sgst: 0, totalGst: 0, items: 0 };
    gstByRate[key].taxable += Math.max(0, item.total - item.cgst - item.sgst);
    gstByRate[key].cgst += item.cgst;
    gstByRate[key].sgst += item.sgst;
    gstByRate[key].totalGst += item.cgst + item.sgst;
    gstByRate[key].items += 1;
  }

  const totalOutput = Object.values(gstByRate);
  const totalGst = totalOutput.reduce((s, r) => s + r.totalGst, 0);

  const headers = ['GST Rate', 'Taxable Amount', 'CGST', 'SGST', 'Total GST', 'Items'];
  const rows = totalOutput.map(r => [
    escapeCsvField(r.rate),
    escapeCsvField(amt(r.taxable)),
    escapeCsvField(amt(r.cgst)),
    escapeCsvField(amt(r.sgst)),
    escapeCsvField(amt(r.totalGst)),
    escapeCsvField(r.items),
  ]);

  return [`GST Report (Date: ${fromStr || 'All'} to ${toStr || 'All'})`, '', headers.join(','), ...rows.map(r => r.join(',')), '', `Total GST Payable,,,,,${amt(totalGst)}`].join('\n');
}

// ==================== EXPIRY CSV ====================

async function generateExpiryCsv(): Promise<string> {
  const now = new Date();
  const batches = await db.medicineBatch.findMany({
    where: { active: true, stockQty: { gt: 0 } },
    include: { medicine: { select: { name: true, genericName: true, category: true } } },
    orderBy: { expiryDate: 'asc' },
  });

  const items = batches.map(b => {
    const days = Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const status = days <= 0 ? 'EXPIRED' : days <= 90 ? 'CRITICAL' : days <= 180 ? 'WARNING' : 'OK';
    return {
      medicineName: b.medicine.name,
      genericName: b.medicine.genericName || '',
      category: b.medicine.category || '',
      batchNo: b.batchNo,
      expiryDate: formatDate(b.expiryDate),
      stockQty: b.stockQty,
      purchaseRate: b.purchaseRate,
      costValue: Math.round(b.stockQty * b.purchaseRate * 100) / 100,
      daysToExpiry: days,
      status,
    };
  });

  const headers = ['Medicine', 'Generic', 'Category', 'BatchNo', 'ExpiryDate', 'Stock', 'CostValue', 'DaysLeft', 'Status'];
  const rows = items.map(i => [
    escapeCsvField(i.medicineName),
    escapeCsvField(i.genericName),
    escapeCsvField(i.category),
    escapeCsvField(i.batchNo),
    escapeCsvField(i.expiryDate),
    escapeCsvField(i.stockQty),
    escapeCsvField(amt(i.costValue)),
    escapeCsvField(i.daysToExpiry),
    escapeCsvField(i.status),
  ]);

  const expired = items.filter(i => i.status === 'EXPIRED');
  const critical = items.filter(i => i.status === 'CRITICAL');
  const totalExpiredValue = expired.reduce((s, i) => s + i.costValue, 0);
  const totalCriticalValue = critical.reduce((s, i) => s + i.costValue, 0);

  return [`Expiry Report (Generated: ${formatDate(now)})`, '', headers.join(','), ...rows.map(r => r.join(',')), '', `Expired: ${expired.length} items, Value: ${amt(totalExpiredValue)}`, `Critical (90 days): ${critical.length} items, Value: ${amt(totalCriticalValue)}`].join('\n');
}

// ==================== PROFIT CSV ====================

async function generateProfitCsv(fromStr: string, toStr: string): Promise<string> {
  const dateFilter: Record<string, unknown> = {};
  if (fromStr) dateFilter.gte = new Date(fromStr);
  if (toStr) { const to = new Date(toStr); to.setHours(23, 59, 59, 999); dateFilter.lte = to; }

  const sales = await db.sale.findMany({
    where: { status: 'Completed', ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: true },
  });

  const purchases = await db.purchase.findMany({
    where: { status: 'Completed', ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
  });

  const totalRevenue = sales.reduce((s, x) => s + x.grandTotal, 0);
  const totalGst = sales.reduce((s, x) => s + x.totalGst, 0);
  const totalDiscount = sales.reduce((s, x) => s + x.totalDiscount, 0);
  const totalPurchaseCost = purchases.reduce((s, x) => s + x.grandTotal, 0);
  const netRevenue = totalRevenue - totalGst + totalDiscount;
  const grossProfit = netRevenue - totalPurchaseCost;
  const margin = netRevenue > 0 ? (grossProfit / netRevenue * 100) : 0;

  const headers = ['Metric', 'Amount'];
  const rows = [
    ['Total Sales', amt(sales.length)],
    ['Gross Revenue', amt(totalRevenue)],
    ['Total GST Collected', amt(totalGst)],
    ['Total Discount', amt(totalDiscount)],
    ['Net Revenue (excl GST)', amt(Math.round(netRevenue * 100) / 100)],
    ['Total Purchase Cost', amt(totalPurchaseCost)],
    ['Gross Profit', amt(Math.round(grossProfit * 100) / 100)],
    ['Gross Margin %', `${margin.toFixed(2)}%`],
  ];

  return [`Profit & Loss Report (Date: ${fromStr || 'All'} to ${toStr || 'All'})`, '', headers.join(','), ...rows.map(r => r.map(v => escapeCsvField(v)).join(','))].join('\n');
}

// ==================== SCHEDULE INVENTORY CSV ====================

async function generateScheduleInventoryCsv(): Promise<string> {
  const medicines = await db.medicine.findMany({
    where: { active: true },
    include: { batches: { where: { active: true }, select: { stockQty: true, purchaseRate: true, saleRate: true, expiryDate: true, batchNo: true } } },
    orderBy: { name: 'asc' },
  });

  const scheduleGroups: Record<string, { items: { name: string; totalStock: number; costValue: number; saleValue: number }[]; totalItems: number; totalUnits: number; totalCost: number; totalSale: number }> = {};
  for (const med of medicines) {
    const totalStock = med.batches.reduce((s, b) => s + b.stockQty, 0);
    if (totalStock === 0) continue;
    const schedule = med.drugSchedule || 'OTC';
    if (!scheduleGroups[schedule]) scheduleGroups[schedule] = { items: [], totalItems: 0, totalUnits: 0, totalCost: 0, totalSale: 0 };
    const costValue = med.batches.reduce((s, b) => s + b.stockQty * b.purchaseRate, 0);
    const saleValue = med.batches.reduce((s, b) => s + b.stockQty * b.saleRate, 0);
    scheduleGroups[schedule].items.push({ name: med.name, totalStock, costValue: Math.round(costValue * 100) / 100, saleValue: Math.round(saleValue * 100) / 100 });
    scheduleGroups[schedule].totalItems += 1;
    scheduleGroups[schedule].totalUnits += totalStock;
    scheduleGroups[schedule].totalCost += costValue;
    scheduleGroups[schedule].totalSale += saleValue;
  }

  const headers = ['Schedule', 'Medicine', 'Stock Qty', 'Cost Value', 'Sale Value'];
  const rows: string[][] = [];
  for (const [schedule, group] of Object.entries(scheduleGroups)) {
    rows.push([escapeCsvField(schedule), '', '', escapeCsvField(amt(Math.round(group.totalCost * 100) / 100)), escapeCsvField(amt(Math.round(group.totalSale * 100) / 100))]);
    for (const item of group.items) {
      rows.push(['', escapeCsvField(item.name), escapeCsvField(item.totalStock), escapeCsvField(amt(item.costValue)), escapeCsvField(item.saleValue)]);
    }
  }

  return ['Schedule-wise Inventory Report', '', headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

// ==================== SCHEDULE SALES CSV ====================

async function generateScheduleSalesCsv(fromStr: string, toStr: string): Promise<string> {
  const dateFilter: Record<string, unknown> = {};
  if (fromStr) dateFilter.gte = new Date(fromStr);
  if (toStr) { const to = new Date(toStr); to.setHours(23, 59, 59, 999); dateFilter.lte = to; }

  const sales = await db.sale.findMany({
    where: { status: 'Completed', ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: { include: { medicine: { select: { name: true, drugSchedule: true } } } } },
    orderBy: { date: 'desc' },
  });

  const scheduleGroups: Record<string, { items: number; revenue: number }> = {};
  let totalRevenueAll = 0;
  for (const sale of sales) {
    for (const item of sale.items) {
      const schedule = item.medicine?.drugSchedule || 'OTC';
      if (!scheduleGroups[schedule]) scheduleGroups[schedule] = { items: 0, revenue: 0 };
      scheduleGroups[schedule].items += item.quantity;
      scheduleGroups[schedule].revenue += item.total;
    }
    totalRevenueAll += sale.grandTotal;
  }

  const headers = ['Drug Schedule', 'Items Sold', 'Revenue'];
  const rows = Object.entries(scheduleGroups).map(([schedule, data]) => [
    escapeCsvField(schedule),
    escapeCsvField(data.items),
    escapeCsvField(amt(Math.round(data.revenue * 100) / 100)),
  ]);

  return [`Schedule-wise Sales Report (Date: ${fromStr || 'All'} to ${toStr || 'All'})`, '', headers.join(','), ...rows.map(r => r.join(',')), '', `Total Revenue: ${amt(Math.round(totalRevenueAll * 100) / 100)}`].join('\n');
}

// ==================== GET HANDLER ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';

    let csv: string;
    let filename: string;

    const dateFromStr = searchParams.get('from') || '';
    const dateToStr = searchParams.get('to') || '';

    switch (type) {
      case 'sales': {
        if (!dateFromStr || !dateToStr) {
          return NextResponse.json(
            { error: 'Missing required parameters: from and to dates are required' },
            { status: 400 }
          );
        }
        const from = new Date(dateFromStr);
        const to = new Date(dateToStr);
        to.setHours(23, 59, 59, 999);
        csv = await generateSalesCsv(from, to);
        filename = `sales_${dateFromStr}_to_${dateToStr}.csv`;
        break;
      }

      case 'purchases': {
        if (!dateFromStr || !dateToStr) {
          return NextResponse.json(
            { error: 'Missing required parameters: from and to dates are required' },
            { status: 400 }
          );
        }
        const from = new Date(dateFromStr);
        const to = new Date(dateToStr);
        to.setHours(23, 59, 59, 999);
        csv = await generatePurchasesCsv(from, to);
        filename = `purchases_${dateFromStr}_to_${dateToStr}.csv`;
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

      case 'gst': {
        csv = await generateGstCsv(dateFromStr, dateToStr);
        filename = `gst_report_${dateFromStr || 'all'}_to_${dateToStr || 'all'}.csv`;
        break;
      }

      case 'expiry': {
        csv = await generateExpiryCsv();
        filename = 'expiry_report.csv';
        break;
      }

      case 'profit': {
        csv = await generateProfitCsv(dateFromStr, dateToStr);
        filename = `profit_report_${dateFromStr || 'all'}_to_${dateToStr || 'all'}.csv`;
        break;
      }

      case 'schedule-inventory': {
        csv = await generateScheduleInventoryCsv();
        filename = 'schedule_inventory_report.csv';
        break;
      }

      case 'schedule-sales': {
        csv = await generateScheduleSalesCsv(dateFromStr, dateToStr);
        filename = `schedule_sales_report_${dateFromStr || 'all'}_to_${dateToStr || 'all'}.csv`;
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid type. Supported types: sales, purchases, medicines, customers, stock, gst, expiry, profit, schedule-inventory, schedule-sales' },
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
