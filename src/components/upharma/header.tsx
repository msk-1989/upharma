'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Search } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { cn } from '@/lib/utils';

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  'pos-billing': 'POS Billing',
  medicines: 'Medicines',
  inventory: 'Inventory',
  purchases: 'Purchases',
  customers: 'Customers',
  suppliers: 'Suppliers',
  returns: 'Returns',
  reports: 'Reports',
  settings: 'Settings',
  backup: 'Backup',
};

export function Header() {
  const { currentPage, sidebarCollapsed } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pageTitle = pageLabels[currentPage] || 'Dashboard';

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <header
      className={cn(
        'h-16 bg-white border-b border-border flex items-center px-6 flex-shrink-0 transition-all duration-300'
      )}
    >
      {/* Left: Logo + brand */}
      <div className="flex items-center gap-3 w-[260px] flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
          <span className="text-white font-bold text-sm">U</span>
        </div>
        <span className="font-semibold text-base text-gray-900">Upharma</span>
      </div>

      {/* Center: Breadcrumb */}
      <div className="flex-1 flex items-center justify-center">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Upharma Medical Store</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">{pageTitle}</span>
        </nav>
      </div>

      {/* Right: Date, notifications, user */}
      <div className="flex items-center gap-4 w-[260px] justify-end flex-shrink-0">
        {/* Date/Time */}
        <div className="text-sm text-gray-500 hidden lg:block">
          {formatDateTime(currentTime)}
        </div>

        {/* Notification bell */}
        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-[18px] h-[18px] text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">A</span>
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">Administrator Admin</p>
            <p className="text-xs text-gray-500">Super Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
}
