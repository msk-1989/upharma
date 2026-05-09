'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Search,
  Pill,
  Users,
  Receipt,
  Zap,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  ClipboardList,
  FileText,
  RefreshCw,
  BarChart3,
  CalendarCheck,
  Settings,
  Database,
  LayoutGrid,
  Stethoscope,
  Loader2,
  ArrowRight,
  Command,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, type PageKey } from '@/stores/app-store';

// ==================== TYPES ====================

type ResultType = 'medicine' | 'customer' | 'invoice' | 'action' | 'page';

interface CommandResult {
  id: string;
  type: ResultType;
  name: string;
  subtitle: string;
  icon: React.ElementType;
  action: () => void;
}

interface ResultGroup {
  type: ResultType;
  label: string;
  items: CommandResult[];
}

// ==================== PAGE DEFINITIONS ====================

const pageDefinitions: { key: PageKey; label: string; icon: React.ElementType; keywords: string[] }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, keywords: ['home', 'overview'] },
  { key: 'pos-billing', label: 'POS Billing', icon: ShoppingCart, keywords: ['billing', 'pos', 'counter', 'sale', 'bill'] },
  { key: 'medicines', label: 'Medicines', icon: Pill, keywords: ['drug', 'pharma', 'product'] },
  { key: 'inventory', label: 'Inventory', icon: Package, keywords: ['stock', 'warehouse'] },
  { key: 'purchases', label: 'Purchases', icon: Truck, keywords: ['purchase', 'buy', 'vendor'] },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: ClipboardList, keywords: ['po', 'order', 'purchase order'] },
  { key: 'customers', label: 'Customers', icon: Users, keywords: ['client', 'patient'] },
  { key: 'suppliers', label: 'Suppliers', icon: FileText, keywords: ['vendor', 'distributor'] },
  { key: 'racks', label: 'Racks', icon: LayoutGrid, keywords: ['shelf', 'storage', 'rack'] },
  { key: 'doctors', label: 'Doctors', icon: Stethoscope, keywords: ['doctor', 'physician', 'dr'] },
  { key: 'returns', label: 'Returns', icon: RefreshCw, keywords: ['return', 'refund', 'exchange'] },
  { key: 'reports', label: 'Reports', icon: BarChart3, keywords: ['analytics', 'stats', 'report'] },
  { key: 'day-close', label: 'Day Closing', icon: CalendarCheck, keywords: ['day close', 'closing', 'end of day', 'eod'] },
  { key: 'settings', label: 'Settings', icon: Settings, keywords: ['config', 'preference'] },
  { key: 'backup', label: 'Backup', icon: Database, keywords: ['backup', 'restore', 'export'] },
];

// ==================== ACTION DEFINITIONS ====================

const actionDefinitions: { id: string; label: string; subtitle: string; icon: React.ElementType; keywords: string[]; action: () => void }[] = [];

// Actions will be built dynamically in the component since they need store access

