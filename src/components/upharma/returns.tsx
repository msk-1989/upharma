'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import {
  RotateCcw,
  Plus,
  Eye,
  Search,
  Filter,
  ArrowUpDown,
  ShoppingCart,
  Package,
  IndianRupee,
  CalendarDays,
  AlertCircle,
  User,
  FileText,
  Trash2,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Types
interface ReturnItem {
  id?: string;
  medicineId: string;
  batchId?: string;
  quantity: number;
  unitType: string;
  rate: number;
  total: number;
  reason: string;
  medicine?: { name: string; baseUnit: string };
  batchNo?: string;
}

interface ReturnRecord {
  id: string;
  returnNo: string;
  type: 'SALE_RETURN' | 'PURCHASE_RETURN';
  referenceId: string;
  customerId?: string;
  supplierId?: string;
  totalAmount: number;
  reason: string;
  status: string;
  date?: string;
  createdAt?: string;
  customer?: { name: string; phone: string };
  supplier?: { name: string; phone: string };
  user?: { name: string };
  items: ReturnItem[];
}

interface ReturnStats {
  totalReturns: number;
  totalSaleReturnAmount: number;
  totalPurchaseReturnAmount: number;
}

const statusColors: Record<string, string> = {
  Completed: 'bg-emerald-100 text-emerald-700',
  Processing: 'bg-yellow-100 text-yellow-700',
  Pending: 'bg-gray-100 text-gray-700',
  Cancelled: 'bg-red-100 text-red-700',
  Approved: 'bg-emerald-100 text-emerald-700',
};

