'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList, Plus, Eye, Search, Filter, X, CalendarDays, IndianRupee,
  Package, Clock, AlertTriangle, Send, Printer, Edit3, ArrowRightLeft,
  ChevronRight, CheckCircle2, XCircle, Loader2, Sparkles, ArrowDownUp,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

interface POItem {
  id: string;
  medicineId: string;
  medicineName?: string;
  quantity: number;
  unitType: 'tablet' | 'strip' | 'box';
  purchaseRate: number;
  gstPercent: number;
  notes?: string;
  receivedQty: number;
  medicine?: { name: string; genericName?: string; baseUnit: string; unitsPerStrip: number; stripsPerBox: number };
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  date: string;
  expectedDate?: string | null;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  status: string;
  notes?: string;
  supplier: { id: string; name: string; phone?: string };
  user?: { name: string };
  items: POItem[];
  purchases?: { id: string; invoiceNo: string; date: string; grandTotal: number; status: string }[];
}

interface Supplier {
  id: string;
  name: string;
}

interface Medicine {
  id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  purchaseRate?: number;
  gstPercent?: number;
  baseUnit?: string;
  unitsPerStrip?: number;
  stripsPerBox?: number;
}

interface NewItemRow {
  _key: string;
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitType: 'tablet' | 'strip' | 'box';
  purchaseRate: number;
  gstPercent: number;
  notes: string;
}

interface AutoSuggestion {
  id: string;
  name: string;
  genericName?: string;
  manufacturer?: string;
  currentStock: number;
  reorderLevel: number;
  shortage: number;
  suggestedOrderQty: number;
  purchaseRate: number;
  baseUnit: string;
  unitsPerStrip: number;
  stripsPerBox: number;
}

interface GRNItemRow {
  poItemId: string;
  medicineName: string;
  orderedQty: number;
  unitType: string;
  receivedQty: number;
  batchNo: string;
  expiryDate: string;
  purchaseRate: number;
  remainingQty: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function POStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  switch (s) {
    case 'draft':
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200 border text-xs font-medium">Draft</Badge>;
    case 'sent':
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 border text-xs font-medium">Sent</Badge>;
    case 'partial':
      return <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs font-medium">Partial</Badge>;
    case 'received':
      return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs font-medium">Received</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs font-medium">Cancelled</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
  }
}

