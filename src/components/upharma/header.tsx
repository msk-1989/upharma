'use client';

import React, { useState, useEffect } from 'react';
import { Bell, LogOut, Menu, Keyboard } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

const shortcuts = [
  { keys: 'CTRL + K', action: 'Search anything' },
  { keys: 'CTRL + N', action: 'New bill' },
  { keys: 'F1', action: 'Product search' },
  { keys: 'F2', action: 'Customer search' },
  { keys: 'F3', action: 'Hold bill' },
  { keys: 'F8', action: 'Complete sale' },
  { keys: 'ESC', action: 'Cancel / Go back' },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[60px] h-7 px-2 text-xs font-mono font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
          title="Keyboard shortcuts"
        >
          <Keyboard className="w-[18px] h-[18px] text-gray-500" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-600" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts for faster navigation and actions.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">{shortcut.action}</span>
              <Kbd>{shortcut.keys}</Kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center mt-1">
          Press <Kbd>?</Kbd> anywhere to open this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function Header({ user, onLogout }: { user: { name: string; role: string; username: string }; onLogout: () => void }) {
  const { currentPage, toggleSidebarOpen } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Global keyboard shortcut: ? to open shortcuts dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger when typing in inputs
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pageTitle = pageLabels[currentPage] || 'Dashboard';

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
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
        <div className="text-right hidden lg:block leading-tight">
          <p className="text-sm font-medium text-gray-700 tabular-nums">{formatTime(currentTime)}</p>
          <p className="text-[11px] text-gray-400">{formatDate(currentTime)}</p>
        </div>

        {/* Keyboard Shortcuts Button */}
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogTrigger asChild>
            <button
              className="relative flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 transition-colors"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="w-[18px] h-[18px] text-gray-500" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-emerald-600" />
                Keyboard Shortcuts
              </DialogTitle>
              <DialogDescription>
                Use these shortcuts for faster navigation and actions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 mt-2">
              {shortcuts.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm text-gray-700">{shortcut.action}</span>
                  <Kbd>{shortcut.keys}</Kbd>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">
              Press <Kbd>?</Kbd> anywhere to toggle this dialog
            </p>
          </DialogContent>
        </Dialog>

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
