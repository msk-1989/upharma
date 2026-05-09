'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, type PageKey } from '@/stores/app-store';
import { Sidebar } from '@/components/upharma/sidebar';
import { Header } from '@/components/upharma/header';
import { Dashboard } from '@/components/upharma/dashboard';
import { SettingsPage } from '@/components/upharma/settings';
import { MedicinesPage } from '@/components/upharma/medicines';
import { POSBillingPage } from '@/components/upharma/pos-billing';
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

  const { setUser: setStoreUser } = useAppStore();

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
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto">
          <PageContent />
        </main>
      </div>
    </div>
  );
}
