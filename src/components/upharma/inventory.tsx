'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  AlertTriangle,
  Search,
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  Clock,
  XCircle,
  ArrowUpDown,
  ChevronDown,
  Loader2,
  IndianRupee,
  Warehouse,
  Pill,
  Truck,
  CalendarClock,
  MinusCircle,
  PlusCircle,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────

interface Medicine {
  id: string;
  name: string;
  genericName: string;
  baseUnit: string;
  unitsPerStrip: number;
  stripsPerBox: number;
  reorderLevel?: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
  stockQty: number;
  initialStock: number;
  supplierId: string;
  purchaseDate: string;
  medicine: Medicine;
  supplier: Supplier;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function daysUntilExpiry(expiryDate: string): number {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getExpiryBadge(days: number): { variant: 'destructive' | 'secondary' | 'outline' | 'default'; label: string; className: string } {
  if (days <= 0) return { variant: 'destructive', label: 'Expired', className: 'bg-red-600 text-white hover:bg-red-600' };
  if (days <= 30) return { variant: 'destructive', label: `${days}d left`, className: 'bg-red-600 text-white hover:bg-red-600' };
  if (days <= 90) return { variant: 'secondary', label: `${days}d left`, className: 'bg-orange-500 text-white hover:bg-orange-500' };
  if (days <= 180) return { variant: 'secondary', label: `${days}d left`, className: 'bg-yellow-500 text-white hover:bg-yellow-500' };
  return { variant: 'outline', label: `${days}d left`, className: 'text-muted-foreground' };
}

function getStockColor(qty: number, reorderLevel?: number): string {
  if (qty === 0) return 'text-red-600 font-bold';
  if (reorderLevel !== undefined && qty <= reorderLevel) return 'text-orange-600 font-semibold';
  return 'text-emerald-700 font-medium';
}

// ─── Component ────────────────────────────────────────────────────────

export function InventoryPage() {
  // Data states
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string>('all');
  const [expiryFilter, setExpiryFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Sort
  const [sortField, setSortField] = useState<'medicineName' | 'batchNo' | 'expiryDate' | 'stockQty' | 'purchaseDate'>('expiryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const emptyForm = {
    medicineId: '',
    batchNo: '',
    expiryDate: '',
    purchaseRate: '',
    saleRate: '',
    mrp: '',
    stockQty: '',
    supplierId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
  };

  const [form, setForm] = useState(emptyForm);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [inlineAdjustBatchId, setInlineAdjustBatchId] = useState<string | null>(null);
  const { toast } = useToast();

  // ─── Data Fetching ────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [batchesRes, medicinesRes, suppliersRes] = await Promise.all([
        fetch('/api/batches'),
        fetch('/api/medicines'),
        fetch('/api/suppliers'),
      ]);

      if (!batchesRes.ok || !medicinesRes.ok || !suppliersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const batchesData = await batchesRes.json();
      const medicinesData = await medicinesRes.json();
      const suppliersData = await suppliersRes.json();

      setBatches(Array.isArray(batchesData) ? batchesData : batchesData.data || batchesData.batches || []);
      setMedicines(Array.isArray(medicinesData) ? medicinesData : medicinesData.data || medicinesData.medicines || []);
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : suppliersData.data || suppliersData.suppliers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Computed Stats ───────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalItems = new Set(batches.map((b) => b.medicineId)).size;
    const totalUnits = batches.reduce((sum, b) => sum + b.stockQty, 0);
    const lowStockBatches = batches.filter(
      (b) => b.medicine?.reorderLevel !== undefined && b.stockQty <= b.medicine.reorderLevel
    );
    const lowStockItems = new Set(lowStockBatches.map((b) => b.medicineId)).size;
    const expiringSoon = batches.filter(
      (b) => {
        const days = daysUntilExpiry(b.expiryDate);
        return days > 0 && days <= 90;
      }
    );
    const expired = batches.filter((b) => daysUntilExpiry(b.expiryDate) <= 0);
    const totalStockValue = batches.reduce((sum, b) => sum + b.stockQty * b.purchaseRate, 0);

    return {
      totalItems,
      totalUnits,
      lowStockItems,
      lowStockBatches,
      expiringSoonCount: expiringSoon.length,
      expiredCount: expired.length,
      expired,
      expiringSoon,
      lowStockBatches: lowStockBatches,
      totalStockValue,
    };
  }, [batches]);

