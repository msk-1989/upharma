'use client';

import React from 'react';
import {
  IndianRupee,
  ShoppingCart,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Pill,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const statsCards = [
  {
    label: 'Total Sales',
    value: '₹1,24,500',
    change: '+12.5%',
    trend: 'up' as const,
    icon: IndianRupee,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    label: 'Total Orders',
    value: '342',
    change: '+8.2%',
    trend: 'up' as const,
    icon: ShoppingCart,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    label: 'Total Customers',
    value: '128',
    change: '+5.1%',
    trend: 'up' as const,
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  {
    label: 'Low Stock Items',
    value: '15',
    change: '-3.0%',
    trend: 'down' as const,
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
];

const recentOrders = [
  { id: 'ORD-001', customer: 'Dr. Rajesh Mehta', items: 5, total: '₹2,450', status: 'Completed', date: '2025-01-22' },
  { id: 'ORD-002', customer: 'Sneha Patil', items: 3, total: '₹1,200', status: 'Processing', date: '2025-01-22' },
  { id: 'ORD-003', customer: 'Amit Joshi', items: 8, total: '₹3,890', status: 'Completed', date: '2025-01-21' },
  { id: 'ORD-004', customer: 'Kavita Sharma', items: 2, total: '₹680', status: 'Pending', date: '2025-01-21' },
  { id: 'ORD-005', customer: 'Vikram Singh', items: 6, total: '₹4,100', status: 'Completed', date: '2025-01-20' },
  { id: 'ORD-006', customer: 'Priya Desai', items: 4, total: '₹2,780', status: 'Processing', date: '2025-01-20' },
];

const topMedicines = [
  { name: 'Paracetamol 500mg', sales: 245, category: 'Analgesic', stock: 320 },
  { name: 'Amoxicillin 250mg', sales: 198, category: 'Antibiotic', stock: 85 },
  { name: 'Omeprazole 20mg', sales: 176, category: 'Antacid', stock: 210 },
  { name: 'Cetirizine 10mg', sales: 154, category: 'Antihistamine', stock: 15 },
  { name: 'Metformin 500mg', sales: 142, category: 'Antidiabetic', stock: 190 },
  { name: 'Azithromycin 500mg', sales: 128, category: 'Antibiotic', stock: 45 },
];

const statusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Pending: 'bg-gray-100 text-gray-700',
};

export function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your pharmacy operations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
                  )}
                  <span className={`text-xs font-medium ${stat.trend === 'up' ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {stat.change}
                  </span>
                  <span className="text-xs text-gray-400 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Orders</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">Latest transactions from your pharmacy</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Order ID</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Items</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Total</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 pr-4 text-sm font-medium text-emerald-600">{order.id}</td>
                    <td className="py-3 pr-4 text-sm text-gray-700">{order.customer}</td>
                    <td className="py-3 pr-4 text-sm text-gray-600">{order.items}</td>
                    <td className="py-3 pr-4 text-sm font-medium text-gray-900">{order.total}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary" className={`text-xs font-medium ${statusColors[order.status]}`}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 text-sm text-gray-500">{order.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Selling Medicines */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">Top Selling Medicines</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">Best performing products this month</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs gap-1.5 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topMedicines.map((med) => (
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
                  <p className={`text-xs ${med.stock < 50 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {med.stock} left
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today&apos;s Sales</p>
                <p className="text-lg font-bold text-gray-900">₹18,750</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-lg font-bold text-gray-900">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expired Medicines</p>
                <p className="text-lg font-bold text-gray-900">3</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