function StatusTimeline({ status }: { status: string }) {
  const stages = [
    { key: 'Draft', label: 'Draft', icon: ClipboardList },
    { key: 'Sent', label: 'Sent', icon: Send },
    { key: 'Partial', label: 'Partial', icon: Package },
    { key: 'Received', label: 'Received', icon: CheckCircle2 },
  ];
  const currentIdx = stages.findIndex((s) => s.key === status);
  const isCancelled = status === 'Cancelled';

  return (
    <div className="flex items-center gap-1 py-3">
      {stages.map((stage, idx) => {
        const isComplete = !isCancelled && (currentIdx >= idx);
        const isCurrent = !isCancelled && (currentIdx === idx);
        const Icon = stage.icon;
        return (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isComplete ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                {isCancelled && stage.key === 'Draft' ? (
                  <XCircle className="w-4 h-4 text-red-500" />
                ) : (
                  <Icon className={`w-4 h-4 ${isComplete ? 'text-emerald-600' : 'text-gray-400'}`} />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isCurrent ? 'text-emerald-600' : 'text-gray-400'}`}>
                {stage.label}
              </span>
            </div>
            {idx < stages.length - 1 && (
              <div className={`h-0.5 w-8 flex-shrink-0 ${currentIdx > idx ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
      {isCancelled && (
        <>
          <div className="h-0.5 w-8 flex-shrink-0 bg-red-300" />
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-100">
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-[10px] font-medium text-red-500">Cancelled</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PurchaseOrdersPage() {
  // ─── Data ────────────────────────────────────────────────────────────
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── Filters ─────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ─── Dialogs ─────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [autoSuggestOpen, setAutoSuggestOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Create Form ─────────────────────────────────────────────────────
  const [createSupplierId, setCreateSupplierId] = useState('');
  const [createExpectedDate, setCreateExpectedDate] = useState('');
  const [createNotes, setCreateNotes] = useState('');
  const [createItems, setCreateItems] = useState<NewItemRow[]>([]);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [showMedDropdown, setShowMedDropdown] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // ─── GRN Form ────────────────────────────────────────────────────────
  const [grnItems, setGrnItems] = useState<GRNItemRow[]>([]);
  const [converting, setConverting] = useState(false);

  // ─── Auto Suggest ────────────────────────────────────────────────────
  const [suggestions, setSuggestions] = useState<AutoSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestSummary, setSuggestSummary] = useState({ totalBelowReorder: 0, totalShortage: 0, estimatedValue: 0 });

  // ─── Fetch Data ──────────────────────────────────────────────────────

  const fetchPOs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterSupplier) params.set('supplierId', filterSupplier);
      if (filterDateFrom) params.set('from', filterDateFrom);
      if (filterDateTo) params.set('to', filterDateTo);
      if (search) params.set('search', search);
      const res = await fetch(`/api/purchase-orders?${params}`);
      const data = await res.json();
      if (data.success) setPurchaseOrders(data.data || []);
      else if (Array.isArray(data)) setPurchaseOrders(data);
      else setPurchaseOrders([]);
    } catch {
      setPurchaseOrders([]);
    }
    setLoading(false);
  }, [filterStatus, filterSupplier, filterDateFrom, filterDateTo, search]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      if (data.success) setSuppliers((data.data || []).filter((s: Supplier) => true));
      else if (Array.isArray(data)) setSuppliers(data);
    } catch { setSuppliers([]); }
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      const res = await fetch('/api/medicines');
      const data = await res.json();
      if (data.success) setMedicines(data.data || []);
      else if (Array.isArray(data)) setMedicines(data);
    } catch { setMedicines([]); }
  }, []);

  useEffect(() => { fetchSuppliers(); fetchMedicines(); }, [fetchSuppliers, fetchMedicines]);
  useEffect(() => { fetchPOs(); }, [fetchPOs]);

  // ─── Stats ───────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthPOs = purchaseOrders.filter(p => p.date >= monthStart);
    const pendingPOs = purchaseOrders.filter(p => p.status === 'Draft' || p.status === 'Sent');
    return {
      total: purchaseOrders.length,
      pending: pendingPOs.length,
      monthCount: monthPOs.length,
      totalValue: purchaseOrders.reduce((a, p) => a + p.grandTotal, 0),
    };
  }, [purchaseOrders]);

  // ─── Medicine Search ─────────────────────────────────────────────────

  const filteredMedicines = useMemo(() => {
    if (!medicineSearch) return medicines.slice(0, 20);
    const q = medicineSearch.toLowerCase();
    return medicines.filter(m =>
      m.name.toLowerCase().includes(q) || (m.genericName || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [medicines, medicineSearch]);

  // ─── Create PO Helpers ──────────────────────────────────────────────

  const addItemRow = (preFill?: { medicineId: string; medicineName: string; quantity: number; purchaseRate: number; gstPercent: number }) => {
    const row: NewItemRow = {
      _key: crypto.randomUUID(),
      medicineId: preFill?.medicineId || '',
      medicineName: preFill?.medicineName || '',
      quantity: preFill?.quantity || 1,
      unitType: 'strip',
      purchaseRate: preFill?.purchaseRate || 0,
      gstPercent: preFill?.gstPercent || 12,
      notes: '',
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
      gstPercent: med.gstPercent || 12,
    });
    setShowMedDropdown(null);
    setMedicineSearch('');
  };

  const createTotals = useMemo(() => {
    const subtotal = createItems.reduce((a, item) => {
      const med = medicines.find(m => m.id === item.medicineId);
      let qtySmallest = item.quantity;
      if (item.unitType === 'strip' && med) qtySmallest = item.quantity * (med.unitsPerStrip || 10);
      else if (item.unitType === 'box' && med) qtySmallest = item.quantity * (med.stripsPerBox || 10) * (med.unitsPerStrip || 10);
      return a + (qtySmallest * item.purchaseRate);
    }, 0);
    const totalGst = createItems.reduce((a, item) => {
      const med = medicines.find(m => m.id === item.medicineId);
      let qtySmallest = item.quantity;
      if (item.unitType === 'strip' && med) qtySmallest = item.quantity * (med.unitsPerStrip || 10);
      else if (item.unitType === 'box' && med) qtySmallest = item.quantity * (med.stripsPerBox || 10) * (med.unitsPerStrip || 10);
      const lineBase = qtySmallest * item.purchaseRate;
      return a + lineBase * (item.gstPercent / 100);
    }, 0);
    const grandTotal = subtotal + totalGst;
    return { subtotal, totalGst, grandTotal };
  }, [createItems, medicines]);

  const handleCreatePO = async (sendToSupplier: boolean) => {
    if (!createSupplierId || createItems.length === 0) return;
    const hasEmpty = createItems.some(i => !i.medicineId || i.purchaseRate <= 0 || i.quantity <= 0);
    if (hasEmpty) return;

    setSaving(true);
    try {
      const body: any = {
        supplierId: createSupplierId,
        expectedDate: createExpectedDate || undefined,
        notes: createNotes || undefined,
        items: createItems.map(i => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
          unitType: i.unitType,
          purchaseRate: i.purchaseRate,
          notes: i.notes || undefined,
        })),
      };
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        const poId = data.data?.id;

        // If "Send to Supplier", update status to Sent
        if (sendToSupplier && poId) {
          setSending(true);
          await fetch(`/api/purchase-orders/${poId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Sent' }),
          });
          setSending(false);
        }

        setCreateOpen(false);
        resetCreateForm();
        fetchPOs();
      }
    } catch { /* handled silently */ }
    setSaving(false);
  };

  const resetCreateForm = () => {
    setCreateSupplierId('');
    setCreateExpectedDate('');
    setCreateNotes('');
    setCreateItems([]);
    setMedicineSearch('');
    setShowMedDropdown(null);
  };

  // ─── Detail View ─────────────────────────────────────────────────────

  const openDetail = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    setDetailOpen(true);
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/purchase-orders/${po.id}`);
      const data = await res.json();
      if (data.success) setSelectedPO(data.data);
    } catch { /* keep existing data */ }
    setDetailLoading(false);
  };

  // ─── Cancel PO ───────────────────────────────────────────────────────

  const handleCancelPO = async () => {
    if (!selectedPO) return;
    try {
      const res = await fetch(`/api/purchase-orders/${selectedPO.id}`, { method: 'DELETE' });
      if (res.ok) {
        setCancelConfirmOpen(false);
        setDetailOpen(false);
        fetchPOs();
      }
    } catch { /* handled */ }
  };

  // ─── Convert to GRN ──────────────────────────────────────────────────

  const openConvertDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    // Pre-fill GRN items from PO items (only items not fully received)
    const items: GRNItemRow[] = po.items
      .filter((item) => item.receivedQty < item.quantity)
      .map((item) => ({
        poItemId: item.id,
        medicineName: item.medicineName || item.medicine?.name || 'Unknown',
        orderedQty: item.quantity,
        unitType: item.unitType,
        receivedQty: item.quantity - item.receivedQty, // default to remaining
        batchNo: '',
        expiryDate: '',
        purchaseRate: item.purchaseRate || 0,
        remainingQty: item.quantity - item.receivedQty,
      }));
    setGrnItems(items);
    setConvertOpen(true);
  };

  const updateGRNItem = (idx: number, updates: Partial<GRNItemRow>) => {
    setGrnItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const handleConvertToGRN = async () => {
    if (!selectedPO || grnItems.length === 0) return;
    const hasEmpty = grnItems.some(i => !i.batchNo || !i.expiryDate || i.receivedQty <= 0);
    if (hasEmpty) return;

    setConverting(true);
    try {
      const res = await fetch(`/api/purchase-orders/${selectedPO.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: grnItems.map(i => ({
            poItemId: i.poItemId,
            receivedQty: i.receivedQty,
            batchNo: i.batchNo,
            expiryDate: i.expiryDate,
            purchaseRate: i.purchaseRate,
          })),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setConvertOpen(false);
        setDetailOpen(false);
        fetchPOs();
        // Optionally show the created GRN data
      }
    } catch { /* handled */ }
    setConverting(false);
  };

  // ─── Auto Suggest ────────────────────────────────────────────────────

  const fetchAutoSuggest = async () => {
    setSuggestLoading(true);
    setAutoSuggestOpen(true);
    try {
      const res = await fetch('/api/purchase-orders/auto-suggest');
      const data = await res.json();
      if (data.success) {
        setSuggestions(data.data || []);
        setSuggestSummary(data.summary || { totalBelowReorder: 0, totalShortage: 0, estimatedValue: 0 });
      }
    } catch { setSuggestions([]); }
    setSuggestLoading(false);
  };

  const createPOFromSuggestions = () => {
    setAutoSuggestOpen(false);
    setCreateOpen(true);
    setCreateItems([]);
    // Pre-fill items from suggestions (strip-level ordering)
    suggestions.forEach((s) => {
      addItemRow({
        medicineId: s.id,
        medicineName: s.name,
        quantity: Math.ceil(s.suggestedOrderQty / s.unitsPerStrip),
        purchaseRate: s.purchaseRate,
        gstPercent: 12,
      });
    });
  };

  // ─── Clear Filters ───────────────────────────────────────────────────

  const clearFilters = () => {
    setFilterStatus('');
    setFilterSupplier('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
  };

  const hasActiveFilters = filterStatus || filterSupplier || filterDateFrom || filterDateTo || search;

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-teal-600" /> Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage purchase orders, track deliveries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
            onClick={fetchAutoSuggest}
          >
            <Sparkles className="w-4 h-4" /> Auto Suggest
          </Button>
          <Button
            className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
            onClick={() => { resetCreateForm(); setCreateOpen(true); }}
          >
            <Plus className="w-4 h-4" /> New Purchase Order
          </Button>
        </div>
      </div>

      {/* ─── Stats Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total POs</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Pending POs</p>
              <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">This Month</p>
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
              <p className="text-xs text-gray-500 font-medium">Total PO Value</p>
              <p className="text-xl font-bold text-gray-900">{fmt(stats.totalValue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Search & Filters ───────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by PO number, supplier..."
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
            {hasActiveFilters && <span className="h-2 w-2 rounded-full bg-teal-500" />}
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
                  <Label className="text-xs font-medium text-gray-500">Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === 'all' ? '' : v)}>
                    <SelectTrigger className="w-full border-border/80">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Partial">Partial</SelectItem>
                      <SelectItem value="Received">Received</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  <Label className="text-xs font-medium text-gray-500">Date From</Label>
                  <Input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className="border-border/80" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Date To</Label>
                  <Input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className="border-border/80" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ─── PO List Table ──────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">PO Number</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Date</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Supplier</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Items</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Total</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Status</th>
                  <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={7} className="p-4 text-center text-gray-400 animate-pulse">Loading purchase orders...</td>
                    </tr>
                  ))
                ) : purchaseOrders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <ClipboardList className="w-10 h-10 opacity-40" />
                        <p className="text-sm font-medium">No purchase orders found</p>
                        <p className="text-xs">Create your first purchase order to get started</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  purchaseOrders.map((po) => (
                    <tr key={po.id} className="border-b border-border/50 hover:bg-gray-50/50 transition-colors">
                      <td className="p-3">
                        <span className="text-sm font-semibold text-teal-700">{po.poNumber}</span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">{fmtDate(po.date)}</td>
                      <td className="p-3">
                        <span className="text-sm text-gray-700">{po.supplier?.name || '—'}</span>
                        {po.expectedDate && (
                          <p className="text-xs text-gray-400">Exp: {fmtDate(po.expectedDate)}</p>
                        )}
                      </td>
                      <td className="p-3 text-sm text-gray-600 text-center">{po.items?.length || 0}</td>
                      <td className="p-3 text-sm font-semibold text-gray-900 text-right">{fmt(po.grandTotal)}</td>
                      <td className="p-3"><POStatusBadge status={po.status} /></td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-gray-600 hover:text-gray-900" onClick={() => openDetail(po)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {po.status === 'Draft' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => { setSelectedPO(po); resetCreateForm(); /* open edit */ }}>
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {(po.status === 'Draft' || po.status === 'Sent') && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-teal-600 hover:text-teal-700 hover:bg-teal-50" onClick={() => openConvertDialog(po)}>
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {po.status === 'Draft' && (
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => { setSelectedPO(po); setCancelConfirmOpen(true); }}>
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && purchaseOrders.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50/80 border-t border-border">
                    <td colSpan={4} className="p-3 text-sm font-semibold text-gray-700 text-right">Total</td>
                    <td className="p-3 text-sm font-bold text-gray-900 text-right">
                      {fmt(purchaseOrders.reduce((a, p) => a + p.grandTotal, 0))}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          DIALOGS
         ═══════════════════════════════════════════════════════════════ */}

      {/* ─── Create/Edit PO Dialog ───────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) resetCreateForm(); setCreateOpen(open); }}>
        <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-teal-600" />
              Create New Purchase Order
            </DialogTitle>
            <DialogDescription>Add items to your purchase order and send to supplier</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Supplier + Expected Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={createExpectedDate}
                  onChange={(e) => setCreateExpectedDate(e.target.value)}
                  className="border-border/80"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Add any notes or special instructions..."
                className="border-border/80 min-h-[60px]"
              />
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Order Items *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-teal-600 border-teal-200 hover:bg-teal-50"
                  onClick={() => addItemRow()}
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
                    <table className="text-sm w-full" style={{ tableLayout: 'fixed', minWidth: '820px' }}>
                      <thead>
                        <tr className="bg-gray-50 border-b border-border">
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '26%' }}>Medicine</th>
                          <th className="text-center text-xs font-medium text-gray-500 p-3" style={{ width: '10%' }}>Qty</th>
                          <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '12%' }}>Unit</th>
                          <th className="text-right text-xs font-medium text-gray-500 p-3" style={{ width: '14%' }}>Rate (₹)</th>
                          <th className="text-right text-xs font-medium text-gray-500 p-3" style={{ width: '10%' }}>GST %</th>
                          <th className="text-right text-xs font-medium text-gray-500 p-3" style={{ width: '14%' }}>Amount</th>
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
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 transition-colors border-b border-border/30 last:border-0"
                                          onClick={() => selectMedicineForItem(idx, med)}
                                        >
                                          <p className="font-medium text-gray-900">{med.name}</p>
                                          {med.genericName && <p className="text-gray-400">{med.genericName}</p>}
                                          {med.purchaseRate != null && <p className="text-teal-600">₹{med.purchaseRate.toFixed(2)}</p>}
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
                                className="h-10 text-sm text-center border-border/80 w-full"
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
                            {/* GST % */}
                            <td className="p-2.5">
                              <Input
                                type="number"
                                step="0.5"
                                min={0}
                                max={28}
                                value={item.gstPercent || ''}
                                onChange={(e) => updateItem(idx, { gstPercent: parseFloat(e.target.value) || 0 })}
                                className="h-10 text-sm text-right border-border/80 w-full"
                                placeholder="12"
                              />
                            </td>
                            {/* Line Total */}
                            <td className="p-2.5 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {(() => {
                                const med = medicines.find(m => m.id === item.medicineId);
                                let qtySmallest = item.quantity;
                                if (item.unitType === 'strip' && med) qtySmallest = item.quantity * (med.unitsPerStrip || 10);
                                else if (item.unitType === 'box' && med) qtySmallest = item.quantity * (med.stripsPerBox || 10) * (med.unitsPerStrip || 10);
                                return fmt(qtySmallest * item.purchaseRate);
                              })()}
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

            {/* Totals */}
            {createItems.length > 0 && (
              <Card className="bg-teal-50/60 border-teal-200/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <IndianRupee className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-semibold text-teal-800">Order Summary</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal ({createItems.length} items)</span>
                      <span className="font-medium text-gray-900">{fmt(createTotals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">GST</span>
                      <span className="text-gray-700">{fmt(createTotals.totalGst)}</span>
                    </div>
                    <div className="border-t border-teal-200 pt-2 flex justify-between">
                      <span className="text-sm font-bold text-teal-800">Grand Total</span>
                      <span className="text-lg font-bold text-teal-700">{fmt(createTotals.grandTotal)}</span>
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
                variant="outline"
                className="border-teal-200 text-teal-700 hover:bg-teal-50"
                onClick={() => handleCreatePO(false)}
                disabled={saving || !createSupplierId || createItems.length === 0}
              >
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                onClick={() => handleCreatePO(true)}
                disabled={saving || sending || !createSupplierId || createItems.length === 0}
              >
                {saving || sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Save & Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── View PO Detail Dialog ───────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-teal-600" />
              Purchase Order Details
            </DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-5 pt-2">
              {detailLoading ? (
                <div className="animate-pulse text-center text-gray-400 py-8">Loading details...</div>
              ) : (
                <>
                  {/* PO Info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">PO Number</p>
                      <p className="text-sm font-bold text-teal-700 mt-0.5">{selectedPO.poNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Supplier</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{selectedPO.supplier?.name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Date</p>
                      <p className="text-sm text-gray-900 mt-0.5 flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                        {fmtDate(selectedPO.date)}
                      </p>
                    </div>
                    {selectedPO.expectedDate && (
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Expected Delivery</p>
                        <p className="text-sm text-gray-900 mt-0.5">{fmtDate(selectedPO.expectedDate)}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Status</p>
                      <div className="mt-0.5"><POStatusBadge status={selectedPO.status} /></div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Created By</p>
                      <p className="text-sm text-gray-900 mt-0.5">{selectedPO.user?.name || '—'}</p>
                    </div>
                  </div>

                  {/* Status Timeline */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 mb-1">Status Timeline</p>
                    <StatusTimeline status={selectedPO.status} />
                  </div>

                  {/* Linked GRNs */}
                  {selectedPO.purchases && selectedPO.purchases.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                        <ArrowRightLeft className="w-4 h-4 text-teal-600" />
                        Goods Receipt Notes ({selectedPO.purchases.length})
                      </h3>
                      <div className="space-y-2">
                        {selectedPO.purchases.map(grn => (
                          <div key={grn.id} className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{grn.invoiceNo}</p>
                                <p className="text-xs text-gray-500">{fmtDate(grn.date)}</p>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-emerald-700">{fmt(grn.grandTotal)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items Table */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-teal-600" />
                      Items ({selectedPO.items?.length || 0})
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
                              <th className="text-center text-xs font-medium text-gray-500 p-2.5">Received</th>
                              <th className="text-right text-xs font-medium text-gray-500 p-2.5">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPO.items?.map((item, idx) => {
                              const med = item.medicine;
                              let qtySmallest = item.quantity;
                              if (item.unitType === 'strip' && med) qtySmallest = item.quantity * med.unitsPerStrip;
                              else if (item.unitType === 'box' && med) qtySmallest = item.quantity * med.stripsPerBox * med.unitsPerStrip;
                              const lineBase = qtySmallest * (item.purchaseRate || 0);
                              const allReceived = item.receivedQty >= item.quantity;
                              return (
                                <tr key={item.id} className="border-b border-border/50 last:border-b-0">
                                  <td className="p-2.5 text-xs text-gray-400">{idx + 1}</td>
                                  <td className="p-2.5">
                                    <p className="text-sm font-medium text-gray-900">{item.medicineName || med?.name}</p>
                                    {med?.genericName && <p className="text-xs text-gray-400">{med.genericName}</p>}
                                  </td>
                                  <td className="p-2.5 text-sm text-gray-700 text-center">{item.quantity}</td>
                                  <td className="p-2.5 text-xs text-gray-500 capitalize">{item.unitType}</td>
                                  <td className="p-2.5 text-sm text-gray-700 text-right">{fmt(item.purchaseRate || 0)}</td>
                                  <td className="p-2.5 text-center">
                                    {allReceived ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        {item.receivedQty}/{item.quantity}
                                      </Badge>
                                    )}
                                  </td>
                                  <td className="p-2.5 text-sm font-semibold text-gray-900 text-right">{fmt(lineBase)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 border-t border-border">
                              <td colSpan={6} className="p-2.5 text-sm font-semibold text-gray-700 text-right">Subtotal</td>
                              <td className="p-2.5 text-sm font-semibold text-gray-700 text-right">{fmt(selectedPO.subtotal)}</td>
                            </tr>
                            <tr className="bg-gray-50 border-t border-border/50">
                              <td colSpan={6} className="p-2.5 text-sm text-gray-600 text-right">GST</td>
                              <td className="p-2.5 text-sm text-gray-600 text-right">{fmt(selectedPO.totalGst)}</td>
                            </tr>
                            <tr className="bg-gray-50 border-t border-border/50">
                              <td colSpan={6} className="p-2.5 text-sm font-bold text-teal-700 text-right">Grand Total</td>
                              <td className="p-2.5 text-sm font-bold text-teal-700 text-right">{fmt(selectedPO.grandTotal)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedPO.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">Notes</p>
                      <p className="text-sm text-gray-700 mt-1 bg-gray-50 rounded p-3">{selectedPO.notes}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {(selectedPO.status === 'Draft' || selectedPO.status === 'Sent') && (
                    <div className="flex justify-end gap-3 pt-2 border-t border-border">
                      <Button
                        className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                        onClick={() => openConvertDialog(selectedPO)}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                        Convert to GRN
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Convert to GRN Dialog ───────────────────────────────── */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-teal-600" />
              Convert to Goods Receipt Note
            </DialogTitle>
            <DialogDescription>
              {selectedPO && `For PO: ${selectedPO.poNumber} — Enter received quantities, batch details and expiry dates`}
            </DialogDescription>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-4 bg-teal-50 border border-teal-100 rounded-lg px-4 py-3">
                <div>
                  <p className="text-xs text-teal-600 font-medium">Supplier</p>
                  <p className="text-sm font-semibold text-gray-900">{selectedPO.supplier?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600 font-medium">PO Value</p>
                  <p className="text-sm font-semibold text-gray-900">{fmt(selectedPO.grandTotal)}</p>
                </div>
                <div>
                  <p className="text-xs text-teal-600 font-medium">Items to Receive</p>
                  <p className="text-sm font-semibold text-gray-900">{grnItems.length}</p>
                </div>
              </div>

              {/* GRN Items */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="text-sm w-full" style={{ tableLayout: 'fixed', minWidth: '800px' }}>
                    <thead>
                      <tr className="bg-gray-50 border-b border-border">
                        <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '20%' }}>Medicine</th>
                        <th className="text-center text-xs font-medium text-gray-500 p-3" style={{ width: '12%' }}>Ordered</th>
                        <th className="text-center text-xs font-medium text-gray-500 p-3" style={{ width: '12%' }}>Received</th>
                        <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '18%' }}>Batch No *</th>
                        <th className="text-left text-xs font-medium text-gray-500 p-3" style={{ width: '18%' }}>Expiry Date *</th>
                        <th className="text-right text-xs font-medium text-gray-500 p-3" style={{ width: '14%' }}>Rate (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grnItems.map((item, idx) => (
                        <tr key={item.poItemId} className="border-b border-border/50 last:border-b-0">
                          <td className="p-2.5 text-sm font-medium text-gray-900">{item.medicineName}</td>
                          <td className="p-2.5 text-sm text-gray-500 text-center">{item.orderedQty} {item.unitType}(s)</td>
                          <td className="p-2.5">
                            <Input
                              type="number"
                              min={1}
                              max={item.remainingQty}
                              value={item.receivedQty || ''}
                              onChange={(e) => updateGRNItem(idx, { receivedQty: parseInt(e.target.value) || 0 })}
                              className="h-10 text-sm text-center border-border/80 w-full"
                            />
                            {item.remainingQty < item.orderedQty && (
                              <p className="text-[10px] text-amber-600 mt-0.5">Max: {item.remainingQty}</p>
                            )}
                          </td>
                          <td className="p-2.5">
                            <Input
                              value={item.batchNo}
                              onChange={(e) => updateGRNItem(idx, { batchNo: e.target.value })}
                              className="h-10 text-sm border-border/80 w-full"
                              placeholder="e.g. B2024001"
                            />
                          </td>
                          <td className="p-2.5">
                            <Input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => updateGRNItem(idx, { expiryDate: e.target.value })}
                              className="h-10 text-sm border-border/80 w-full"
                            />
                          </td>
                          <td className="p-2.5">
                            <Input
                              type="number"
                              step="0.01"
                              min={0}
                              value={item.purchaseRate || ''}
                              onChange={(e) => updateGRNItem(idx, { purchaseRate: parseFloat(e.target.value) || 0 })}
                              className="h-10 text-sm text-right border-border/80 w-full"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* GRN Summary */}
              <Card className="bg-teal-50/60 border-teal-200/60">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="w-4 h-4 text-teal-600" />
                    <span className="text-sm font-semibold text-teal-800">GRN Summary</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items</span>
                      <span className="font-medium">{grnItems.filter(i => i.receivedQty > 0).length} of {grnItems.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Value</span>
                      <span className="font-medium">{fmt(grnItems.reduce((a, i) => a + (i.receivedQty * i.purchaseRate), 0))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setConvertOpen(false)}>Cancel</Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                  onClick={handleConvertToGRN}
                  disabled={converting || grnItems.length === 0 || grnItems.some(i => !i.batchNo || !i.expiryDate || i.receivedQty <= 0)}
                >
                  {converting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Create GRN & Update Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Auto Purchase Suggestions Dialog ────────────────────── */}
      <Dialog open={autoSuggestOpen} onOpenChange={setAutoSuggestOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              Auto Purchase Suggestions
            </DialogTitle>
            <DialogDescription>Medicines below reorder level that may need restocking</DialogDescription>
          </DialogHeader>

          {suggestLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="ml-2 text-sm text-gray-500">Analyzing stock levels...</span>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">All medicines are above reorder level</p>
              <p className="text-xs mt-1">No purchase suggestions at this time</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-amber-50 border-amber-100">
                  <CardContent className="p-3 text-center">
                    <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-700">{suggestSummary.totalBelowReorder}</p>
                    <p className="text-xs text-amber-600">Below Reorder</p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-100">
                  <CardContent className="p-3 text-center">
                    <Package className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-red-700">{suggestSummary.totalShortage}</p>
                    <p className="text-xs text-red-600">Total Shortage</p>
                  </CardContent>
                </Card>
                <Card className="bg-teal-50 border-teal-100">
                  <CardContent className="p-3 text-center">
                    <IndianRupee className="w-5 h-5 text-teal-600 mx-auto mb-1" />
                    <p className="text-lg font-bold text-teal-700">{fmt(suggestSummary.estimatedValue)}</p>
                    <p className="text-xs text-teal-600">Est. Value</p>
                  </CardContent>
                </Card>
              </div>

              {/* Suggestions Table */}
              <div className="border border-border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50 z-10">
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-gray-500 p-2.5">Medicine</th>
                        <th className="text-center text-xs font-medium text-gray-500 p-2.5">Current Stock</th>
                        <th className="text-center text-xs font-medium text-gray-500 p-2.5">Reorder Level</th>
                        <th className="text-center text-xs font-medium text-gray-500 p-2.5">Shortage</th>
                        <th className="text-center text-xs font-medium text-gray-500 p-2.5">Suggested Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map((s) => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-gray-50/50 last:border-b-0">
                          <td className="p-2.5">
                            <p className="text-sm font-medium text-gray-900">{s.name}</p>
                            {s.genericName && <p className="text-xs text-gray-400">{s.genericName}</p>}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`text-sm font-semibold ${s.currentStock === 0 ? 'text-red-600' : 'text-gray-700'}`}>
                              {s.currentStock}
                            </span>
                          </td>
                          <td className="p-2.5 text-center text-sm text-gray-600">{s.reorderLevel}</td>
                          <td className="p-2.5 text-center">
                            <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs font-medium">
                              -{s.shortage}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-center text-sm font-semibold text-teal-700">
                            {s.suggestedOrderQty} {s.baseUnit}(s)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action */}
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAutoSuggestOpen(false)}>Close</Button>
                <Button
                  className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                  onClick={createPOFromSuggestions}
                >
                  <Plus className="w-4 h-4" />
                  Create PO from Suggestions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Cancel Confirm Dialog ───────────────────────────────── */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel PO <span className="font-semibold text-gray-900">{selectedPO?.poNumber}</span>?
              This action cannot be undone. Only Draft purchase orders can be cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep PO</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancelPO}
            >
              Cancel PO
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
