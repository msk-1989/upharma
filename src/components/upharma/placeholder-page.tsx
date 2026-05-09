'use client';

import React from 'react';
import {
  ShoppingCart,
  Pill,
  Package,
  Truck,
  Users,
  FileText,
  RefreshCw,
  BarChart3,
  Database,
  Construction,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore, type PageKey } from '@/stores/app-store';

const pageConfig: Record<string, {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
  features: string[];
}> = {
  'pos-billing': {
    title: 'POS Billing',
    subtitle: 'Point of Sale billing system',
    icon: ShoppingCart,
    description: 'Process sales transactions, generate invoices, and manage payments at the counter with our intuitive point-of-sale billing interface.',
    features: ['Quick billing with barcode scanning', 'Multiple payment methods support', 'Automatic GST calculation', 'Discount & offer management', 'Receipt printing & email'],
  },
  medicines: {
    title: 'Medicines',
    subtitle: 'Medicine catalog management',
    icon: Pill,
    description: 'Manage your complete medicine inventory with detailed information including dosage forms, manufacturers, expiry dates, and pricing.',
    features: ['Add & edit medicine details', 'Batch & expiry tracking', 'Category management', 'Manufacturer database', 'Price & discount settings'],
  },
  inventory: {
    title: 'Inventory',
    subtitle: 'Stock management & tracking',
    icon: Package,
    description: 'Track stock levels, manage warehouse inventory, set reorder points, and get alerts for low stock and expiring medicines.',
    features: ['Real-time stock tracking', 'Low stock alerts', 'Batch-wise inventory', 'Stock transfer management', 'Inventory valuation reports'],
  },
  purchases: {
    title: 'Purchases',
    subtitle: 'Purchase order management',
    icon: Truck,
    description: 'Create and manage purchase orders, track supplier deliveries, and maintain a complete purchase history for your pharmacy.',
    features: ['Purchase order creation', 'Supplier quotation comparison', 'Goods received notes', 'Purchase return management', 'Auto-stock update on delivery'],
  },
  customers: {
    title: 'Customers',
    subtitle: 'Customer relationship management',
    icon: Users,
    description: 'Maintain a comprehensive customer database with purchase history, prescriptions, loyalty points, and contact information.',
    features: ['Customer database with history', 'Prescription management', 'Loyalty points tracking', 'SMS & email notifications', 'Customer analytics'],
  },
  suppliers: {
    title: 'Suppliers',
    subtitle: 'Supplier & vendor management',
    icon: FileText,
    description: 'Manage your supplier network, track purchase orders, evaluate supplier performance, and maintain communication records.',
    features: ['Supplier directory', 'Performance tracking', 'Payment terms management', 'Order history', 'Contact directory'],
  },
  returns: {
    title: 'Returns',
    subtitle: 'Return & refund management',
    icon: RefreshCw,
    description: 'Process customer returns, manage refunds, track return reasons, and handle exchange requests with full audit trails.',
    features: ['Sales return processing', 'Purchase return management', 'Refund tracking', 'Exchange handling', 'Return reason analytics'],
  },
  reports: {
    title: 'Reports',
    subtitle: 'Analytics & business insights',
    icon: BarChart3,
    description: 'Access comprehensive reports and analytics including sales trends, inventory summaries, GST reports, and business performance dashboards.',
    features: ['Sales & revenue reports', 'Inventory reports', 'GST compliance reports', 'Customer analytics', 'Profit & loss statements'],
  },
  backup: {
    title: 'Backup',
    subtitle: 'Data backup & recovery',
    icon: Database,
    description: 'Schedule automatic backups, create manual backup snapshots, and restore your pharmacy data whenever needed for business continuity.',
    features: ['Automated backup scheduling', 'One-click manual backup', 'Data restoration tools', 'Backup history log', 'Cloud storage support'],
  },
};

export function PlaceholderPage({ pageKey }: { pageKey: PageKey }) {
  const config = pageConfig[pageKey];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          {config.title}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{config.subtitle}</p>
      </div>

      {/* Main Content */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-6">
              <Icon className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{config.title} Module</h2>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">{config.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-8">
              {config.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-white">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-emerald-600">{index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200">
              <Construction className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Coming Soon</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
