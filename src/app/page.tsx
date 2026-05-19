'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore, type PageKey } from '@/stores/app-store';
import { Sidebar } from '@/components/upharma/sidebar';
import { Header } from '@/components/upharma/header';
import { Dashboard } from '@/components/upharma/dashboard';
import { SettingsPage } from '@/components/upharma/settings';
import { MedicinesPage } from '@/components/upharma/medicines';
import { POSBillingPage } from '@/components/upharma/pos-billing';
import { SalesHistoryPage } from '@/components/upharma/sales-history';
import { InventoryPage } from '@/components/upharma/inventory';
import { PurchasesPage } from '@/components/upharma/purchases';
import { PurchaseOrdersPage } from '@/components/upharma/purchase-orders';
import { CustomersPage } from '@/components/upharma/customers';
import { SuppliersPage } from '@/components/upharma/suppliers';
import { RacksPage } from '@/components/upharma/racks';
import { DoctorsPage } from '@/components/upharma/doctors';
import { ReturnsPage } from '@/components/upharma/returns';
import { ReportsPage } from '@/components/upharma/reports';
import { DayClosePage } from '@/components/upharma/day-close';
import { BackupPage } from '@/components/upharma/backup';
import { LoginScreen } from '@/components/upharma/login';
import { CommandPalette } from '@/components/upharma/command-palette';
import { toast } from '@/hooks/use-toast';

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

function PageContent() {
  const { currentPage } = useAppStore();

  switch (currentPage) {
    case 'dashboard':
      return <Dashboard />;
    case 'settings':
      return <SettingsPage />;
    case 'medicines':
      return <MedicinesPage />;
    case 'pos-billing':
      return <POSBillingPage />;
    case 'sales-bills':
      return <SalesHistoryPage />;
    case 'inventory':
      return <InventoryPage />;
    case 'purchases':
      return <PurchasesPage />;
    case 'purchase-orders':
      return <PurchaseOrdersPage />;
    case 'customers':
      return <CustomersPage />;
    case 'suppliers':
      return <SuppliersPage />;
    case 'racks':
      return <RacksPage />;
    case 'doctors':
      return <DoctorsPage />;
    case 'returns':
      return <ReturnsPage />;
    case 'reports':
      return <ReportsPage />;
    case 'day-close':
      return <DayClosePage />;
    case 'backup':
      return <BackupPage />;
    default:
      return <Dashboard />;
  }
}

// ==================== KEYBOARD SHORTCUTS HOOK ====================

function useKeyboardShortcuts(isAuthenticated: boolean) {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    toggleCommandPalette,
    setCurrentPage,
    setPosPreSearch,
    setPosSelectCustomer,
    setPosClearCart,
  } = useAppStore();

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isAuthenticated) return;

      const target = e.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Command Palette: CTRL+K — always works (even in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      // ESC — always works (even in input)
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          e.preventDefault();
          setCommandPaletteOpen(false);
          return;
        }
        // Let ESC bubble naturally for other dialogs
        return;
      }

      // For shortcuts below: skip if user is typing in an input
      if (isInputField) return;

      // "/" to open command palette (only when not in input)
      if (e.key === '/' && !commandPaletteOpen) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // CTRL+N — New invoice
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setPosClearCart(true);
        setPosPreSearch(null);
        setPosSelectCustomer(null);
        setCurrentPage('pos-billing');
        return;
      }

      // CTRL+P — Print (placeholder — handled at page level if needed)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        // Don't prevent default — let browser handle print
        // Pages can intercept window.onbeforeprint if needed
        return;
      }

      // F1 — Product search (go to POS with search focused)
      if (e.key === 'F1') {
        e.preventDefault();
        setPosPreSearch('__FOCUS__');
        setCurrentPage('pos-billing');
        return;
      }

      // F2 — Customer search (open palette with "cust " prefix)
      if (e.key === 'F2') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
    },
    [
      isAuthenticated,
      commandPaletteOpen,
      setCommandPaletteOpen,
      toggleCommandPalette,
      setCurrentPage,
      setPosPreSearch,
      setPosSelectCustomer,
      setPosClearCart,
    ]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);
}

// ==================== MAIN PAGE ====================

export default function Home() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already logged in (session-based for this web version)
    const savedUser = sessionStorage.getItem('upharma_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const { setUser: setStoreUser, fetchDayStatus, dayStatus, setCurrentPage } = useAppStore();

  // Register keyboard shortcuts (only when authenticated)
  useKeyboardShortcuts(!!user);

  // Fetch day-open status on login and refresh every 30s
  useEffect(() => {
    if (user) {
      fetchDayStatus();
      const interval = setInterval(fetchDayStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [user, fetchDayStatus]);

  // Redirect to day-close if day not open (after initial load)
  useEffect(() => {
    if (user && dayStatus !== 'Open') {
      // Don't redirect if already on day-close, settings, or backup
      const { currentPage } = useAppStore.getState();
      if (currentPage !== 'day-close' && currentPage !== 'settings' && currentPage !== 'backup') {
        toast({
          title: 'Day Not Open',
          description: dayStatus === null
            ? 'Please open the day to start operations.'
            : 'Yesterday\'s day was closed. Please open today\'s day.',
          variant: 'destructive',
        });
        setCurrentPage('day-close');
      }
    }
  }, [user, dayStatus, setCurrentPage]);

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    setStoreUser(u);
    sessionStorage.setItem('upharma_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    setStoreUser(null);
    sessionStorage.removeItem('upharma_user');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-pulse text-emerald-600 font-semibold text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <PageContent />
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette />
    </div>
  );
}
