'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, Plus, Eye, Search, Filter, X, CalendarDays, IndianRupee, Package, Clock, Users, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PurchaseItem {
  id: string;
  medicineId: string;
  medicineName?: string;
  quantity: number;
  unitType: 'tablet' | 'strip' | 'box';
  purchaseRate: number;
  batchNo: string;
  expiryDate: string;
}

interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  date: string;
  subtotal: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  status: string;
  supplier: { name: string };
  user: { name: string };
  items: PurchaseItem[];
}

interface Supplier {
  id: string;
  name: string;
}

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  purchaseRate?: number;
  gstPercent?: number;
}

interface NewItemRow extends PurchaseItem {
  _key: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return '—'; } };

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === 'completed') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs font-medium">Completed</Badge>;
  if (s === 'partial') return <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs font-medium">Partial</Badge>;
  if (s === 'returned') return <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs font-medium">Returned</Badge>;
  if (s === 'pending') return <Badge className="bg-gray-100 text-gray-700 border-gray-200 border text-xs font-medium">Pending</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PurchasesPage() {
  // Data
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create form
  const [createSupplierId, setCreateSupplierId] = useState('');
  const [createItems, setCreateItems] = useState<NewItemRow[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // ─── Fetch Data ──────────────────────────────────────────────────────────

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSupplier) params.set('supplierId', filterSupplier);
      if (filterStatus) params.set('status', filterStatus);
      if (filterDateFrom) params.set('dateFrom', filterDateFrom);
      if (filterDateTo) params.set('dateTo', filterDateTo);
      if (search) params.set('search', search);
      const res = await fetch(`/api/purchases?${params}`);
      const data = await res.json();
      if (data.success) setPurchases(data.data || []);
      else if (Array.isArray(data)) setPurchases(data);
      else setPurchases([]);
    } catch {
      setPurchases([]);
    }
    setLoading(false);
  }, [filterSupplier, filterStatus, filterDateFrom, filterDateTo, search]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers(data.data || []);
      else if (Array.isArray(data)) setSuppliers(data);
      else setSuppliers([]);
    } catch { setSuppliers([]); }
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (data.success) setMedicines(data.data || []);
      else if (Array.isArray(data)) setMedicines(data);
      else setMedicines([]);
    } catch { setMedicines([]); }
  }, []);

  useEffect(() => {
    fetchSuppliers();
    fetchMedicines();
  }, [fetchSuppliers, fetchMedicines]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // ─── Stats ───────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthPurchases = purchases.filter(p => p.date >= monthStart);
    const totalValue = purchases.reduce((a, p) => a + p.grandTotal, 0);
    const pendingPayments = purchases.filter(p => p.balanceDue > 0).reduce((a, p) => a + p.balanceDue, 0);
    const activeSuppliers = new Set(purchases.map(p => p.supplierId)).size;
    return {
      monthCount: monthPurchases.length,
      monthValue: monthPurchases.reduce((a, p) => a + p.grandTotal, 0),
      totalValue,
      pendingPayments,
      activeSuppliers,
    };
  }, [purchases]);

  // ─── Create Purchase Helpers ────────────────────────────────────────────

  const filteredMedicines = useMemo(() => {
    if (!medicineSearch) return medicines.slice(0, 20);
    const q = medicineSearch.toLowerCase();
    return medicines.filter(m => m.name.toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q)).slice(0, 20);
  }, [medicines, medicineSearch]);

  const addItemRow = () => {
    const row: NewItemRow = {
      _key: crypto.randomUUID(),
      id: '',
      medicineId: '',
      medicineName: '',
      quantity: 1,
      unitType: 'strip',
      purchaseRate: 0,
      batchNo: '',
      expiryDate: '',
    };
    setCreateItems(prev => [...prev, row]);
  };

  const updateItem = (idx: number, updates: Partial<NewItemRow>) => {
    setCreateItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const removeItem = (idx: number) => {
    setCreateItems(prev => prev.filter((_, i) => i !== idx));
  };

  const selectMedicineForItem = (idx: number, med: Medicine) => {
    updateItem(idx, {
      medicineId: med.id,
      medicineName: med.name,
      purchaseRate: med.purchaseRate || 0,
    });
    setShowMedDropdown(null);
    setMedicineSearch('');
  };

  const createTotals = useMemo(() => {
    const subtotal = createItems.reduce((a, item) => a + (item.quantity * item.purchaseRate), 0);
    const gstRate = 0.12; // default 12% GST
    const totalGst = subtotal * gstRate;
    const grandTotal = subtotal + totalGst;
    return { subtotal, totalGst, grandTotal, cgst: totalGst / 2, sgst: totalGst / 2 };
  }, [createItems]);

  const handleCreatePurchase = async () => {
    if (!createSupplierId || createItems.length === 0) return;
    const hasEmpty = createItems.some(i => !i.medicineId || !i.batchNo || !i.expiryDate || i.purchaseRate <= 0 || i.quantity <= 0);
    if (hasEmpty) return;
    setSaving(true);
    try {
      const body = {
        supplierId: createSupplierId,
        items: createItems.map(i => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
          unitType: i.unitType,
          purchaseRate: i.purchaseRate,
          batchNo: i.batchNo,
          expiryDate: i.expiryDate,
        })),
      };
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setCreateOpen(false);
        setCreateSupplierId('');
        setCreateItems([]);
        fetchPurchases();
      }
    } catch { /* handled silently */ }
    setSaving(false);
  };

  const resetCreateForm = () => {
    setCreateSupplierId('');
    setCreateItems([]);
    setMedicineSearch('');
    setShowMedDropdown(null);
  };

  // ─── Detail View ────────────────────────────────────────────────────────

  const openDetail = async (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    setDetailOpen(true);
    // Try to fetch full detail
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/purchases/${purchase.id}`);
      const data = await res.json();
      if (data.success) setSelectedPurchase(data.data);
      else if (data.id) setSelectedPurchase(data);
    } catch { /* keep existing data */ }
    setDetailLoading(false);
  };

  // ─── Clear Filters ──────────────────────────────────────────────────────

  const clearFilters = () => {
    setFilterSupplier('');
    setFilterStatus('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
  };

  const hasActiveFilters = filterSupplier || filterStatus || filterDateFrom || filterDateTo || search;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-600" /> Purchases
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage purchase orders and track supplier invoices</p>
        </div>
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          onClick={() => { resetCreateForm(); setCreateOpen(true); }}
        >
          <Plus className="w-4 h-4" /> New Purchase
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Purchases This Month</p>
              <p className="text-xl font-bold text-gray-900">{stats.monthCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Purchase Value</p>
              <p className="text-xl font-bold text-gray-900">{fmt(stats.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending Payments</p>
              <p className="text-xl font-bold text-gray-900">{fmt(stats.pendingPayments)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Active Suppliers</p>
              <p className="text-xl font-bold text-gray-900">{stats.activeSuppliers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by invoice no, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 border-border/80"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2 border-border/80"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            )}
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" className="gap-1 text-gray-500 hover:text-gray-700" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" /> Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Supplier</Label>
                  <Select value={filterSupplier} onValueChange={(v) => setFilterSupplier(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-full border-border/80">
                      <SelectValue placeholder="All Suppliers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Suppliers</SelectItem>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-full border-border/80">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Date From</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Date To</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="border-border/80"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Purchases Table */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Invoice No</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Supplier</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Items</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Subtotal</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">GST</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Grand Total</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Paid</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Balance</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Status</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={11} className="p-4 text-center text-gray-400 animate-pulse">Loading purchases...</td>
                    </tr>
                  ))
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <Truck className="w-10 h-10 opacity-40" />
                        <p className="text-sm font-medium">No purchases found</p>
                        <p className="text-xs">Create your first purchase order to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchases.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <span className="text-sm font-semibold text-gray-900">{p.invoiceNo}</span>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-gray-700 font-medium">{p.supplier?.name || '—'}</div>
                        {p.supplier?.address && <p className="text-xs text-gray-400 mt-0.5">{p.supplier.address}</p>}
                        {p.user?.name && <p className="text-xs text-gray-400">by {p.user.name}</p>}
                      </td>
                      <td className="p-3 text-sm text-gray-600">{fmtDate(p.date)}</td>
                      <td className="p-3 text-sm text-gray-600 text-center">{p.items?.length || 0}</td>
                      <td className="p-3 text-sm text-gray-600 text-right">{fmt(p.subtotal)}</td>
                      <td className="p-3 text-sm text-gray-600 text-right">{fmt(p.totalGst)}</td>
                      <td className="p-3 text-sm font-semibold text-gray-900 text-right">{fmt(p.grandTotal)}</td>
                      <td className="p-3 text-sm text-emerald-600 text-right">{fmt(p.paidAmount)}</td>
                      <td className="p-3 text-right">
                        <span className={`text-sm font-medium ${p.balanceDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {fmt(p.balanceDue)}
                        </span>
                      </td>
                      <td className="p-3"><StatusBadge status={p.status} /></td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => openDetail(p)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs">View</span>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && purchases.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50/80 border-t border-border">
                    <td colSpan={5} className="p-3 text-sm font-semibold text-gray-700 text-right">Totals</td>
                    <td className="p-3 text-sm font-semibold text-gray-700 text-right">
                      {fmt(purchases.reduce((a, p) => a + p.subtotal, 0))}
                    </td>
                    <td className="p-3 text-sm font-semibold text-gray-700 text-right">
                      {fmt(purchases.reduce((a, p) => a + p.totalGst, 0))}
                    </td>
                    <td className="p-3 text-sm font-bold text-gray-900 text-right">
                      {fmt(purchases.reduce((a, p) => a + p.grandTotal, 0))}
                    </td>
                    <td className="p-3 text-sm font-semibold text-emerald-700 text-right">
                      {fmt(purchases.reduce((a, p) => a + p.paidAmount, 0))}
                    </td>
                    <td className="p-3 text-sm font-semibold text-red-600 text-right">
                      {fmt(purchases.reduce((a, p) => a + p.balanceDue, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ─── Create Purchase Dialog ─────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateOpen(open); }}>
        <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Create New Purchase
            </DialogTitle>
            <DialogDescription>Add purchase items from suppliers with batch and GST details</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Supplier Selector */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Supplier *</Label>
              <Select value={createSupplierId} onValueChange={setCreateSupplierId}>
                <SelectTrigger className="w-full border-border/80">
                  <SelectValue placeholder="Select a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Purchase Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  onClick={addItemRow}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </Button>
              </div>

              {createItems.length === 0 ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No items added yet</p>
                  <p className="text-xs mt-1">Click &quot;Add Item&quot; to start adding medicines</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="text-sm w-full" style={{ tableLayout: 'fixed', minWidth: '920px' }}>
                      <thead>
                        <tr className="bg-gray-50 border-b border-border">
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '22%' }}>Medicine</th>
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '9%' }}>Qty</th>
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '11%' }}>Unit</th>
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '12%' }}>Rate (₹)</th>
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '14%' }}>Batch No</th>
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '16%' }}>Expiry Date</th>
                          <th className="text-right text-xs font-medium text-gray-500 p-3" style={{ width: '12%' }}>Amount</th>
                          <th className="p-3" style={{ width: '4%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {createItems.map((item, idx) => (
                          <tr key={item._key} className="border-b border-border/50 last:border-b-0">
                            {/* Medicine Search */}
                            <td className="p-2.5 relative">
                              {item.medicineId ? (
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-sm font-medium text-gray-900 truncate">{item.medicineName}</span>
                                  <button
                                    type="button"
                                    className="shrink-0 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                    onClick={() => updateItem(idx, { medicineId: '', medicineName: '' })}
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <div className="relative">
                                  <Input
                                    placeholder="Search medicine..."
                                    value={showMedDropdown === idx ? medicineSearch : ''}
                                    onFocus={() => { setShowMedDropdown(idx); setMedicineSearch(''); }}
                                    onChange={(e) => { setMedicineSearch(e.target.value); setShowMedDropdown(idx); }}
                                    className="h-10 text-sm border-border/80 w-full"
                                  />
                                  {showMedDropdown === idx && filteredMedicines.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-0.5 bg-white border border-border rounded-md shadow-lg max-h-56 overflow-y-auto">
                                      {filteredMedicines.map(med => (
                                        <button
                                          key={med.id}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 transition-colors border-b border-border/30 last:border-0"
                                          onClick={() => selectMedicineForItem(idx, med)}
                                        >
                                          <p className="font-medium text-gray-900">{med.name}</p>
                                          {med.genericName && <p className="text-xs text-gray-400">{med.genericName}</p>}
                                          {med.purchaseRate != null && <p className="text-xs text-emerald-600">₹{med.purchaseRate.toFixed(2)}</p>}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            {/* Quantity */}
                            <td className="p-2.5">
                              <Input
                                type="number"
                                min={1}
                                value={item.quantity || ''}
                                onChange={(e) => updateItem(idx, { quantity: parseInt(e.target.value) || 0 })}
                                className="h-10 text-sm text-right border-border/80 w-full"
                              />
                            </td>
                            {/* Unit Type */}
                            <td className="p-2.5">
                              <Select value={item.unitType} onValueChange={(v) => updateItem(idx, { unitType: v as 'tablet' | 'strip' | 'box' })}>
                                <SelectTrigger className="h-10 text-sm border-border/80 w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="tablet">Tablet</SelectItem>
                                  <SelectItem value="strip">Strip</SelectItem>
                                  <SelectItem value="box">Box</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            {/* Purchase Rate */}
                            <td className="p-2.5">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                value={item.purchaseRate || ''}
                                onChange={(e) => updateItem(idx, { purchaseRate: parseFloat(e.target.value) || 0 })}
                                className="h-10 text-sm text-right border-border/80 w-full"
                                placeholder="0.00"
                              />
                            </td>
                            {/* Batch No */}
                            <td className="p-2.5">
                              <Input
                                value={item.batchNo}
                                onChange={(e) => updateItem(idx, { batchNo: e.target.value })}
                                className="h-10 text-sm border-border/80 w-full"
                                placeholder="e.g. B2024001"
                              />
                            </td>
                            {/* Expiry Date */}
                            <td className="p-2.5">
                              <Input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) => updateItem(idx, { expiryDate: e.target.value })}
                                className="h-10 text-sm border-border/80 w-full"
                              />
                            </td>
                            {/* Line Total */}
                            <td className="p-2.5 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {fmt(item.quantity * item.purchaseRate)}
                            </td>
                            {/* Remove */}
                            <td className="p-2.5">
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                onClick={() => removeItem(idx)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Running Totals */}
            {createItems.length > 0 && (
              <Card className="bg-emerald-50/60 border-emerald-200/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <IndianRupee className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800">Order Summary</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({createItems.length} items)</span>
                      <span className="font-medium text-gray-900">{fmt(createTotals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CGST (6%)</span>
                      <span className="text-gray-700">{fmt(createTotals.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">SGST (6%)</span>
                      <span className="text-gray-700">{fmt(createTotals.sgst)}</span>
                    </div>
                    <div className="border-t border-emerald-200 pt-2 flex justify-between">
                      <span className="text-sm font-bold text-emerald-800">Grand Total</span>
                      <span className="text-lg font-bold text-emerald-700">{fmt(createTotals.grandTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { resetCreateForm(); setCreateOpen(false); }}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleCreatePurchase}
                disabled={saving || !createSupplierId || createItems.length === 0}
              >
                {saving ? 'Creating...' : 'Create Purchase'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Purchase Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Purchase Details
            </DialogTitle>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-5 pt-2">
              {detailLoading ? (
                <div className="animate-pulse text-center text-gray-400 py-8">Loading details...</div>
              ) : (
                <>
                  {/* Purchase Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Invoice No</p>
                      <p className="text-sm font-bold text-gray-900 mt-0.5">{selectedPurchase.invoiceNo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Supplier</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedPurchase.supplier?.name || '—'}</p>
                      {selectedPurchase.supplier?.address && <p className="text-xs text-gray-400">{selectedPurchase.supplier.address}</p>}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Date</p>
                      <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                        {fmtDate(selectedPurchase.date)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Created By</p>
                      <p className="text-sm text-gray-900 mt-0.5">{selectedPurchase.user?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status</p>
                      <div className="mt-0.5"><StatusBadge status={selectedPurchase.status} /></div>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-emerald-600" />
                      Items ({selectedPurchase.items?.length || 0})
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-border">
                              <th className="text-left text-xs font-medium text-gray-500 p-2.5">#</th>
                              <th className="text-left text-xs font-medium text-gray-500 p-2.5">Medicine</th>
                              <th className="text-center text-xs font-medium text-gray-500 p-2.5">Qty</th>
                              <th className="text-left text-xs font-medium text-gray-500 p-2.5">Unit</th>
                              <th className="text-right text-xs font-medium text-gray-500 p-2.5">Rate</th>
                              <th className="text-left text-xs font-medium text-gray-500 p-2.5">Batch No</th>
                              <th className="text-left text-xs font-medium text-gray-500 p-2.5">Expiry</th>
                              <th className="text-right text-xs font-medium text-gray-500 p-2.5">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(selectedPurchase.items || []).map((item, idx) => (
                              <tr key={item.id || idx} className="border-b border-border/50 last:border-b-0 hover:bg-gray-50/50">
                                <td className="p-2.5 text-xs text-gray-400">{idx + 1}</td>
                                <td className="p-2.5">
                                  <span className="text-sm font-medium text-gray-900">{item.medicineName || item.medicineId}</span>
                                </td>
                                <td className="p-2.5 text-center text-sm">{item.quantity}</td>
                                <td className="p-2.5">
                                  <Badge variant="secondary" className="text-xs capitalize">{item.unitType}</Badge>
                                </td>
                                <td className="p-2.5 text-right text-sm">{fmt(item.purchaseRate)}</td>
                                <td className="p-2.5 text-sm font-mono text-gray-700">{item.batchNo}</td>
                                <td className="p-2.5 text-sm text-gray-600">{item.expiryDate ? fmtDate(item.expiryDate) : '—'}</td>
                                <td className="p-2.5 text-right text-sm font-semibold text-gray-900">
                                  {fmt(item.quantity * item.purchaseRate)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <Card className="bg-gray-50/80 border-border/60">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-semibold text-gray-700">Payment Summary</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Subtotal</span>
                          <span className="font-medium">{fmt(selectedPurchase.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">CGST</span>
                          <span className="font-medium">{fmt(selectedPurchase.cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">SGST</span>
                          <span className="font-medium">{fmt(selectedPurchase.sgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total GST</span>
                          <span className="font-medium">{fmt(selectedPurchase.totalGst)}</span>
                        </div>
                        <div className="flex justify-between col-span-2 border-t border-border pt-2">
                          <span className="font-bold text-gray-800">Grand Total</span>
                          <span className="font-bold text-gray-900 text-base">{fmt(selectedPurchase.grandTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Paid Amount</span>
                          <span className="font-semibold text-emerald-600">{fmt(selectedPurchase.paidAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Balance Due</span>
                          <span className={`font-bold ${selectedPurchase.balanceDue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {fmt(selectedPurchase.balanceDue)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
