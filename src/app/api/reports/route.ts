import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/reports?type=sales|purchases|gst|stock|expiry|profit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const dateFilter: Record<string, unknown> = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    switch (type) {
      case 'sales':
        return await getSalesReport(dateFilter);
      case 'purchases':
        return await getPurchasesReport(dateFilter);
      case 'gst':
        return await getGstReport(dateFilter);
      case 'stock':
        return await getStockReport();
      case 'expiry':
        return await getExpiryReport();
      case 'profit':
        return await getProfitReport(dateFilter);
      default:
        return NextResponse.json({ success: false, error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Sales Report
async function getSalesReport(dateFilter: Record<string, unknown>) {
  const sales = await db.sale.findMany({
    where: { status: 'Completed', ...(dateFilter && Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    orderBy: { date: 'desc' },
    include: {
      customer: { select: { name: true } },
      items: true,
    },
  });

  const summary = {
    totalSales: sales.length,
    totalRevenue: sales.reduce((sum, s) => sum + s.grandTotal, 0),
    totalSubtotal: sales.reduce((sum, s) => sum + s.subtotal, 0),
    totalGst: sales.reduce((sum, s) => sum + s.totalGst, 0),
    totalDiscount: sales.reduce((sum, s) => sum + s.totalDiscount, 0),
    totalPaid: sales.reduce((sum, s) => sum + s.paidAmount, 0),
    totalDue: sales.reduce((sum, s) => sum + s.balanceDue, 0),
    avgSaleValue: sales.length > 0 ? sales.reduce((sum, s) => sum + s.grandTotal, 0) / sales.length : 0,
  };

  // Payment mode breakdown
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  for (const s of sales) {
    const mode = s.paymentMode;
    if (!paymentBreakdown[mode]) paymentBreakdown[mode] = { count: 0, total: 0 };
    paymentBreakdown[mode].count++;
    paymentBreakdown[mode].total += s.grandTotal;
  }

  return NextResponse.json({
    success: true,
    data: {
      sales,
      summary: {
        ...summary,
        totalRevenue: Math.round(summary.totalRevenue * 100) / 100,
        totalSubtotal: Math.round(summary.totalSubtotal * 100) / 100,
        totalGst: Math.round(summary.totalGst * 100) / 100,
        totalDiscount: Math.round(summary.totalDiscount * 100) / 100,
        totalPaid: Math.round(summary.totalPaid * 100) / 100,
        totalDue: Math.round(summary.totalDue * 100) / 100,
        avgSaleValue: Math.round(summary.avgSaleValue * 100) / 100,
      },
      paymentBreakdown,
    },
  });
}

// Purchases Report
async function getPurchasesReport(dateFilter: Record<string, unknown>) {
  const purchases = await db.purchase.findMany({
    where: { ...(dateFilter && Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    orderBy: { date: 'desc' },
    include: {
      supplier: { select: { name: true } },
      items: true,
    },
  });

  const summary = {
    totalPurchases: purchases.length,
    totalCost: purchases.reduce((sum, p) => sum + p.grandTotal, 0),
    totalGst: purchases.reduce((sum, p) => sum + p.totalGst, 0),
    totalPaid: purchases.reduce((sum, p) => sum + p.paidAmount, 0),
    totalDue: purchases.reduce((sum, p) => sum + p.balanceDue, 0),
  };

  return NextResponse.json({
    success: true,
    data: {
      purchases,
      summary: {
        ...summary,
        totalCost: Math.round(summary.totalCost * 100) / 100,
        totalGst: Math.round(summary.totalGst * 100) / 100,
        totalPaid: Math.round(summary.totalPaid * 100) / 100,
        totalDue: Math.round(summary.totalDue * 100) / 100,
      },
    },
  });
}

// GST Report
async function getGstReport(dateFilter: Record<string, unknown>) {
  const sales = await db.sale.findMany({
    where: { status: 'Completed', ...(dateFilter && Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: true },
  });

  const purchases = await db.purchase.findMany({
    where: { ...(dateFilter && Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: true },
  });

  // Sales GST summary
  const salesGst = {
    totalTaxable: sales.reduce((sum, s) => sum + s.subtotal, 0),
    totalCgst: sales.reduce((sum, s) => sum + s.cgst, 0),
    totalSgst: sales.reduce((sum, s) => sum + s.sgst, 0),
    totalIgst: sales.reduce((sum, s) => sum + s.igst, 0),
    totalGst: sales.reduce((sum, s) => sum + s.totalGst, 0),
  };

  // Purchase GST summary (input tax credit)
  const purchaseGst = {
    totalTaxable: purchases.reduce((sum, p) => sum + p.subtotal, 0),
    totalCgst: purchases.reduce((sum, p) => sum + p.cgst, 0),
    totalSgst: purchases.reduce((sum, p) => sum + p.sgst, 0),
    totalIgst: purchases.reduce((sum, p) => sum + p.igst, 0),
    totalGst: purchases.reduce((sum, p) => sum + p.totalGst, 0),
  };

  // GST by rate
  const gstByRate: Record<number, { taxable: number; cgst: number; sgst: number; totalGst: number }> = {};
  for (const item of sales.flatMap((s) => s.items)) {
    const rate = item.gstPercent;
    if (!gstByRate[rate]) gstByRate[rate] = { taxable: 0, cgst: 0, sgst: 0, totalGst: 0 };
    const taxable = item.total / (1 + item.gstPercent / 100) * (100 / 100);
    gstByRate[rate].taxable += item.total - item.cgst - item.sgst;
    gstByRate[rate].cgst += item.cgst;
    gstByRate[rate].sgst += item.sgst;
    gstByRate[rate].totalGst += item.cgst + item.sgst;
  }

  const netGstPayable = salesGst.totalGst - purchaseGst.totalGst;

  return NextResponse.json({
    success: true,
    data: {
      salesGst: {
        ...salesGst,
        totalTaxable: Math.round(salesGst.totalTaxable * 100) / 100,
        totalCgst: Math.round(salesGst.totalCgst * 100) / 100,
        totalSgst: Math.round(salesGst.totalSgst * 100) / 100,
        totalIgst: Math.round(salesGst.totalIgst * 100) / 100,
        totalGst: Math.round(salesGst.totalGst * 100) / 100,
      },
      purchaseGst: {
        ...purchaseGst,
        totalTaxable: Math.round(purchaseGst.totalTaxable * 100) / 100,
        totalCgst: Math.round(purchaseGst.totalCgst * 100) / 100,
        totalSgst: Math.round(purchaseGst.totalSgst * 100) / 100,
        totalIgst: Math.round(purchaseGst.totalIgst * 100) / 100,
        totalGst: Math.round(purchaseGst.totalGst * 100) / 100,
      },
      gstByRate: Object.entries(gstByRate).map(([rate, data]) => ({
        rate: Number(rate),
        ...data,
        taxable: Math.round(data.taxable * 100) / 100,
        cgst: Math.round(data.cgst * 100) / 100,
        sgst: Math.round(data.sgst * 100) / 100,
        totalGst: Math.round(data.totalGst * 100) / 100,
      })),
      netGstPayable: Math.round(netGstPayable * 100) / 100,
    },
  });
}

// Stock Valuation Report
async function getStockReport() {
  const batches = await db.medicineBatch.findMany({
    where: { active: true },
    include: {
      medicine: {
        select: {
          name: true,
          genericName: true,
          category: true,
          hsnCode: true,
          gstPercent: true,
          baseUnit: true,
          unitsPerStrip: true,
          stripsPerBox: true,
        },
      },
      supplier: {
        select: { name: true },
      },
    },
    orderBy: { medicineId: 'asc' },
  });

  const stockItems = batches.map((b) => ({
    id: b.id,
    medicineName: b.medicine.name,
    genericName: b.medicine.genericName,
    category: b.medicine.category,
    batchNo: b.batchNo,
    expiryDate: b.expiryDate,
    stockQty: b.stockQty,
    purchaseRate: b.purchaseRate,
    saleRate: b.saleRate,
    mrp: b.mrp,
    stockValue: Math.round(b.stockQty * b.purchaseRate * 100) / 100,
    saleValue: Math.round(b.stockQty * b.saleRate * 100) / 100,
    supplier: b.supplier?.name || 'N/A',
  }));

  const summary = {
    totalItems: stockItems.length,
    totalUnits: stockItems.reduce((sum, i) => sum + i.stockQty, 0),
    totalCostValue: stockItems.reduce((sum, i) => sum + i.stockValue, 0),
    totalSaleValue: stockItems.reduce((sum, i) => sum + i.saleValue, 0),
    potentialProfit: stockItems.reduce((sum, i) => sum + i.saleValue - i.stockValue, 0),
  };

  return NextResponse.json({
    success: true,
    data: {
      items: stockItems,
      summary: {
        ...summary,
        totalCostValue: Math.round(summary.totalCostValue * 100) / 100,
        totalSaleValue: Math.round(summary.totalSaleValue * 100) / 100,
        potentialProfit: Math.round(summary.potentialProfit * 100) / 100,
      },
    },
  });
}

// Expiry Report
async function getExpiryReport() {
  const now = new Date();

  const threeMonths = new Date();
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  const sixMonths = new Date();
  sixMonths.setMonth(sixMonths.getMonth() + 6);

  const twelveMonths = new Date();
  twelveMonths.setMonth(twelveMonths.getMonth() + 12);

  const batches = await db.medicineBatch.findMany({
    where: { active: true, stockQty: { gt: 0 } },
    include: {
      medicine: {
        select: {
          name: true,
          genericName: true,
          category: true,
          purchaseRate: true,
          saleRate: true,
        },
      },
      supplier: {
        select: { name: true },
      },
    },
    orderBy: { expiryDate: 'asc' },
  });

  const items = batches.map((b) => {
    const daysToExpiry = Math.ceil((b.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    let status = 'valid';
    if (daysToExpiry <= 0) status = 'expired';
    else if (daysToExpiry <= 90) status = 'critical';
    else if (daysToExpiry <= 180) status = 'warning';

    return {
      id: b.id,
      medicineName: b.medicine.name,
      genericName: b.medicine.genericName,
      category: b.medicine.category,
      batchNo: b.batchNo,
      expiryDate: b.expiryDate,
      stockQty: b.stockQty,
      purchaseRate: b.purchaseRate,
      saleValue: Math.round(b.stockQty * b.saleRate * 100) / 100,
      costValue: Math.round(b.stockQty * b.purchaseRate * 100) / 100,
      supplier: b.supplier?.name || 'N/A',
      daysToExpiry,
      status,
    };
  });

  const expired = items.filter((i) => i.status === 'expired');
  const critical = items.filter((i) => i.status === 'critical');
  const warning = items.filter((i) => i.status === 'warning');

  return NextResponse.json({
    success: true,
    data: {
      items,
      summary: {
        total: items.length,
        expired: expired.length,
        expiredValue: expired.reduce((sum, i) => sum + i.costValue, 0),
        critical: critical.length,
        criticalValue: critical.reduce((sum, i) => sum + i.costValue, 0),
        warning: warning.length,
        warningValue: warning.reduce((sum, i) => sum + i.costValue, 0),
      },
    },
  });
}

// Profit & Loss Report
async function getProfitReport(dateFilter: Record<string, unknown>) {
  const sales = await db.sale.findMany({
    where: { status: 'Completed', ...(dateFilter && Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: true },
  });

  const purchases = await db.purchase.findMany({
    where: { status: 'Completed', ...(dateFilter && Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}) },
    include: { items: true },
  });

  // Revenue from sales
  const totalRevenue = sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalSaleGst = sales.reduce((sum, s) => sum + s.totalGst, 0);
  const totalDiscount = sales.reduce((sum, s) => sum + s.totalDiscount, 0);
  const netRevenue = totalRevenue - totalSaleGst + totalDiscount; // Revenue excluding GST

  // Cost of goods sold (from sale items, using batch purchase rate)
  const saleItems = sales.flatMap((s) => s.items);
  let cogs = 0;
  for (const item of saleItems) {
    // Use the sale's proportional cost (approximate: use medicine's purchase rate)
    const medicine = await db.medicine.findUnique({
      where: { id: item.medicineId },
      select: { purchaseRate: true },
    });
    if (medicine) {
      cogs += item.quantity * medicine.purchaseRate;
    }
  }

  // Total purchase cost
  const totalPurchaseCost = purchases.reduce((sum, p) => sum + p.grandTotal, 0);
  const totalPurchaseGst = purchases.reduce((sum, p) => sum + p.totalGst, 0);

  const grossProfit = netRevenue - cogs;
  const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  // Stock movement costs
  const stockMovements = await db.stockMovement.findMany({
    where: dateFilter && Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter as { gte?: Date; lte?: Date } }
      : {},
  });

  const totalStockIn = stockMovements
    .filter((m) => m.type === 'IN')
    .reduce((sum, m) => sum + m.quantity, 0);

  const totalStockOut = stockMovements
    .filter((m) => m.type === 'OUT')
    .reduce((sum, m) => sum + m.quantity, 0);

  return NextResponse.json({
    success: true,
    data: {
      revenue: {
        totalSales: sales.length,
        grossRevenue: Math.round(totalRevenue * 100) / 100,
        totalGst: Math.round(totalSaleGst * 100) / 100,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        netRevenue: Math.round(netRevenue * 100) / 100,
      },
      costOfGoods: {
        cogs: Math.round(cogs * 100) / 100,
        totalPurchases: purchases.length,
        totalPurchaseCost: Math.round(totalPurchaseCost * 100) / 100,
        totalPurchaseGst: Math.round(totalPurchaseGst * 100) / 100,
        netPurchaseCost: Math.round((totalPurchaseCost - totalPurchaseGst) * 100) / 100,
      },
      profit: {
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMargin: Math.round(grossMargin * 100) / 100,
      },
      stockSummary: {
        totalStockIn,
        totalStockOut,
      },
      salesVsPurchases: {
        salesCount: sales.length,
        purchaseCount: purchases.length,
      },
    },
  });
}
