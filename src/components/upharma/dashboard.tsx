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
  BarChart3,
  UserPlus,
  Search,
  CalendarCheck,
  Truck,
  ChevronRight,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore, type PageKey } from '@/stores/app-store';

interface DashboardData {
  totalSales: number;
  todaySales: number;
  todayBills: number;
  monthSales: number;
  monthBills: number;
  avgBillAmount: number;
  totalItems: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
  lowStockList: { id: string; name: string; totalStock: number; reorderLevel: number }[];
  expiryAlerts: number;
  expiryList: { id: string; batchNo: string; expiryDate: string; stockQty: number }[];
  creditCustomers: number;
  creditCustomerList: { id: string; name: string; balance: number }[];
  recentSales: { id: string; invoiceNo: string; grandTotal: number; status: string; date: string; customer?: { name: string } | null; user?: { name: string } | null }[];
  topSellingMedicines: { name: string; category: string; sales: number; total: number }[];
  inventoryValue: number;
  pendingOrders: number;
}

function StatCard({ label, value, icon: Icon, color, bg, change, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; bg: string; change?: string; sub?: string;
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
        {sub && (
          <p className="text-xs text-gray-400 mt-2">{sub}</p>
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

interface QuickAction {
  label: string;
  icon: React.ElementType;
  bgClass: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  page: PageKey;
  shortcut?: string;
}

const quickActions: QuickAction[] = [
  { label: 'New Bill', icon: ShoppingCart, bgClass: 'bg-emerald-50 hover:bg-emerald-100', iconBg: 'bg-emerald-500', iconColor: 'text-white', textColor: 'text-emerald-800', page: 'pos-billing', shortcut: 'F1' },
  { label: 'Add Purchase', icon: Truck, bgClass: 'bg-blue-50 hover:bg-blue-100', iconBg: 'bg-blue-500', iconColor: 'text-white', textColor: 'text-blue-800', page: 'purchases' },
  { label: 'Add Customer', icon: UserPlus, bgClass: 'bg-purple-50 hover:bg-purple-100', iconBg: 'bg-purple-500', iconColor: 'text-white', textColor: 'text-purple-800', page: 'customers' },
  { label: 'Expiry Check', icon: CalendarClock, bgClass: 'bg-orange-50 hover:bg-orange-100', iconBg: 'bg-orange-500', iconColor: 'text-white', textColor: 'text-orange-800', page: 'inventory' },
  { label: 'Low Stock', icon: ShieldAlert, bgClass: 'bg-red-50 hover:bg-red-100', iconBg: 'bg-red-500', iconColor: 'text-white', textColor: 'text-red-800', page: 'inventory' },
  { label: 'Day Close', icon: CalendarCheck, bgClass: 'bg-teal-50 hover:bg-teal-100', iconBg: 'bg-teal-500', iconColor: 'text-white', textColor: 'text-teal-800', page: 'day-close' },
  { label: 'Reports', icon: BarChart3, bgClass: 'bg-indigo-50 hover:bg-indigo-100', iconBg: 'bg-indigo-500', iconColor: 'text-white', textColor: 'text-indigo-800', page: 'reports' },
  { label: 'Search', icon: Search, bgClass: 'bg-gray-50 hover:bg-gray-100', iconBg: 'bg-gray-500', iconColor: 'text-white', textColor: 'text-gray-800', page: 'medicines', shortcut: '⌘K' },
];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCurrentPage, user } = useAppStore();

  const role = user?.role || 'Cashier';

  // Filter quick actions based on role
  const visibleQuickActions = quickActions.filter(action => {
    const accessMap: Record<string, string[]> = {
      'pos-billing': ['Admin', 'Manager', 'Cashier'],
      'purchases': ['Admin', 'Manager'],
      'customers': ['Admin', 'Manager', 'Cashier'],
      'inventory': ['Admin', 'Manager'],
      'day-close': ['Admin', 'Manager'],
      'reports': ['Admin', 'Manager'],
      'medicines': ['Admin', 'Manager', 'Cashier'],
    };
    return accessMap[action.page]?.includes(role);
  });

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
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => <div key={i} className="h-40 bg-gray-200 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6 text-gray-500">Failed to load dashboard data.</div>;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Speed stats
  const todaySales = data.todaySales || 0;
  const todayBills = data.todayBills || 0;
  const monthSales = data.monthSales || 0;
  const monthBills = data.monthBills || 0;
  const totalItems = data.totalItems || 0;
  const avgBill = data.avgBillAmount || (todayBills > 0 ? Math.round(todaySales / todayBills) : 0);
  const creditCustomers = data.creditCustomers || 0;

  const speedStats = [
    { label: "Today's Sales", value: `₹${todaySales.toLocaleString('en-IN')}`, sub: `${todayBills} bills`, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'This Month', value: `₹${monthSales.toLocaleString('en-IN')}`, sub: `${monthBills} bills`, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Total Items', value: totalItems.toLocaleString('en-IN'), sub: 'in inventory', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { label: 'Avg Bill Value', value: `₹${avgBill.toLocaleString('en-IN')}`, sub: 'per transaction', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your pharmacy operations</p>
      </div>

      {/* Speed Stats Row — large numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {speedStats.map((stat) => (
          <Card key={stat.label} className={`${stat.border} border shadow-sm`}>
            <CardContent className="p-4 sm:p-5 text-center">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className={`text-xl sm:text-3xl font-extrabold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Grid — large prominent buttons */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {visibleQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => setCurrentPage(action.page)}
                className={`flex flex-col items-center gap-2 p-5 sm:p-6 rounded-xl transition-all duration-200 group cursor-pointer border border-transparent hover:shadow-md ${action.bgClass}`}
              >
                <div className={`w-12 h-12 rounded-full ${action.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${action.iconColor}`} />
                </div>
                <span className={`font-medium text-sm ${action.textColor}`}>{action.label}</span>
                {action.shortcut && (
                  <kbd className="text-[10px] bg-white/60 px-2 py-0.5 rounded border border-gray-200 text-gray-500 font-mono">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Visual Feedback Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Expiry Alerts — Red */}
        <Card
          className="border-2 border-red-300 bg-red-50/30 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setCurrentPage('inventory')}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                <CalendarClock className="w-4 h-4" /> Expiry Alerts
              </CardTitle>
              <Badge variant="secondary" className="bg-red-200 text-red-800 text-xs font-bold">{data.expiryAlerts}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-red-600">Medicines expiring within 3 months</p>
            {data.expiryList.length > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-700 font-medium">
                <span>View details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock — Orange */}
        <Card
          className="border-2 border-orange-300 bg-orange-50/30 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setCurrentPage('inventory')}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Low Stock
              </CardTitle>
              <Badge variant="secondary" className="bg-orange-200 text-orange-800 text-xs font-bold">{data.lowStockItems}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-orange-600">Items below reorder level</p>
            {data.lowStockList.length > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-orange-700 font-medium">
                <span>View details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Credit Customers — Yellow */}
        <Card
          className="border-2 border-yellow-300 bg-yellow-50/30 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setCurrentPage('customers')}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
                <Wallet className="w-4 h-4" /> Credit Balance
              </CardTitle>
              <Badge variant="secondary" className="bg-yellow-200 text-yellow-800 text-xs font-bold">{creditCustomers}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-xs text-yellow-600">Customers with outstanding balance</p>
            {creditCustomers > 0 && (
              <div className="flex items-center gap-1 mt-2 text-xs text-yellow-700 font-medium">
                <span>View details</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Sales — Green */}
        <Card
          className="border-2 border-emerald-300 bg-emerald-50/30 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setCurrentPage('reports')}
        >
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                <IndianRupee className="w-4 h-4" /> Today&apos;s Sales
              </CardTitle>
              <Badge variant="secondary" className="bg-emerald-200 text-emerald-800 text-xs font-bold">{todayBills}</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-lg font-bold text-emerald-700">₹{todaySales.toLocaleString('en-IN')}</p>
            <p className="text-xs text-emerald-600">{todayBills} bills completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={`₹${data.totalSales.toLocaleString('en-IN')}`} icon={IndianRupee} color="text-emerald-600" bg="bg-emerald-50" change="+12.5%" />
        <StatCard label="Total Orders" value={String(data.totalOrders)} icon={ShoppingCart} color="text-blue-600" bg="bg-blue-50" change="+8.2%" />
        <StatCard label="Total Customers" value={String(data.totalCustomers)} icon={Users} color="text-purple-600" bg="bg-purple-50" change="+5.1%" />
        <StatCard label="Inventory Value" value={`₹${data.inventoryValue.toLocaleString('en-IN')}`} icon={Package} color="text-orange-600" bg="bg-orange-50" />
      </div>

      {/* Detailed Alerts */}
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
