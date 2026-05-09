import { create } from 'zustand';

export type PageKey =
  | 'dashboard'
  | 'pos-billing'
  | 'medicines'
  | 'inventory'
  | 'purchases'
  | 'purchase-orders'
  | 'customers'
  | 'suppliers'
  | 'racks'
  | 'doctors'
  | 'returns'
  | 'reports'
  | 'day-close'
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
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  posPreSearch: string | null;        // medicine name to pre-search in POS
  posSelectCustomer: string | null;    // customer ID to pre-select in POS
  posClearCart: boolean;               // flag to clear POS cart on navigate
  user: { id: string; username: string; name: string; role: string } | null;
  setUser: (user: { id: string; username: string; name: string; role: string } | null) => void;
  setCurrentPage: (page: PageKey) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebarOpen: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setPosPreSearch: (query: string | null) => void;
  setPosSelectCustomer: (id: string | null) => void;
  setPosClearCart: (clear: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'dashboard',
  sidebarCollapsed: false,
  sidebarOpen: false,
  commandPaletteOpen: false,
  posPreSearch: null,
  posSelectCustomer: null,
  posClearCart: false,
  user: null,
  setUser: (user) => set({ user }),
  setCurrentPage: (page) => set({ currentPage: page }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebarOpen: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setPosPreSearch: (query) => set({ posPreSearch: query }),
  setPosSelectCustomer: (id) => set({ posSelectCustomer: id }),
  setPosClearCart: (clear) => set({ posClearCart: clear }),
}));
