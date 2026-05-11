import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [sales, allSales, customers, batches, medicines, recentSales, saleItems] = await Promise.all([
      db.sale.findMany({ where: { date: { gte: today }, status: 'Completed' } }),
      db.sale.findMany({ where: { status: 'Completed' } }),
      db.customer.count(),
      db.medicineBatch.findMany({ where: { active: true } }),
      db.medicine.findMany({ where: { active: true }, include: { batches: { where: { active: true } } } }),
      db.sale.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } }, user: { select: { name: true } } } }),
      db.saleItem.findMany({ include: { medicine: { select: { name: true, category: true } } } }),
    ]);

    const totalSales = allSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const todaySales = sales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalOrders = allSales.length;

    // Low stock: total batch stock < reorder level
    const lowStockItems = medicines
      .map((m) => {
        const totalStock = m.batches.reduce((s, b) => s + b.stockQty, 0);
        return { ...m, totalStock };
      })
      .filter((m) => m.totalStock <= m.reorderLevel);

    // Expiry alerts: batches expiring within 3 months
    const threeMonths = new Date();
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    const expiryAlerts = batches.filter((b) => new Date(b.expiryDate) <= threeMonths && b.stockQty > 0);

    // Top selling medicines
    const medSales: Record<string, { name: string; category: string; sales: number; total: number }> = {};
    for (const item of saleItems) {
      const key = item.medicineId;
      if (!medSales[key]) medSales[key] = { name: item.medicine?.name || item.medicineName || 'Unknown', category: item.medicine?.category || '', sales: 0, total: 0 };
      medSales[key].sales += item.quantity;
      medSales[key].total += item.total;
    }
    const topSellingMedicines = Object.values(medSales).sort((a, b) => b.sales - a.sales).slice(0, 6);

    // Inventory value
    const inventoryValue = batches.reduce((sum, b) => sum + b.stockQty * b.saleRate, 0);

    // Pending orders
    const pendingOrders = await db.sale.count({ where: { status: { in: ['Processing', 'Pending'] } } });

    return NextResponse.json({
      success: true,
      data: {
        totalSales: Math.round(totalSales * 100) / 100,
        todaySales: Math.round(todaySales * 100) / 100,
        totalOrders,
        totalCustomers: customers,
        totalItems: medicines.length,
        totalBatches: batches.length,
        totalUnits: batches.reduce((sum, b) => sum + b.stockQty, 0),
        lowStockItems: lowStockItems.length,
        lowStockList: lowStockItems.slice(0, 10).map((m) => ({ id: m.id, name: m.name, totalStock: m.totalStock, reorderLevel: m.reorderLevel })),
        expiryAlerts: expiryAlerts.length,
        expiryList: expiryAlerts.slice(0, 10).map((b) => ({ id: b.id, batchNo: b.batchNo, expiryDate: b.expiryDate, stockQty: b.stockQty })),
        recentSales,
        topSellingMedicines,
        inventoryValue: Math.round(inventoryValue * 100) / 100,
        pendingOrders,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
