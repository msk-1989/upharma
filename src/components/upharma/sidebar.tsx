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
  MonitorCheck,
  Settings,
  Database,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Stethoscope,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type PageKey } from '@/stores/app-store';
import { toast } from '@/hooks/use-toast';
import { Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems: { key: PageKey; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'pos-billing', label: 'POS Billing', icon: ShoppingCart },
  { key: 'sales-bills', label: 'Sales Bills', icon: Receipt },
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
  { key: 'counter-shift', label: 'Counter Shift', icon: MonitorCheck },
  { key: 'day-close', label: 'Day Closing', icon: CalendarCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'backup', label: 'Backup', icon: Database },
];

/** Role-based access control for sidebar navigation items */
const roleAccess: Record<string, string[]> = {
  'dashboard': ['Admin', 'Manager', 'Cashier'],
  'pos-billing': ['Admin', 'Manager', 'Cashier'],
  'sales-bills': ['Admin', 'Manager', 'Cashier'],
  'medicines': ['Admin', 'Manager', 'Cashier'],
  'inventory': ['Admin', 'Manager'],
  'purchases': ['Admin', 'Manager'],
  'purchase-orders': ['Admin', 'Manager'],
  'customers': ['Admin', 'Manager', 'Cashier'],
  'suppliers': ['Admin', 'Manager'],
  'racks': ['Admin', 'Manager'],
  'doctors': ['Admin', 'Manager', 'Cashier'],
  'returns': ['Admin', 'Manager', 'Cashier'],
  'reports': ['Admin', 'Manager'],
  'counter-shift': ['Admin', 'Manager', 'Cashier'],
  'day-close': ['Admin', 'Manager'],
  'settings': ['Admin'],
  'backup': ['Admin'],
};

function SidebarNavItem({ item, isActive, collapsed, onClick, locked }: {
  item: { key: PageKey; label: string; icon: React.ElementType };
  isActive: boolean;
  collapsed: boolean;
  onClick: () => void;
  locked?: boolean;
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
          : locked
          ? 'text-gray-300 cursor-not-allowed'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
      disabled={locked}
    >
      <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-emerald-600', locked && 'text-gray-300')} />
      {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
      {!collapsed && locked && <Lock className="w-3.5 h-3.5 ml-auto text-gray-300" />}
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
  const { currentPage, setCurrentPage, sidebarCollapsed, sidebarOpen, toggleSidebar, setSidebarOpen, user, setSidebarCollapsed, dayStatus, shiftStatus } = useAppStore();

  const role = user?.role || 'Cashier';
  const isShiftExempt = role === 'Admin' || role === 'Super Admin';

  // Filter nav items based on role
  const visibleNavItems = navItems.filter(item =>
    roleAccess[item.key]?.includes(role)
  );

  // Reactive mobile detection using useSyncExternalStore (no effect needed)
  const subscribe = React.useCallback((cb: () => void) => {
    const mq = window.matchMedia('(max-width: 1023px)');
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, []);
  const getSnapshot = React.useCallback(() => window.matchMedia('(max-width: 1023px)').matches, []);
  const getServerSnapshot = React.useCallback(() => false, []);
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Cashiers default to collapsed on desktop for max billing space
  // On mobile, sidebar drawer is always expanded (shows labels).
  const effectiveCollapsed = isMobile ? false : sidebarCollapsed;

  // Auto-collapse for cashiers on initial load
  React.useEffect(() => {
    if (role === 'Cashier' && !isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  }, [role, isMobile, sidebarCollapsed, setSidebarCollapsed]);

  // Pages that are allowed even when day is not open
  const dayExemptPages: PageKey[] = ['day-close', 'counter-shift', 'settings', 'backup'];

  const handleNavClick = (key: PageKey) => {
    // Pages that are always allowed regardless of day/shift status
    const exemptPages: PageKey[] = ['day-close', 'counter-shift', 'settings', 'backup'];

    if (exemptPages.includes(key)) {
      setCurrentPage(key);
      setSidebarOpen(false);
      return;
    }

    // Admin/Owner is never blocked
    if (isShiftExempt) {
      setCurrentPage(key);
      setSidebarOpen(false);
      return;
    }

    // Non-admin: check day open AND shift open
    if (dayStatus !== 'Open') {
      toast({
        title: 'Day Not Open',
        description: 'Please open the day from Day Closing page first.',
        variant: 'destructive',
      });
      return;
    }

    if (shiftStatus !== 'Open') {
      toast({
        title: 'Counter Shift Not Open',
        description: 'Please open a counter shift before performing transactions.',
        variant: 'destructive',
      });
      return;
    }

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
          <img src="/logo.svg" alt="Upharma" className="w-8 h-8 rounded-full flex-shrink-0" />
          {!effectiveCollapsed && (
            <span className="font-semibold text-base text-gray-900 whitespace-nowrap">
              Upharma
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
          <ul className="space-y-0.5 px-2">
            {visibleNavItems.map((item) => {
              const isLocked = !isShiftExempt && !exemptPages.includes(item.key) && (dayStatus !== 'Open' || shiftStatus !== 'Open');
              return (
                <SidebarNavItem
                  key={item.key}
                  item={item}
                  isActive={currentPage === item.key}
                  collapsed={effectiveCollapsed}
                  onClick={() => handleNavClick(item.key)}
                  locked={isLocked}
                />
              );
            })}
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
