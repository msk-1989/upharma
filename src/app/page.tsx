'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore, type PageKey } from '@/stores/app-store';
import { Sidebar } from '@/components/upharma/sidebar';
import { Header } from '@/components/upharma/header';
import { Dashboard } from '@/components/upharma/dashboard';
import { SettingsPage } from '@/components/upharma/settings';
import { MedicinesPage } from '@/components/upharma/medicines';
import { PlaceholderPage } from '@/components/upharma/placeholder-page';
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
      return <PlaceholderPage pageKey="pos-billing" />;
    case 'inventory':
      return <PlaceholderPage pageKey="inventory" />;
    case 'purchases':
      return <PlaceholderPage pageKey="purchases" />;
    case 'customers':
      return <PlaceholderPage pageKey="customers" />;
    case 'suppliers':
      return <PlaceholderPage pageKey="suppliers" />;
    case 'returns':
      return <PlaceholderPage pageKey="returns" />;
    case 'reports':
      return <PlaceholderPage pageKey="reports" />;
    case 'backup':
      return <PlaceholderPage pageKey="backup" />;
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

  const handleLogin = (u: AuthUser) => {
    setUser(u);
    sessionStorage.setItem('upharma_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
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
