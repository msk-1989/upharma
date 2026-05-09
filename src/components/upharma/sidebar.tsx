'use client';

import React, { useSyncExternalStore } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Package,
  Truck,
  ClipboardList,
  Users,
  FileText,
  RefreshCw,
  BarChart3,
  CalendarCheck,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Stethoscope,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type PageKey } from '@/stores/app-store';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos-billing', label: 'POS Billing', icon: ShoppingCart },
  { key: 'medicines', label: 'Medicines', icon: Pill },
  { key: 'inventory', label: 'Inventory', icon: Package },
  { key: 'purchases', label: 'Purchases', icon: Truck },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'suppliers', label: 'Suppliers', icon: FileText },
  { key: 'racks', label: 'Racks', icon: LayoutGrid },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope },
  { key: 'returns', label: 'Returns', icon: RefreshCw },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
  { key: 'day-close', label: 'Day Closing', icon: CalendarCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'backup', label: 'Backup', icon: Database },
];

function SidebarNavItem({ item, isActive, collapsed, onClick }: {
  item: { key: PageKey; label: string; icon: React.ElementType };
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center h-10 rounded-lg transition-all duration-150 text-sm',
        collapsed ? 'justify-center' : 'gap-3 px-3',
        isActive
          ? 'bg-emerald-50 text-emerald-600 font-medium'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-emerald-600')} />
      {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
    </button>
  );

  if (collapsed) {
    return (
      <li>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </li>
    );
  }

  return <li>{button}</li>;
}

export function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore();

  // Reactive mobile detection using useSyncExternalStore (no effect needed)
  const subscribe = React.useCallback((cb: () => void) => {
    const mq = window.matchMedia('(max-width: 1023px)');
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  const getSnapshot = React.useCallback(() => window.matchMedia('(max-width: 1023px)').matches, []);
  const getServerSnapshot = React.useCallback(() => false, []);
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // On mobile, sidebar drawer is always expanded (shows labels).
  // On desktop, sidebar respects the collapsed state.
  const effectiveCollapsed = isMobile ? false : sidebarCollapsed;

  const handleNavClick = (key: PageKey) => {
    setCurrentPage(key);
    // Close mobile drawer after navigation
    setSidebarOpen(false);
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Mobile backdrop overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'flex flex-col h-screen bg-white border-r border-border transition-all duration-300 ease-in-out z-50',
          // Mobile: fixed drawer, hidden by default, slide in from left
          'fixed inset-y-0 left-0 lg:relative',
          // Mobile: transform to hide/show
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          // Desktop: persistent with collapse toggle
          'lg:z-30',
          // Mobile: always full width; Desktop: respect collapsed state
          'w-[240px]',
          sidebarCollapsed && 'lg:w-[68px]'
        )}
      >
        {/* Logo area */}
        <div
          className={cn(
            'flex items-center gap-3 px-4 h-16 border-b border-border flex-shrink-0',
            effectiveCollapsed && 'justify-center px-2'
          )}
        >
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">U</span>
          </div>
          {!effectiveCollapsed && (
            <span className="font-semibold text-base text-gray-900 whitespace-nowrap">
              Upharma
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-0.5 px-2">
            {navItems.map((item) => (
              <SidebarNavItem
                key={item.key}
                item={item}
                isActive={currentPage === item.key}
                collapsed={effectiveCollapsed}
                onClick={() => handleNavClick(item.key)}
              />
            ))}
          </ul>
        </nav>

        {/* Bottom section */}
        <div
          className={cn(
            'border-t border-border px-4 py-3 flex items-center flex-shrink-0',
            effectiveCollapsed && 'justify-center px-2'
          )}
        >
          {!effectiveCollapsed && (
            <span className="text-xs text-gray-400 whitespace-nowrap mr-auto">
              Upharma v1.0.0
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 flex-shrink-0',
              effectiveCollapsed && 'w-full'
            )}
          >
            {effectiveCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