// ==================== HELPER ====================

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  // Direct contains
  if (t.includes(q)) return true;

  // Fuzzy: check if all characters of query appear in order
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ==================== MAIN COMPONENT ====================

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setCurrentPage,
    setPosPreSearch,
    setPosSelectCustomer,
    setPosClearCart,
  } = useAppStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResults, setApiResults] = useState<CommandResult[]>([]);
  const [customersCache, setCustomersCache] = useState<{ id: string; name: string; phone: string | null }[]>([]);
  const [salesCache, setSalesCache] = useState<{ id: string; invoiceNo: string; customerName: string | null; grandTotal: number; status: string }[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const openRef = useRef(commandPaletteOpen);

  // Keep ref in sync
  openRef.current = commandPaletteOpen;

  // Focus input when opened
  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setApiResults([]);
      setIsLoading(false);
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [commandPaletteOpen]);

  // Preload customers and sales caches
  useEffect(() => {
    if (!openRef.current) return;

    const loadCaches = async () => {
      try {
        const [custRes, salesRes] = await Promise.all([
          fetch('/api/customers').then((r) => r.json()),
          fetch('/api/sales').then((r) => r.json()),
        ]);
        if (custRes.success) setCustomersCache(custRes.data);
        if (salesRes.success) setSalesCache(salesRes.data.slice(0, 200)); // Cache latest 200
      } catch {
        // silent fail
      }
    };
    loadCaches();
  }, [commandPaletteOpen]);

  // Dynamic actions
  const actions = useMemo(() => [
    {
      id: 'action-new-bill',
      label: 'New Invoice',
      subtitle: 'Start a new POS billing session',
      icon: ShoppingCart,
      keywords: ['new', 'bill', 'invoice', 'new bill', 'new invoice', 'create bill'],
      action: () => {
        setPosClearCart(true);
        setPosPreSearch(null);
        setPosSelectCustomer(null);
        setCurrentPage('pos-billing');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-day-close',
      label: 'Day Closing',
      subtitle: 'End of day reconciliation & close',
      icon: CalendarCheck,
      keywords: ['day', 'close', 'closing', 'day close', 'end of day', 'eod'],
      action: () => {
        setCurrentPage('day-close');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-add-medicine',
      label: 'Add New Medicine',
      subtitle: 'Add a new medicine to the catalogue',
      icon: Pill,
      keywords: ['add', 'medicine', 'new medicine', 'add drug'],
      action: () => {
        setCurrentPage('medicines');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-add-customer',
      label: 'Add New Customer',
      subtitle: 'Register a new customer',
      icon: Users,
      keywords: ['add', 'customer', 'new customer', 'register'],
      action: () => {
        setCurrentPage('customers');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-view-reports',
      label: 'View Reports',
      subtitle: 'Sales, inventory & financial reports',
      icon: BarChart3,
      keywords: ['view', 'report', 'sales report', 'report'],
      action: () => {
        setCurrentPage('reports');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-new-purchase',
      label: 'New Purchase Entry',
      subtitle: 'Record a new purchase from supplier',
      icon: Truck,
      keywords: ['new', 'purchase', 'add purchase'],
      action: () => {
        setCurrentPage('purchases');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-pos-focus',
      label: 'Go to POS',
      subtitle: 'Jump to Point of Sale billing',
      icon: ShoppingCart,
      keywords: ['pos', 'billing', 'counter', 'goto pos'],
      action: () => {
        setCurrentPage('pos-billing');
        setCommandPaletteOpen(false);
      },
    },
    {
      id: 'action-dashboard',
      label: 'Go to Dashboard',
      subtitle: 'Back to the main dashboard',
      icon: LayoutDashboard,
      keywords: ['home', 'dashboard', 'main', 'go home'],
      action: () => {
        setCurrentPage('dashboard');
        setCommandPaletteOpen(false);
      },
    },
  ], [setCurrentPage, setCommandPaletteOpen, setPosClearCart, setPosPreSearch, setPosSelectCustomer]);

  // ==================== LOCAL RESULTS (instant) ====================

  const localResults = useMemo((): CommandResult[] => {
    if (!query.trim()) return [];

    const q = query.trim().toLowerCase();

    // Detect prefixes
    const isMedicineSearch = q.startsWith('med ') || q.startsWith('medicine ') || q.startsWith('drug ');
    const isCustomerSearch = q.startsWith('cust ') || q.startsWith('customer ') || q.startsWith('patient ');
    const isInvoiceSearch = q.startsWith('bill ') || q.startsWith('inv ') || q.startsWith('invoice ');
    const isActionSearch = q.startsWith('action ');

    // Strip prefix for matching
    const strippedQ = q.replace(/^(med|medicine|drug|cust|customer|patient|bill|inv|invoice|action)\s+/, '');

    const results: CommandResult[] = [];

    // Page results (always show if no prefix filter excludes them)
    if (!isMedicineSearch && !isCustomerSearch && !isInvoiceSearch) {
      for (const page of pageDefinitions) {
        if (
          fuzzyMatch(strippedQ || q, page.label) ||
          page.keywords.some((kw) => fuzzyMatch(strippedQ || q, kw))
        ) {
          const pageKey = page.key;
          results.push({
            id: `page-${pageKey}`,
            type: 'page',
            name: page.label,
            subtitle: `Go to ${page.label}`,
            icon: page.icon,
            action: () => {
              setCurrentPage(pageKey);
              setCommandPaletteOpen(false);
            },
          });
        }
      }

      // Action results
      if (!isCustomerSearch && !isMedicineSearch && !isInvoiceSearch) {
        for (const action of actions) {
          if (
            fuzzyMatch(strippedQ || q, action.label) ||
            action.keywords.some((kw) => fuzzyMatch(strippedQ || q, kw))
          ) {
            results.push({
              id: action.id,
              type: 'action',
              name: action.label,
              subtitle: action.subtitle,
              icon: action.icon,
              action: action.action,
            });
          }
        }
      }
    }

    // Customer local results
    if ((!isMedicineSearch && !isInvoiceSearch) || isCustomerSearch) {
      for (const cust of customersCache) {
        if (fuzzyMatch(strippedQ || q, cust.name) || (cust.phone && cust.phone.includes(strippedQ || q))) {
          const custId = cust.id;
          results.push({
            id: `customer-${custId}`,
            type: 'customer',
            name: cust.name,
            subtitle: cust.phone || 'Customer',
            icon: Users,
            action: () => {
              setPosSelectCustomer(custId);
              setCurrentPage('pos-billing');
              setCommandPaletteOpen(false);
            },
          });
        }
      }
    }

    // Invoice local results
    if ((!isMedicineSearch && !isCustomerSearch) || isInvoiceSearch) {
      for (const sale of salesCache) {
        if (
          fuzzyMatch(strippedQ || q, sale.invoiceNo.toLowerCase()) ||
          (sale.customerName && fuzzyMatch(strippedQ || q, sale.customerName))
        ) {
          results.push({
            id: `invoice-${sale.id}`,
            type: 'invoice',
            name: sale.invoiceNo,
            subtitle: `${sale.customerName || 'Walk-in'} · ${formatINR(sale.grandTotal)}`,
            icon: Receipt,
            action: () => {
              // Navigate to reports to view invoices
              setCurrentPage('reports');
              setCommandPaletteOpen(false);
            },
          });
        }
      }
    }

    return results;
  }, [query, customersCache, salesCache, actions, setCurrentPage, setCommandPaletteOpen, setPosSelectCustomer]);

  // ==================== API SEARCH (debounced medicines) ====================

  useEffect(() => {
    if (!query.trim() || !commandPaletteOpen) {
      setIsLoading(false);
      setApiResults([]);
      return;
    }

    const q = query.trim().toLowerCase();
    const isMedicineSearch = q.startsWith('med ') || q.startsWith('medicine ') || q.startsWith('drug ');
    const isCustomerSearch = q.startsWith('cust ') || q.startsWith('customer ') || q.startsWith('patient ');
    const isInvoiceSearch = q.startsWith('bill ') || q.startsWith('inv ') || q.startsWith('invoice ');

    // Only search medicines via API if it's a medicine search or no prefix
    if (isCustomerSearch || isInvoiceSearch || q.startsWith('action ')) {
      setIsLoading(false);
      setApiResults([]);
      return;
    }

    const searchQ = q.replace(/^(med|medicine|drug)\s+/, '').trim();
    if (searchQ.length < 2) {
      setIsLoading(false);
      setApiResults([]);
      return;
    }

    // Cancel previous
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setIsLoading(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/medicines?search=${encodeURIComponent(searchQ)}`, {
          signal: abortRef.current!.signal,
        });
        const data = await res.json();
        if (data.success && data.data) {
          const meds: CommandResult[] = data.data.slice(0, 10).map((med: any) => ({
            id: `medicine-${med.id}`,
            type: 'medicine' as ResultType,
            name: med.name,
            subtitle: `${med.genericName || ''}${med.manufacturer ? ` · ${med.manufacturer}` : ''}${med.totalStock !== undefined ? ` · Stock: ${med.totalStock}` : ''}`,
            icon: Pill,
            action: () => {
              setPosPreSearch(med.name);
              setCurrentPage('pos-billing');
              setCommandPaletteOpen(false);
            },
          }));
          setApiResults(meds);
        } else {
          setApiResults([]);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setApiResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, commandPaletteOpen, setCurrentPage, setCommandPaletteOpen, setPosPreSearch]);

  // ==================== GROUP & MERGE RESULTS ====================

  const groupedResults = useMemo((): ResultGroup[] => {
    // Merge API medicine results with local results
    const apiMedIds = new Set(apiResults.map((r) => r.id));
    const mergedResults = [...apiResults];

    // Add local results that aren't duplicated
    for (const local of localResults) {
      if (local.type === 'medicine' && apiMedIds.has(local.id)) continue;
      mergedResults.push(local);
    }

    // Deduplicate by id
    const seen = new Set<string>();
    const deduped = mergedResults.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Group by type
    const groupOrder: ResultType[] = ['action', 'page', 'medicine', 'customer', 'invoice'];
    const groupLabels: Record<ResultType, string> = {
      action: 'Actions',
      page: 'Pages',
      medicine: 'Medicines',
      customer: 'Customers',
      invoice: 'Invoices',
    };

    const groups: ResultGroup[] = [];
    for (const type of groupOrder) {
      const items = deduped.filter((r) => r.type === type);
      if (items.length > 0) {
        groups.push({ type, label: groupLabels[type], items });
      }
    }

    return groups;
  }, [localResults, apiResults]);

  // Flat list for keyboard navigation
  const flatResults = useMemo(() => {
    return groupedResults.flatMap((g) => g.items);
  }, [groupedResults]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (flatResults.length === 0) return;
    const container = resultsRef.current;
    if (!container) return;

    const selectedEl = container.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatResults.length]);

  // ==================== KEYBOARD HANDLING ====================

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            flatResults[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          setCommandPaletteOpen(false);
          break;
        case 'Tab':
          e.preventDefault();
          // Cycle between groups
          if (groupedResults.length === 0) break;
          const currentGroup = groupedResults.find((g) =>
            g.items.some((item) => item.id === flatResults[selectedIndex]?.id)
          );
          if (currentGroup) {
            const currentGroupIndex = groupedResults.indexOf(currentGroup);
            const nextGroupIndex = e.shiftKey
              ? (currentGroupIndex - 1 + groupedResults.length) % groupedResults.length
              : (currentGroupIndex + 1) % groupedResults.length;
            // Find the first item index in the next group
            let nextIndex = 0;
            for (const g of groupedResults.slice(0, nextGroupIndex)) {
              nextIndex += g.items.length;
            }
            setSelectedIndex(nextIndex);
          }
          break;
      }
    },
    [flatResults, selectedIndex, groupedResults, setCommandPaletteOpen]
  );

  // ==================== CLOSE HANDLER ====================

  const handleClose = useCallback(() => {
    setCommandPaletteOpen(false);
  }, [setCommandPaletteOpen]);

  // ==================== COMPUTED GLOBAL INDEX FOR GROUPS ====================

  const getGlobalIndex = useCallback(
    (groupIdx: number, itemIdx: number) => {
      let global = 0;
      for (let i = 0; i < groupIdx; i++) {
        global += groupedResults[i].items.length;
      }
      return global + itemIdx;
    },
    [groupedResults]
  );

  // ==================== RENDER ====================

  if (!commandPaletteOpen) return null;

  // Count results
  const totalResults = flatResults.length;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative mx-auto mt-[12vh] sm:mt-[15vh] max-w-2xl w-[calc(100%-1rem)] sm:w-full bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150">
        {/* Search Input */}
        <div className="flex items-center px-4 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full px-3 py-4 text-lg bg-transparent outline-none text-gray-900 placeholder:text-gray-400"
            placeholder="Search medicines, customers, invoices, actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-emerald-500 animate-spin flex-shrink-0" />
          )}
          {!isLoading && query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center px-2 py-1 text-[11px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200 flex-shrink-0 ml-2">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          className="max-h-[50vh] min-h-[120px] overflow-y-auto p-2 scroll-smooth"
        >
          {!query.trim() && (
            <div className="py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 flex items-center justify-center">
                <Command className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-700">Start typing to search</p>
              <p className="text-xs text-gray-400 mt-1">
                Try <span className="font-medium text-gray-500">&quot;parac&quot;</span>,{' '}
                <span className="font-medium text-gray-500">&quot;cust rahul&quot;</span>,{' '}
                <span className="font-medium text-gray-500">&quot;bill 1023&quot;</span>, or{' '}
                <span className="font-medium text-gray-500">&quot;new bill&quot;</span>
              </p>
              {/* Quick action hints */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {[
                  { prefix: 'med ', hint: 'Medicines' },
                  { prefix: 'cust ', hint: 'Customers' },
                  { prefix: 'bill ', hint: 'Invoices' },
                ].map((item) => (
                  <button
                    key={item.prefix}
                    onClick={() => setQuery(item.prefix)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
                  >
                    <span className="font-mono font-semibold text-emerald-600">{item.prefix}</span>
                    <span>{item.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {query.trim() && totalResults === 0 && !isLoading && (
            <div className="py-8 text-center">
              <Search className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm font-medium text-gray-700">No results found</p>
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term or use a prefix like{' '}
                <span className="font-medium text-gray-500">&quot;med &quot;</span>,{' '}
                <span className="font-medium text-gray-500">&quot;cust &quot;</span>,{' '}
                <span className="font-medium text-gray-500">&quot;bill &quot;</span>
              </p>
            </div>
          )}

          {groupedResults.map((group, groupIdx) => (
            <div key={group.type} className="mb-1">
              <p className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider select-none">
                {group.label}
              </p>
              {group.items.map((item, itemIdx) => {
                const globalIndex = getGlobalIndex(groupIdx, itemIdx);
                const isSelected = selectedIndex === globalIndex;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    data-index={globalIndex}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors duration-75',
                      isSelected
                        ? 'bg-emerald-500 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                  >
                    <div
                      className={cn(
                        'flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0',
                        isSelected
                          ? 'bg-emerald-400/30 text-white'
                          : 'bg-gray-100 text-gray-500'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          'text-sm font-medium truncate',
                          isSelected ? 'text-white' : 'text-gray-900'
                        )}
                      >
                        {item.name}
                      </p>
                      <p
                        className={cn(
                          'text-xs truncate',
                          isSelected ? 'text-emerald-100' : 'text-gray-500'
                        )}
                      >
                        {item.subtitle}
                      </p>
                    </div>
                    {isSelected && (
                      <ArrowRight className="w-4 h-4 flex-shrink-0 text-emerald-200" />
                    )}
                    {!isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 flex-shrink-0 text-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {isLoading && query.trim() && totalResults === 0 && (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 mx-auto text-emerald-400 animate-spin" />
              <p className="text-xs text-gray-400 mt-2">Searching...</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-[11px] text-gray-400 select-none">
          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-200 bg-gray-50 text-[10px]">
              <ArrowUp className="w-3 h-3" />
            </kbd>
            <kbd className="inline-flex items-center justify-center w-5 h-5 rounded border border-gray-200 bg-gray-50 text-[10px]">
              <ArrowDown className="w-3 h-3" />
            </kbd>
            <span className="ml-0.5">Navigate</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-200 bg-gray-50 text-[10px]">
              ↵
            </kbd>
            <span className="ml-0.5">Select</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-200 bg-gray-50 text-[10px]">
              Tab
            </kbd>
            <span className="ml-0.5">Groups</span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-200 bg-gray-50 text-[10px]">
              Esc
            </kbd>
            <span className="ml-0.5">Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