  // ─── Filtered & Sorted Data ──────────────────────────────────────

  const filteredBatches = useMemo(() => {
    let result = [...batches];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          b.medicine?.name?.toLowerCase().includes(q) ||
          b.medicine?.genericName?.toLowerCase().includes(q) ||
          b.batchNo?.toLowerCase().includes(q) ||
          b.supplier?.name?.toLowerCase().includes(q)
      );
    }

    // Supplier filter
    if (supplierFilter !== 'all') {
      result = result.filter((b) => b.supplierId === supplierFilter);
    }

    // Expiry filter
    if (expiryFilter !== 'all') {
      result = result.filter((b) => {
        const days = daysUntilExpiry(b.expiryDate);
        switch (expiryFilter) {
          case 'expired': return days <= 0;
          case '30days': return days > 0 && days <= 30;
          case '90days': return days > 0 && days <= 90;
          case '180days': return days > 0 && days <= 180;
          case 'safe': return days > 180;
          default: return true;
        }
      });
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'medicineName':
          cmp = (a.medicine?.name || '').localeCompare(b.medicine?.name || '');
          break;
        case 'batchNo':
          cmp = (a.batchNo || '').localeCompare(b.batchNo || '');
          break;
        case 'expiryDate':
          cmp = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          break;
        case 'stockQty':
          cmp = a.stockQty - b.stockQty;
          break;
        case 'purchaseDate':
          cmp = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [batches, searchQuery, supplierFilter, expiryFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredBatches.length / itemsPerPage);
  const paginatedBatches = filteredBatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  // ─── Form Handlers ───────────────────────────────────────────────

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
  };

