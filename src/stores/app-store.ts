import { create } from 'zustand';

export type PageKey =
  | 'dashboard'
  | 'pos-billing'
  | 'medicines'
  | 'inventory'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'returns'
  | 'reports'
  | 'settings'
  | 'backup';

export interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
}

interface AppState {
  currentPage: PageKey;
  sidebarCollapsed: boolean;
  setCurrentPage: (page: PageKey) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
}));
