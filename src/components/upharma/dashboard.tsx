'use client';

import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Pill,
  Clock,
  Package,
  CalendarClock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/app-store';

interface DashboardData {
  totalSales: number;
  todaySales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  lowStockList: { id: string; name: string; totalStock: number; reorderLevel: number }[];
  expiryAlerts: number;
  expiryList: { id: string; batchNo: string; expiryDate: string; stockQty: number }[];
  recentSales: { id: string; invoiceNo: string; grandTotal: number; status: string; date: string; customer?: { name: string } | null; user?: { name: string } | null }[];
  topSellingMedicines: { name: string; category: string; sales: number; total: number }[];
  inventoryValue: number;
  pendingOrders: number;
}

function StatCard({ label, value, icon: Icon, color, bg, change }: {
  label: string; value: string; icon: React.ElementType; color: string; bg: string; change?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {change && (
          <div className="flex items-center gap-1 mt-3">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-medium text-emerald-600">{change}</span>
            <span className="text-xs text-gray-400 ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const statusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Pending: 'bg-gray-100 text-gray-700',
  Returned: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-200 text-gray-600',
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCurrentPage } = useAppStore();

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-gray-500">Failed to load dashboard data.</div>;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your pharmacy operations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${data.totalSales.toLocaleString('en-IN')}`} icon={IndianRupee} color="text-emerald-600" bg="bg-emerald-50" change="+12.5%" />
        <StatCard label="Total Orders" value={String(data.totalOrders)} icon={ShoppingCart} color="text-blue-600" bg="bg-blue-50" change="+8.2%" />
        <StatCard label="Total Customers" value={String(data.totalCustomers)} icon={Users} color="text-purple-600" bg="bg-purple-50" change="+5.1%" />
        <StatCard label="Inventory Value" value={`₹${data.inventoryValue.toLocaleString('en-IN')}`} icon={Package} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'New Billing', icon: ShoppingCart, color: 'emerald', page: 'pos-billing' as const },
          { label: 'Add Purchase', icon: Package, color: 'blue', page: 'purchases' as const },
          { label: 'View Reports', icon: TrendingUp, color: 'purple', page: 'reports' as const },
          { label: 'Expiry Check', icon: CalendarClock, color: 'orange', page: 'inventory' as const },
        ].map((action) => (
          <Button key={action.label} variant="outline" onClick={() => setCurrentPage(action.page)}
            className={`h-auto py-4 flex-col gap-2 border-border/60 hover:border-${action.color}-300 hover:bg-${action.color}-50/30`}>
            <action.icon className={`w-5 h-5 text-${action.color}-600`} />
            <span className="text-xs font-medium">{action.label}</span>
          </Button>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Low Stock Items
              </CardTitle>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs">{data.lowStockItems}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.lowStockList.length === 0 ? (
              <p className="text-sm text-gray-500">All items sufficiently stocked</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {data.lowStockList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-orange-900">{item.name}</span>
                    <span className="text-orange-600 font-medium">{item.totalStock} units</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Expiry Alerts
              </CardTitle>
              <Badge variant="secondary" className="bg-red-200 text-red-800 text-xs">{data.expiryAlerts}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {data.expiryList.length === 0 ? (
              <p className="text-sm text-gray-500">No medicines expiring soon</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {data.expiryList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-red-900">{item.batchNo}</span>
                    <span className="text-red-600 font-medium">{formatDate(item.expiryDate)} ({item.stockQty})</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Sales */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Orders</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">Latest transactions</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => setCurrentPage('reports')}>
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Invoice</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Total</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.map((sale) => (
                  <tr key={sale.id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50">
                    <td className="py-3 pr-4 text-sm font-medium text-emerald-600">{sale.invoiceNo}</td>
                    <td className="py-3 pr-4 text-sm text-gray-700">{sale.customer?.name || 'Walk-in'}</td>
                    <td className="py-3 pr-4 text-sm font-medium text-gray-900">₹{sale.grandTotal.toLocaleString('en-IN')}</td>
                    <td className="py-3 pr-4"><Badge variant="secondary" className={`text-xs ${statusColors[sale.status] || ''}`}>{sale.status}</Badge></td>
                    <td className="py-3 text-sm text-gray-500">{formatDate(sale.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Medicines */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">Top Selling Medicines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.topSellingMedicines.map((med) => (
              <div key={med.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{med.name}</p>
                  <p className="text-xs text-gray-500">{med.category}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900">{med.sales}</p>
                  <p className="text-xs text-gray-400">₹{med.total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