  const openEditDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setForm({
      medicineId: batch.medicineId,
      batchNo: batch.batchNo,
      expiryDate: batch.expiryDate ? batch.expiryDate.split('T')[0] : '',
      purchaseRate: String(batch.purchaseRate),
      saleRate: String(batch.saleRate),
      mrp: String(batch.mrp),
      stockQty: String(batch.stockQty),
      supplierId: batch.supplierId,
      purchaseDate: batch.purchaseDate ? batch.purchaseDate.split('T')[0] : '',
    });
    setShowEditDialog(true);
  };

  const openAdjustDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setAdjustType('add');
    setAdjustQty('');
    setAdjustReason('');
    setInlineAdjustBatchId(batch.id);
    setShowAdjustDialog(false); // Don't open dialog anymore — use inline
  };

  const cancelInlineAdjust = () => {
    setInlineAdjustBatchId(null);
    setAdjustQty('');
    setAdjustReason('');
    setSelectedBatch(null);
  };

  const openDeleteDialog = (batch: Batch) => {
    setSelectedBatch(batch);
    setShowDeleteDialog(true);
  };

  const handleSubmitBatch = async (isEdit: boolean) => {
    try {
      setSubmitting(true);

      const payload = {
        medicineId: form.medicineId,
        batchNo: form.batchNo,
        expiryDate: form.expiryDate,
        purchaseRate: parseFloat(form.purchaseRate) || 0,
        saleRate: parseFloat(form.saleRate) || 0,
        mrp: parseFloat(form.mrp) || 0,
        stockQty: parseInt(form.stockQty) || 0,
        supplierId: form.supplierId,
        purchaseDate: form.purchaseDate,
      };

      if (isEdit && selectedBatch) {
        const res = await fetch(`/api/batches?id=${selectedBatch.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update batch');
      } else {
        const res = await fetch('/api/batches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create batch');
      }

      setShowAddDialog(false);
      setShowEditDialog(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedBatch) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/batches?id=${selectedBatch.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete batch');
      setShowDeleteDialog(false);
      setSelectedBatch(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStockAdjust = async () => {
    if (!selectedBatch || !adjustQty) return;
    try {
      setSubmitting(true);
      const qty = parseInt(adjustQty) || 0;
      const newQty = adjustType === 'add'
        ? selectedBatch.stockQty + qty
        : Math.max(0, selectedBatch.stockQty - qty);

      const res = await fetch(`/api/batches?id=${selectedBatch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stockQty: newQty }),
      });
      if (!res.ok) throw new Error('Failed to adjust stock');
      setInlineAdjustBatchId(null);
      setAdjustQty('');
      setAdjustReason('');
      setSelectedBatch(null);
      toast({
        title: 'Stock Adjusted',
        description: `${selectedBatch.medicine?.name} stock updated to ${newQty} units.`,
      });
      fetchData();
    } catch (err) {
      toast({
        title: 'Adjustment Failed',
        description: err instanceof Error ? err.message : 'Could not adjust stock.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Search medicine helper for form ─────────────────────────────

  const [medicineSearch, setMedicineSearch] = useState('');
  const filteredMedicines = useMemo(() => {
    if (!medicineSearch.trim()) return medicines;
    const q = medicineSearch.toLowerCase();
    return medicines.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) ||
        m.genericName?.toLowerCase().includes(q)
    );
  }, [medicines, medicineSearch]);

  // ─── Loading State ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-full flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
          <p className="text-muted-foreground text-lg">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  if (error && batches.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-full flex items-center justify-center min-h-[60vh]">
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex flex-col items-center gap-4 p-8">
            <XCircle className="h-10 w-10 text-red-500" />
            <p className="text-red-700 dark:text-red-400 text-lg">Failed to load inventory</p>
            <p className="text-red-500 text-sm">{error}</p>
            <Button variant="outline" onClick={fetchData}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Warehouse className="h-7 w-7 text-emerald-600" />
            Inventory Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Track stock levels, batches, expiry dates & supplier information
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Batch
        </Button>
      </div>

      {/* ── Stats Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalItems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Package className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.totalUnits.toLocaleString()} total units in stock
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Stock Value</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalStockValue)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on purchase rates
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Stock Alerts</p>
                <p className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.lowStockBatches.length} batch{stats.lowStockBatches.length !== 1 ? 'es' : ''} at or below reorder level
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.expiredCount > 0 && (
                    <span className="text-xs align-top font-medium mr-1">
                      {stats.expiredCount} exp
                    </span>
                  )}
                  {stats.expiringSoonCount}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.expiredCount} expired, {stats.expiringSoonCount} within 90 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Content Tabs ────────────────────────────────────── */}
      <Tabs defaultValue="all-stock" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <TabsList className="grid w-full sm:w-auto grid-cols-4 sm:inline-grid">
            <TabsTrigger value="all-stock" className="text-sm">
              <Package className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              All Stock
            </TabsTrigger>
            <TabsTrigger value="expiry-alerts" className="text-sm">
              <CalendarClock className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Expiry
              {(stats.expiredCount + stats.expiringSoonCount) > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {stats.expiredCount + stats.expiringSoonCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low-stock" className="text-sm">
              <TrendingDown className="h-4 w-4 mr-1.5 hidden sm:inline-block" />
              Low Stock
              {stats.lowStockItems > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-[10px]">
                  {stats.lowStockItems}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Tab: All Stock ───────────────────────────────────── */}
        <TabsContent value="all-stock" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by medicine, batch, supplier..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                  />
                </div>
                <Select
                  value={supplierFilter}
                  onValueChange={(val) => {
                    setSupplierFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={expiryFilter}
                  onValueChange={(val) => {
                    setExpiryFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Expiry Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Expiry Status</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="30days">Within 30 days</SelectItem>
                    <SelectItem value="90days">Within 90 days</SelectItem>
                    <SelectItem value="180days">Within 180 days</SelectItem>
                    <SelectItem value="safe">Safe (180d+)</SelectItem>
                  </SelectContent>
                </Select>
                {(searchQuery || supplierFilter !== 'all' || expiryFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSupplierFilter('all');
                      setExpiryFilter('all');
                      setCurrentPage(1);
                    }}
                    className="text-muted-foreground"
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Batch Table */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Batch Inventory</CardTitle>
                  <CardDescription>
                    Showing {filteredBatches.length} batch{filteredBatches.length !== 1 ? 'es' : ''}
                    {filteredBatches.length !== batches.length && ` (filtered from ${batches.length})`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('medicineName')}>
                          Medicine
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[120px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('batchNo')}>
                          Batch No
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[120px]">Supplier</TableHead>
                      <TableHead className="min-w-[100px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('purchaseDate')}>
                          Purchased
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[110px]">
                        <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort('expiryDate')}>
                          Expiry
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[90px] text-right">
                        <button className="flex items-center gap-1 ml-auto hover:text-foreground transition-colors" onClick={() => handleSort('stockQty')}>
                          Stock
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="min-w-[90px] text-right">Pur. Rate</TableHead>
                      <TableHead className="min-w-[90px] text-right">Sale Rate</TableHead>
                      <TableHead className="min-w-[80px] text-right">MRP</TableHead>
                      <TableHead className="min-w-[100px] text-right">Stock Value</TableHead>
                      <TableHead className="sticky right-0 bg-background z-10 min-w-[120px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBatches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="h-32 text-center text-muted-foreground">
                          {searchQuery || supplierFilter !== 'all' || expiryFilter !== 'all'
                            ? 'No batches match your filters'
                            : 'No batches found. Add your first batch to get started.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedBatches.map((batch) => {
                        const days = daysUntilExpiry(batch.expiryDate);
                        const expiryBadge = getExpiryBadge(days);
                        return (
                          <React.Fragment key={batch.id}>
                          <TableRow
                            className={days <= 0 ? 'bg-red-50/50 dark:bg-red-950/20' : days <= 90 ? 'bg-orange-50/30 dark:bg-orange-950/10' : ''}
                          >
                            <TableCell className="sticky left-0 bg-inherit z-10">
                              <div className="font-medium text-foreground">{batch.medicine?.name}</div>
                              <div className="text-xs text-muted-foreground">{batch.medicine?.genericName}</div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                            <TableCell className="text-sm">{batch.supplier?.name || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(batch.purchaseDate)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">{formatDate(batch.expiryDate)}</span>
                                <Badge
                                  variant={expiryBadge.variant}
                                  className={`${expiryBadge.className} text-[10px] px-1.5 py-0 h-5 w-fit`}
                                >
                                  {expiryBadge.label}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-semibold ${getStockColor(batch.stockQty, batch.medicine?.reorderLevel)}`}>
                              {batch.stockQty}
                              <span className="text-xs font-normal text-muted-foreground ml-1">
                                {batch.medicine?.baseUnit}
                              </span>
                              {batch.stockQty === 0 && (
                                <div className="text-[10px] text-red-500 font-medium">OUT OF STOCK</div>
                              )}
                              {batch.medicine?.reorderLevel !== undefined && batch.stockQty > 0 && batch.stockQty <= batch.medicine.reorderLevel && (
                                <div className="text-[10px] text-orange-500 font-medium">LOW STOCK</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(batch.purchaseRate)}</TableCell>
                            <TableCell className="text-right text-sm">{formatCurrency(batch.saleRate)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatCurrency(batch.mrp)}</TableCell>
                            <TableCell className="text-right text-sm font-medium text-emerald-700">
                              {formatCurrency(batch.stockQty * batch.purchaseRate)}
                            </TableCell>
                            <TableCell className="sticky right-0 bg-inherit z-10">
                              <div className="flex items-center justify-center gap-1">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openEditDialog(batch)}>
                                      <Pencil className="h-4 w-4 mr-2" />
                                      Edit Batch
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => openAdjustDialog(batch)}>
                                      <PlusCircle className="h-4 w-4 mr-2" />
                                      Adjust Stock
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openDeleteDialog(batch)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete Batch
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* ── Inline Stock Adjustment Row ── */}
                          {inlineAdjustBatchId === batch.id && (
                            <TableRow key={`adjust-${batch.id}`} className="bg-emerald-50/70">
                              <TableCell colSpan={11} className="p-3">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <PlusCircle className="h-4 w-4 text-emerald-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-emerald-800">
                                      Adjust Stock: {batch.medicine?.name}
                                      <span className="text-xs font-normal text-gray-500 ml-1">(Batch: {batch.batchNo})</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      Current stock: <span className="font-semibold text-gray-700">{batch.stockQty}</span> {batch.medicine?.baseUnit}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-3 items-end pl-10">
                                  {/* Adjustment Type */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600">Type</Label>
                                    <div className="flex gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={adjustType === 'add' ? 'default' : 'outline'}
                                        className={adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3' : 'h-8 text-xs px-3'}
                                        onClick={() => setAdjustType('add')}
                                      >
                                        <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant={adjustType === 'subtract' ? 'default' : 'outline'}
                                        className={adjustType === 'subtract' ? 'bg-red-600 hover:bg-red-700 text-white h-8 text-xs px-3' : 'h-8 text-xs px-3'}
                                        onClick={() => setAdjustType('subtract')}
                                      >
                                        <MinusCircle className="h-3.5 w-3.5 mr-1" /> Remove
                                      </Button>
                                    </div>
                                  </div>
                                  {/* Quantity */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600">Quantity</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="Qty"
                                      className="h-8 text-sm w-24"
                                      value={adjustQty}
                                      onChange={(e) => setAdjustQty(e.target.value)}
                                      autoFocus
                                      onKeyDown={(e) => { if (e.key === 'Enter') handleStockAdjust(); }}
                                    />
                                  </div>
                                  {/* New stock preview */}
                                  {adjustQty && (
                                    <div className="text-xs text-muted-foreground pb-5">
                                      → <span className="font-semibold text-foreground">{adjustType === 'add'
                                        ? batch.stockQty + (parseInt(adjustQty) || 0)
                                        : Math.max(0, batch.stockQty - (parseInt(adjustQty) || 0))
                                      }</span> {batch.medicine?.baseUnit}
                                    </div>
                                  )}
                                  {/* Reason */}
                                  <div className="space-y-1.5">
                                    <Label className="text-xs text-gray-600">Reason</Label>
                                    <Select value={adjustReason} onValueChange={(v) => setAdjustReason(v)}>
                                      <SelectTrigger className="h-8 text-xs w-[140px]">
                                        <SelectValue placeholder="Select..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="damaged">Damaged</SelectItem>
                                        <SelectItem value="expired">Expired</SelectItem>
                                        <SelectItem value="count_correction">Count Correction</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {/* Actions */}
                                  <div className="flex gap-2 pb-5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs px-3"
                                      onClick={cancelInlineAdjust}
                                    >
                                      <X className="w-3 h-3 mr-1" /> Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className={`h-8 text-xs px-3 text-white ${adjustType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                                      onClick={handleStockAdjust}
                                      disabled={submitting || !adjustQty || (parseInt(adjustQty) || 0) <= 0}
                                    >
                                      {submitting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                      {adjustType === 'add' ? 'Apply' : 'Remove'}
                                    </Button>
                                  </div>
                                </div>
                              </TableCell>
                          </TableRow>
                          )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages} ({filteredBatches.length} items)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let page: number;
                        if (totalPages <= 5) {
                          page = i + 1;
                        } else if (currentPage <= 3) {
                          page = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          page = totalPages - 4 + i;
                        } else {
                          page = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Expiry Alerts ────────────────────────────────── */}
        <TabsContent value="expiry-alerts" className="space-y-4">
          {/* Expired */}
          {stats.expired.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Expired Batches ({stats.expired.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Stock Qty</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.expired.map((batch) => (
                      <TableRow key={batch.id} className="bg-red-50/50 dark:bg-red-950/20">
                        <TableCell>
                          <div className="font-medium">{batch.medicine?.name}</div>
                          <div className="text-xs text-muted-foreground">{batch.supplier?.name}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(batch.expiryDate)}</div>
                          <Badge className="bg-red-600 text-white hover:bg-red-600 text-[10px] px-1.5 py-0 h-5 mt-1">
                            EXPIRED
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${batch.stockQty === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                          {batch.stockQty} {batch.medicine?.baseUnit}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCurrency(batch.stockQty * batch.purchaseRate)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditDialog(batch)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => openDeleteDialog(batch)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Expiring within 90 days */}
          {stats.expiringSoon.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-600 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Expiring Within 90 Days ({stats.expiringSoon.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-right">Stock Qty</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.expiringSoon.map((batch) => {
                      const days = daysUntilExpiry(batch.expiryDate);
                      return (
                        <TableRow key={batch.id} className={days <= 30 ? 'bg-red-50/30 dark:bg-red-950/10' : 'bg-orange-50/30 dark:bg-orange-950/10'}>
                          <TableCell>
                            <div className="font-medium">{batch.medicine?.name}</div>
                            <div className="text-xs text-muted-foreground">{batch.supplier?.name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(batch.expiryDate)}</div>
                            <Badge
                              className={`${days <= 30 ? 'bg-red-600 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-500'} text-white text-[10px] px-1.5 py-0 h-5 mt-1`}
                            >
                              {days} days left
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{batch.stockQty} {batch.medicine?.baseUnit}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(batch.stockQty * batch.purchaseRate)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEditDialog(batch)}>
                                <Pencil className="h-3.5 w-3.5 mr-1" />
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openAdjustDialog(batch)}>
                                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                                Stock
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {stats.expired.length === 0 && stats.expiringSoon.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-emerald-600 mb-3" />
                <p className="text-lg font-medium text-foreground">All Clear!</p>
                <p className="text-muted-foreground text-sm mt-1">No expired or soon-to-expire batches found.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Low Stock ────────────────────────────────────── */}
        <TabsContent value="low-stock" className="space-y-4">
          {stats.lowStockBatches.length > 0 ? (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-600 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5" />
                  Low Stock Items ({stats.lowStockItems} medicines, {stats.lowStockBatches.length} batches)
                </CardTitle>
                <CardDescription>
                  Items at or below their reorder level
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Medicine</TableHead>
                      <TableHead>Batch No</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead className="text-right">Reorder Level</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.lowStockBatches.map((batch) => (
                      <TableRow key={batch.id} className={batch.stockQty === 0 ? 'bg-red-50/50 dark:bg-red-950/20' : 'bg-orange-50/30 dark:bg-orange-950/10'}>
                        <TableCell>
                          <div className="font-medium">{batch.medicine?.name}</div>
                          <div className="text-xs text-muted-foreground">{batch.medicine?.genericName}</div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{batch.batchNo}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${batch.stockQty === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {batch.stockQty}
                          </span>
                          <span className="text-muted-foreground ml-1">{batch.medicine?.baseUnit}</span>
                          {batch.stockQty === 0 && (
                            <Badge className="bg-red-600 text-white hover:bg-red-600 text-[10px] px-1.5 py-0 h-5 ml-2">
                              OUT OF STOCK
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {batch.medicine?.reorderLevel ?? '—'} {batch.medicine?.baseUnit}
                        </TableCell>
                        <TableCell className="text-sm">{batch.supplier?.name || '—'}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => {
                                resetForm();
                                setForm((prev) => ({ ...prev, medicineId: batch.medicineId }));
                                setShowAddDialog(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              New Batch
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openAdjustDialog(batch)}>
                              <PlusCircle className="h-3.5 w-3.5 mr-1" />
                              Restock
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-emerald-600 mb-3" />
                <p className="text-lg font-medium text-foreground">Stock Levels Healthy</p>
                <p className="text-muted-foreground text-sm mt-1">No items are currently below their reorder level.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add / Edit Batch Dialog ───────────────────────────────── */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showEditDialog ? (
                <>
                  <Pencil className="h-5 w-5 text-emerald-600" />
                  Edit Batch
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-emerald-600" />
                  Add New Batch
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog
                ? 'Update batch details below. Changes will be saved immediately.'
                : 'Enter details for the new inventory batch.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Medicine */}
            <div className="grid gap-2">
              <Label htmlFor="medicine">Medicine *</Label>
              <Select value={form.medicineId} onValueChange={(val) => updateForm('medicineId', val)}>
                <SelectTrigger className="w-full">
                  <Pill className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Search & select medicine" />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Search medicine..."
                      value={medicineSearch}
                      onChange={(e) => setMedicineSearch(e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <SelectItem value="all" disabled>
                    — Select Medicine —
                  </SelectItem>
                  {filteredMedicines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{m.genericName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Batch No & Purchase Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="batchNo">Batch Number *</Label>
                <Input
                  id="batchNo"
                  placeholder="e.g., BTH2024001"
                  value={form.batchNo}
                  onChange={(e) => updateForm('batchNo', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={form.purchaseDate}
                  onChange={(e) => updateForm('purchaseDate', e.target.value)}
                />
              </div>
            </div>

            {/* Expiry Date & Supplier */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => updateForm('expiryDate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier">Supplier *</Label>
                <Select value={form.supplierId} onValueChange={(val) => updateForm('supplierId', val)}>
                  <SelectTrigger>
                    <Truck className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="purchaseRate">Purchase Rate (₹) *</Label>
                <Input
                  id="purchaseRate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.purchaseRate}
                  onChange={(e) => updateForm('purchaseRate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="saleRate">Sale Rate (₹) *</Label>
                <Input
                  id="saleRate"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.saleRate}
                  onChange={(e) => updateForm('saleRate', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="mrp">MRP (₹) *</Label>
                <Input
                  id="mrp"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.mrp}
                  onChange={(e) => updateForm('mrp', e.target.value)}
                />
              </div>
            </div>

            {/* Stock Qty */}
            <div className="grid gap-2">
              <Label htmlFor="stockQty">Stock Quantity *</Label>
              <Input
                id="stockQty"
                type="number"
                min="0"
                placeholder="Enter quantity"
                value={form.stockQty}
                onChange={(e) => updateForm('stockQty', e.target.value)}
                className="max-w-[200px]"
              />
              {form.medicineId && (
                <p className="text-xs text-muted-foreground">
                  Unit: {medicines.find((m) => m.id === form.medicineId)?.baseUnit || 'units'}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => handleSubmitBatch(!!showEditDialog)}
              disabled={
                submitting ||
                !form.medicineId ||
                !form.batchNo ||
                !form.expiryDate ||
                !form.supplierId ||
                !form.purchaseRate ||
                !form.saleRate ||
                !form.mrp ||
                !form.stockQty
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {showEditDialog ? 'Update Batch' : 'Create Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────── */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteDialog(false);
          setSelectedBatch(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Batch
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedBatch && (
                <>
                  Are you sure you want to delete batch{' '}
                  <span className="font-semibold text-foreground">{selectedBatch.batchNo}</span>
                  {' '}for{' '}
                  <span className="font-semibold text-foreground">{selectedBatch.medicine?.name}</span>?
                  <br />
                  <br />
                  This will permanently remove {selectedBatch.stockQty} {selectedBatch.medicine?.baseUnit} from inventory records.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
