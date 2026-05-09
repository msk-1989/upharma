'use client';

import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { Sidebar } from '@/components/upharma/sidebar';
import { Header } from '@/components/upharma/header';
import { Dashboard } from '@/components/upharma/dashboard';
import { SettingsPage } from '@/components/upharma/settings';
import { PlaceholderPage } from '@/components/upharma/placeholder-page';

function PageContent() {
  const { currentPage } = useAppStore();

  switch (currentPage) {
    case 'dashboard':
      return <Dashboard />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <PlaceholderPage pageKey={currentPage} />;
  }
}

export default function Home() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <PageContent />
        </main>
      </div>
    </div>
  );
}
