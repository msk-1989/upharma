'use client';

import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';

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

export function Header({ user, onLogout }: { user: { name: string; role: string; username: string }; onLogout: () => void }) {
  const { currentPage, toggleSidebarOpen } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const pageTitle = pageLabels[currentPage] || 'Dashboard';

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    }) + ' ' + date.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 sm:px-6 flex-shrink-0">
      {/* Left: Hamburger (mobile) + Logo */}
      <div className="flex items-center gap-3 flex-1 min-w-0 lg:flex-none lg:w-[240px]">
        <button
          onClick={toggleSidebarOpen}
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors lg:hidden shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          <span className="font-semibold text-base text-gray-900 truncate hidden sm:inline">Upharma</span>
        </div>
      </div>

      {/* Center: Breadcrumb */}
      <div className="hidden md:flex flex-1 items-center justify-center">
        <nav className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Upharma Medical Store</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">{pageTitle}</span>
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 lg:flex-none lg:w-[260px] justify-end flex-shrink-0">
        <div className="text-sm text-gray-500 hidden lg:block">{formatDateTime(currentTime)}</div>

        <button className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-[18px] h-[18px] text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">{user.name.charAt(0)}</span>
          </div>
          <div className="hidden xl:block">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
          <button onClick={onLogout} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-red-50 transition-colors" title="Logout">
            <LogOut className="w-4 h-4 text-gray-400 hover:text-red-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
