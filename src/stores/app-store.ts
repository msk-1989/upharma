import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PageKey =
  | 'dashboard'
  | 'pos-billing'
  | 'sales-bills'
  | 'medicines'
  | 'bulk-upload'
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
  | 'counter-shift'
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
  dayStatus: 'Open' | 'Closed' | null; // mandatory day-open tracking
  // Counter shift state
  shiftStatus: 'Open' | 'Closed' | null;
  activeShiftId: string | null;
  activeCounterId: string | null;
  activeCounterName: string | null;
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
  setDayStatus: (status: 'Open' | 'Closed' | null) => void;
  fetchDayStatus: () => Promise<void>;
  setShiftStatus: (status: 'Open' | 'Closed' | null) => void;
  setShiftInfo: (info: { shiftId: string | null; counterId: string | null; counterName: string | null }) => void;
  fetchShiftStatus: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentPage: 'dashboard',
      sidebarCollapsed: false,
      sidebarOpen: false,
      commandPaletteOpen: false,
      posPreSearch: null,
      posSelectCustomer: null,
      posClearCart: false,
      user: null,
      dayStatus: null,
      // Counter shift defaults
      shiftStatus: null,
      activeShiftId: null,
      activeCounterId: null,
      activeCounterName: null,
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
      setDayStatus: (status) => set({ dayStatus: status }),
      setShiftStatus: (status) => set({ shiftStatus: status }),
      setShiftInfo: (info) => set({
        activeShiftId: info.shiftId,
        activeCounterId: info.counterId,
        activeCounterName: info.counterName,
      }),
      fetchShiftStatus: async () => {
        try {
          const res = await fetch('/api/counter-shifts/active');
          const json = await res.json();
          // API returns { success, data: { hasActiveShift, shift: {...} } }
          const shift = json.data?.shift || null;
          if (json.success && shift) {
            set({
              shiftStatus: shift.shiftStatus || 'Open',
              activeShiftId: shift.id,
              activeCounterId: shift.counterId,
              activeCounterName: shift.counter?.name || null,
            });
          } else {
            set({
              shiftStatus: null,
              activeShiftId: null,
              activeCounterId: null,
              activeCounterName: null,
            });
          }
        } catch {
          // Silently fail — don't block app on network error
        }
      },
      fetchDayStatus: async () => {
        try {
          const res = await fetch('/api/day-close/status');
          const json = await res.json();
          if (json.success) {
            set({ dayStatus: json.dayStatus });
          }
        } catch {
          // Silently fail — don't block app on network error
        }
      },
    }),
    {
      name: 'upharma-app-store',
      // Only persist user + page + sidebar preferences across refresh
      partialize: (state) => ({
        user: state.user,
        currentPage: state.currentPage,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