function formatCurrency(amount: number) {
  if (amount == null || isNaN(amount)) return '₹0.00';
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getFirstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split('T')[0];
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

// Medicine search component
function MedicineSearchInput({
  onSelect,
  type,
}: {
  onSelect: (med: { id: string; name: string; baseUnit: string; saleRate: number; purchaseRate: number; batches?: { id: string; batchNo: string; stockQty: number; saleRate: number }[] }) => void;
  type: 'SALE_RETURN' | 'PURCHASE_RETURN';
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const searchMedicines = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }
      try {
        const res = await fetch(`/api/medicines?search=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success) {
          setResults(data.data || []);
          setShowResults(true);
        }
      } catch {
        setResults([]);
      }
    },
    []
  );

  useEffect(() => {
    const timeout = setTimeout(() => searchMedicines(query), 300);
    return () => clearTimeout(timeout);
  }, [query, searchMedicines]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <Input
          placeholder="Search medicine by name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border-border/80"
          onFocus={() => results.length > 0 && setShowResults(true)}
        />
      </div>
      {showResults && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((med: any) => (
            <button
              key={med.id}
              className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-sm border-b border-border/50 last:border-0"
              onClick={() => {
                onSelect({
                  id: med.id,
                  name: med.name,
                  baseUnit: med.baseUnit,
                  saleRate: med.saleRate,
                  purchaseRate: med.purchaseRate,
                  batches: med.batches,
                });
                setQuery(med.name);
                setShowResults(false);
              }}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">{med.name}</span>
                <span className="text-xs text-gray-500">
                  {med.totalStock} {med.baseUnit.toLowerCase()}s
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {med.genericName} | {med.manufacturer} | ₹
                {type === 'SALE_RETURN' ? med.saleRate : med.purchaseRate}
              </div>
            </button>
          ))}
        </div>
      )}
      {showResults && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border border-border rounded-lg shadow-lg p-3 text-sm text-gray-500">
          No medicines found
        </div>
      )}
    </div>
  );
}

export function ReturnsPage() {
  const { user } = useAppStore();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [stats, setStats] = useState<ReturnStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getToday());

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<'SALE_RETURN' | 'PURCHASE_RETURN'>('SALE_RETURN');
  const [referenceId, setReferenceId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Detail dialog state
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);

  // Medicine search results
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMedSearch, setShowMedSearch] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== 'ALL') params.set('type', filterType);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const res = await fetch(`/api/returns?${params}`);
      const data = await res.json();
      if (data.success) {
        setReturns(data.data || data.returns || []);
        setStats(data.stats || {
          totalReturns: data.data?.length || 0,
          totalSaleReturnAmount: (data.data || []).filter((r: ReturnRecord) => r.type === 'SALE_RETURN').reduce((sum: number, r: ReturnRecord) => sum + r.totalAmount, 0),
          totalPurchaseReturnAmount: (data.data || []).filter((r: ReturnRecord) => r.type === 'PURCHASE_RETURN').reduce((sum: number, r: ReturnRecord) => sum + r.totalAmount, 0),
        });
      }
    } catch (err) {
      console.error('Failed to fetch returns:', err);
    } finally {
      setLoading(false);
    }
  }, [filterType, dateFrom, dateTo]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleMedicineSelect = (med: any) => {
    const rate = createType === 'SALE_RETURN' ? med.saleRate : med.purchaseRate;
    const newItem: ReturnItem = {
      medicineId: med.id,
      batchId: med.batches?.[0]?.id,
      quantity: 1,
      unitType: med.baseUnit,
      rate,
      total: rate * 1,
      reason: '',
      medicine: { name: med.name, baseUnit: med.baseUnit },
      batchNo: med.batches?.[0]?.batchNo,
    };
    setReturnItems((prev) => [...prev, newItem]);
    setSearchQuery('');
    setShowMedSearch(false);
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
    setReturnItems((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      if (field === 'quantity' || field === 'rate') {
        updated[index].total =
          (Number(updated[index].quantity) || 0) * (Number(updated[index].rate) || 0);
      }
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setReturnItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalReturnAmount = returnItems.reduce((sum, item) => sum + item.total, 0);

  const handleCreateReturn = async () => {
    if (returnItems.length === 0 || !referenceId) return;
    setSaving(true);
    try {
      const body: any = {
        type: createType,
        referenceId,
        userId: user?.id,
        items: returnItems.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitType: item.unitType,
          rate: item.rate,
          reason: item.reason,
        })),
        reason: returnReason,
      };
      if (createType === 'SALE_RETURN' && body.customerId) {
        // customerId optional
      }
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setCreateDialogOpen(false);
        setCreateType('SALE_RETURN');
        setReferenceId('');
        setReturnReason('');
        setReturnItems([]);
        fetchReturns();
      }
    } catch (err) {
      console.error('Failed to create return:', err);
    } finally {
      setSaving(false);
    }
  };

  const openCreateDialog = (type: 'SALE_RETURN' | 'PURCHASE_RETURN') => {
    setCreateType(type);
    setReferenceId('');
    setReturnReason('');
    setReturnItems([]);
    setCreateDialogOpen(true);
  };

  const viewReturnDetail = (ret: ReturnRecord) => {
    setSelectedReturn(ret);
    setDetailDialogOpen(true);
  };

  if (loading && returns.length === 0) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-emerald-600" /> Returns
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage sale and purchase returns
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            onClick={() => openCreateDialog('SALE_RETURN')}
          >
            <ShoppingCart className="w-4 h-4" /> Sale Return
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => openCreateDialog('PURCHASE_RETURN')}
          >
            <Package className="w-4 h-4" /> Purchase Return
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium">
                  Total Returns
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalReturns || returns.length}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium">
                  Sale Returns
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(
                    stats?.totalSaleReturnAmount ??
                      returns
                        .filter((r) => r.type === 'SALE_RETURN')
                        .reduce((sum, r) => sum + r.totalAmount, 0)
                  )}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-500 font-medium">
                  Purchase Returns
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(
                    stats?.totalPurchaseReturnAmount ??
                      returns
                        .filter((r) => r.type === 'PURCHASE_RETURN')
                        .reduce((sum, r) => sum + r.totalAmount, 0)
                  )}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">
                Return Type
              </Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full sm:w-44 border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Returns</SelectItem>
                  <SelectItem value="SALE_RETURN">Sale Returns</SelectItem>
                  <SelectItem value="PURCHASE_RETURN">Purchase Returns</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">
                From Date
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-44 border-border/80"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">
                To Date
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-44 border-border/80"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilterType('ALL');
                setDateFrom(getFirstDayOfMonth());
                setDateTo(getToday());
              }}
              className="h-9 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-gray-900">
            Returns History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Return No
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Reference
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Customer/Supplier
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Items
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Total Amount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Reason
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className="p-4 text-center text-gray-400 animate-pulse">
                        Loading...
                      </td>
                    </tr>
                  ))
                ) : returns.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">
                      <RotateCcw className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      No returns found
                    </td>
                  </tr>
                ) : (
                  returns.map((ret) => (
                    <tr
                      key={ret.id}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-3 text-sm font-medium text-emerald-600">
                        {ret.returnNo}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className={
                            ret.type === 'SALE_RETURN'
                              ? 'text-xs border-orange-200 text-orange-700 bg-orange-50'
                              : 'text-xs border-blue-200 text-blue-700 bg-blue-50'
                          }
                        >
                          {ret.type === 'SALE_RETURN' ? 'Sale Return' : 'Purchase Return'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {ret.referenceId || '-'}
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {ret.customer?.name || ret.supplier?.name || '-'}
                          </p>
                          {ret.supplier?.address && (
                            <p className="text-xs text-gray-500">{ret.supplier.address}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {ret.customer?.phone || ret.supplier?.phone || ''}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-700">
                        {ret.items?.length || 0} item(s)
                      </td>
                      <td className="p-3 text-sm font-medium text-gray-900">
                        {formatCurrency(ret.totalAmount)}
                      </td>
                      <td className="p-3 text-sm text-gray-600 max-w-[100px] sm:max-w-[150px] truncate">
                        {ret.reason || '-'}
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {ret.createdAt ? formatDate(ret.createdAt) : ret.date ? formatDate(ret.date) : '-'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${statusColors[ret.status] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {ret.status}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewReturnDetail(ret)}
                          className="h-8 text-xs gap-1 text-gray-500 hover:text-emerald-600"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-600" /> Create Return
            </DialogTitle>
          </DialogHeader>

          {/* Type Tabs */}
          <Tabs
            value={createType}
            onValueChange={(v) => {
              setCreateType(v as 'SALE_RETURN' | 'PURCHASE_RETURN');
              setReturnItems([]);
              setReferenceId('');
              setReturnReason('');
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="SALE_RETURN" className="flex-1 gap-2">
                <ShoppingCart className="w-4 h-4" /> Sale Return
              </TabsTrigger>
              <TabsTrigger value="PURCHASE_RETURN" className="flex-1 gap-2">
                <Package className="w-4 h-4" /> Purchase Return
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-4 pt-2">
            {/* Reference ID */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {createType === 'SALE_RETURN' ? 'Sale Invoice Reference' : 'Purchase Invoice Reference'} *
              </Label>
              <Input
                placeholder={
                  createType === 'SALE_RETURN'
                    ? 'Enter sale invoice number...'
                    : 'Enter purchase invoice number...'
                }
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="border-border/80"
              />
            </div>

            {/* Medicine Search */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Add Medicine
              </Label>
              <MedicineSearchInput
                onSelect={handleMedicineSelect}
                type={createType}
              />
            </div>

            {/* Items Table */}
            {returnItems.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-border">
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5">
                        Medicine
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 w-20">
                        Qty
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 w-24">
                        Rate (₹)
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 w-24">
                        Total (₹)
                      </th>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 w-36">
                        Reason
                      </th>
                      <th className="p-2.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnItems.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="p-2.5">
                          <p className="text-sm font-medium text-gray-900">
                            {item.medicine?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.batchNo && `Batch: ${item.batchNo} | `}
                            {item.unitType}
                          </p>
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'quantity',
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8 w-20 text-sm border-border/80"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) =>
                              updateItem(
                                index,
                                'rate',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 w-24 text-sm border-border/80"
                          />
                        </td>
                        <td className="p-2.5 text-sm font-medium text-gray-900">
                          {formatCurrency(item.total)}
                        </td>
                        <td className="p-2.5">
                          <Input
                            placeholder="Reason..."
                            value={item.reason}
                            onChange={(e) =>
                              updateItem(index, 'reason', e.target.value)
                            }
                            className="h-8 text-sm border-border/80"
                          />
                        </td>
                        <td className="p-2.5">
                          <button
                            onClick={() => removeItem(index)}
                            className="p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* Return Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Overall Return Reason</Label>
              <Input
                placeholder="e.g. Defective items, Wrong quantity, Expired medicine..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="border-border/80"
              />
            </div>

            {/* Total */}
            {returnItems.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Total Return Amount
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCurrency(totalReturnAmount)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {returnItems.length} item(s)
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={handleCreateReturn}
              disabled={
                saving || returnItems.length === 0 || !referenceId
              }
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" /> Process Return
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-600" /> Return Details
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4 pt-2">
              {/* Return Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">
                    Return Number
                  </p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {selectedReturn.returnNo}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Type</p>
                  <Badge
                    variant="outline"
                    className={
                      selectedReturn.type === 'SALE_RETURN'
                        ? 'border-orange-200 text-orange-700 bg-orange-50'
                        : 'border-blue-200 text-blue-700 bg-blue-50'
                    }
                  >
                    {selectedReturn.type === 'SALE_RETURN'
                      ? 'Sale Return'
                      : 'Purchase Return'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">
                    Reference
                  </p>
                  <p className="text-sm text-gray-900">
                    {selectedReturn.referenceId || '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Status</p>
                  <Badge
                    variant="secondary"
                    className={`text-xs ${statusColors[selectedReturn.status] || ''}`}
                  >
                    {selectedReturn.status}
                  </Badge>
                </div>
                {selectedReturn.customer && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">
                      Customer
                    </p>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedReturn.customer.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {selectedReturn.customer.phone}
                      </p>
                    </div>
                  </div>
                )}
                {selectedReturn.supplier && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">
                      Supplier
                    </p>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedReturn.supplier.name}
                      </p>
                      {selectedReturn.supplier.address && (
                        <p className="text-xs text-gray-500">{selectedReturn.supplier.address}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        {selectedReturn.supplier.phone}
                      </p>
                    </div>
                  </div>
                )}
                {selectedReturn.user && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">
                      Processed By
                    </p>
                    <p className="text-sm text-gray-900 flex items-center gap-1">
                      <User className="w-3 h-3" /> {selectedReturn.user.name}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 font-medium">Date</p>
                  <p className="text-sm text-gray-900">
                    {selectedReturn.createdAt
                      ? formatDate(selectedReturn.createdAt)
                      : selectedReturn.date
                        ? formatDate(selectedReturn.date)
                        : '-'}
                  </p>
                </div>
              </div>

              {/* Reason */}
              {selectedReturn.reason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-700 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Return Reason
                  </p>
                  <p className="text-sm text-yellow-800">
                    {selectedReturn.reason}
                  </p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Returned Items
                </p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-border">
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5">
                          Medicine
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5">
                          Batch
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 text-right">
                          Qty
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5">
                          Unit
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 text-right">
                          Rate
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5 text-right">
                          Total
                        </th>
                        <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-2.5">
                          Reason
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.items?.map((item, i) => (
                        <tr
                          key={item.id || i}
                          className="border-b border-border/50 last:border-0"
                        >
                          <td className="p-2.5 text-sm font-medium text-gray-900">
                            {item.medicine?.name || 'Unknown'}
                          </td>
                          <td className="p-2.5 text-sm text-gray-600">
                            {item.batchNo || item.batchId || '-'}
                          </td>
                          <td className="p-2.5 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="p-2.5 text-sm text-gray-600">
                            {item.unitType}
                          </td>
                          <td className="p-2.5 text-sm text-gray-900 text-right">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="p-2.5 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="p-2.5 text-xs text-gray-500">
                            {item.reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Total Return Amount
                  </span>
                  <span className="text-xl font-bold text-emerald-700">
                    {formatCurrency(selectedReturn.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
