'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  Printer,
  Eye,
  Calendar,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  IndianRupee,
  Clock,
  User,
  Receipt,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { printInvoiceNewWindow } from './invoice-print';

// ==================== TYPES ====================

interface SaleRecord {
  id: string;
  invoiceNo: string;
  customerName: string | null;
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  paymentMode: string;
  status: string;
  createdAt: string;
  items: SaleItemRecord[];
  user?: { name: string } | null;
  customer?: { name: string; phone: string | null } | null;
}

interface SaleItemRecord {
  id: string;
  medicineName: string;
  quantity: number;
  unitType: string;
  saleRate: number;
  mrp: number;
  gstPercent: number;
  batchNo: string | null;
  expiryDate: string | null;
  cgst: number;
  sgst: number;
  total: number;
}

interface InvoiceData {
  invoiceNo: string;
  customerName: string | null;
  doctorName: string | null;
  subtotal: number;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  paymentMode: string;
  items: {
    medicineName: string;
    quantity: number;
    unitType: string;
    saleRate: number;
    mrp: number;
    batchNo: string | null;
    expiryDate: string | null;
    total: number;
  }[];
  createdAt: string;
}

// ==================== HELPERS ====================

function formatINR(amount: number): string {
  if (amount == null || isNaN(amount)) return 'Rs. 0.00';
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear()).slice(-2);
  return `${month}-${year}`;
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getDaysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// ==================== PAYMENT MODE BADGE ====================

function PaymentBadge({ mode }: { mode: string }) {
  const styles: Record<string, string> = {
    Cash: 'bg-green-50 text-green-700 border-green-200',
    Card: 'bg-blue-50 text-blue-700 border-blue-200',
    UPI: 'bg-purple-50 text-purple-700 border-purple-200',
    Credit: 'bg-orange-50 text-orange-700 border-orange-200',
  };
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border',
      styles[mode] || 'bg-gray-50 text-gray-700 border-gray-200'
    )}>
      {mode}
    </span>
  );
}

// ==================== STATUS BADGE ====================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
    Refunded: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  const icons: Record<string, string> = {
    Completed: '\u2713',
    Cancelled: '\u2717',
    Refunded: '\u21BA',
  };
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border',
      styles[status] || 'bg-gray-50 text-gray-700 border-gray-200'
    )}>
      <span>{icons[status] || ''}</span>
      {status}
    </span>
  );
}

// ==================== PRINT HELPER (uses shared printInvoiceNewWindow) ====================

async function printSaleInvoice(sale: SaleRecord): Promise<void> {
  // Fetch full sale details if items aren't included
  let items = sale.items;
  if (!items || items.length === 0) {
    try {
      const res = await fetch(`/api/sales/${sale.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          items = data.data.items || [];
        }
      }
    } catch { /* use empty */ }
  }

  const invoiceData: InvoiceData = {
    invoiceNo: sale.invoiceNo,
    customerName: sale.customerName || sale.customer?.name || null,
    doctorName: null,
    subtotal: sale.subtotal,
    loyaltyPointsUsed: 0,
    loyaltyPointsEarned: 0,
    paymentMode: sale.paymentMode,
    items: (items || []).map((item: any) => ({
      medicineName: item.medicineName,
      quantity: item.quantity,
      unitType: item.unitType,
      saleRate: item.saleRate,
      mrp: item.mrp,
      batchNo: item.batchNo,
      expiryDate: item.expiryDate,
      total: item.total,
    })),
    createdAt: sale.createdAt,
  };

  await printInvoiceNewWindow(invoiceData);
}

// ==================== SALE DETAIL MODAL ====================

function SaleDetailModal({ sale, onClose, onPrint }: {
  sale: SaleRecord;
  onClose: () => void;
  onPrint: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{sale.invoiceNo}</h2>
              <p className="text-sm text-gray-500">
                {formatShortDate(sale.createdAt)} at {formatTime(sale.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={onPrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              size="sm"
            >
              <Printer className="w-4 h-4" />
              Reprint
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Close
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Customer</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {sale.customerName || sale.customer?.name || 'Walk-in'}
              </p>
              {sale.customer?.phone && (
                <p className="text-xs text-gray-500 mt-0.5">{sale.customer.phone}</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Payment Mode</p>
              <div className="mt-1">
                <PaymentBadge mode={sale.paymentMode} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-500 font-medium">Status</p>
              <div className="mt-1">
                <StatusBadge status={sale.status} />
              </div>
            </div>
          </div>

          {/* Items table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Items ({sale.items?.length || 0})
            </h3>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Medicine</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Batch</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500">Exp</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Rate</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(sale.items || []).map((item, idx) => (
                    <tr key={item.id || idx} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 text-xs">{item.medicineName}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-600">
                        {item.quantity} {item.unitType}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-500">{item.batchNo || '-'}</td>
                      <td className="px-3 py-2 text-center text-xs text-gray-500">{formatExpiry(item.expiryDate)}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-600">{formatINR(item.saleRate)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-xs text-gray-900">{formatINR(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center">
              <span className="text-base font-bold text-gray-900">Grand Total</span>
              <span className="text-base font-bold text-emerald-700">{formatINR(sale.grandTotal)}</span>
            </div>
          </div>

          {/* Billed by */}
          {sale.user?.name && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <User className="w-3.5 h-3.5" />
              Billed by: {sale.user.name}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

const PAGE_SIZE = 20;

export function SalesHistoryPage() {
  const { toast } = useToast();

  // Data state
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState(getDaysAgoStr(30));
  const [dateTo, setDateTo] = useState(getTodayStr());
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Detail modal
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // ==================== FETCH SALES ====================

  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      if (paymentFilter !== 'all') params.set('payment', paymentFilter);

      const res = await fetch(`/api/sales/history?${params.toString()}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData.error || `Server error (${res.status})`;
        console.error('[Sales History] API error:', res.status, errMsg);
        setFetchError(errMsg);
        toast({ title: 'Error loading sales', description: errMsg, variant: 'destructive' });
        setSales([]);
        return;
      }
      const data = await res.json();

      if (data.success) {
        setSales(data.data || []);
        setTotalCount(data.data?.length || 0);
        setCurrentPage(1);
      } else {
        console.error('[Sales History] Unexpected response:', data);
        setSales([]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      console.error('[Sales History] Fetch error:', msg);
      setFetchError(msg);
      toast({ title: 'Error loading sales', description: msg, variant: 'destructive' });
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, paymentFilter, toast]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ==================== FILTERED SALES (client-side search) ====================

  const filteredSales = useMemo(() => {
    if (!searchQuery.trim()) return sales;
    const q = searchQuery.toLowerCase().trim();
    return sales.filter((s) =>
      s.invoiceNo.toLowerCase().includes(q) ||
      (s.customerName && s.customerName.toLowerCase().includes(q)) ||
      (s.customer?.name && s.customer.name.toLowerCase().includes(q))
    );
  }, [sales, searchQuery]);

  // ==================== PAGINATION ====================

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // ==================== SUMMARY STATS ====================

  const summaryStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
    const totalGST = filteredSales.reduce((sum, s) => sum + s.totalGst, 0);
    const totalItems = filteredSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const cashCount = filteredSales.filter((s) => s.paymentMode === 'Cash').length;
    const upiCount = filteredSales.filter((s) => s.paymentMode === 'UPI').length;
    const cardCount = filteredSales.filter((s) => s.paymentMode === 'Card').length;
    const creditCount = filteredSales.filter((s) => s.paymentMode === 'Credit').length;
    return { totalRevenue, totalGST, totalItems, cashCount, upiCount, cardCount, creditCount };
  }, [filteredSales]);

  // ==================== PRINT HANDLER ====================

  const handlePrint = async (sale: SaleRecord) => {
    setPrintingId(sale.id);
    try {
      await printSaleInvoice(sale);
    } catch {
      toast({
        title: 'Print Failed',
        description: 'Could not open print window. Please allow popups.',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setPrintingId(null), 1000);
    }
  };

  // ==================== DATE RANGE PRESETS ====================

  const setDatePreset = (days: number) => {
    setDateFrom(getDaysAgoStr(days));
    setDateTo(getTodayStr());
  };

  // ==================== RENDER ====================

  return (
    <div className="min-h-0 flex flex-col bg-gray-50/50 h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              Sales Bills
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              View, search & reprint all past sales invoices
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSales}
              disabled={loading}
              className="gap-1.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Refresh
            </Button>
          </div>
        </div>

        {/* Search & Filter bar */}
        <div className="mt-4 flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by invoice no, customer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Date presets */}
          <div className="flex items-center gap-1.5">
            {[
              { label: 'Today', days: 0 },
              { label: '7 Days', days: 7 },
              { label: '30 Days', days: 30 },
              { label: '90 Days', days: 90 },
            ].map((preset) => (
              <button
                key={preset.label}
                onClick={() => setDatePreset(preset.days)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors',
                  dateFrom === getDaysAgoStr(preset.days) && dateTo === getTodayStr()
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* More filters toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn('gap-1.5', showFilters && 'bg-emerald-50 border-emerald-200 text-emerald-700')}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
          </Button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <label className="text-xs font-medium text-gray-500">From:</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">To:</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-500">Payment:</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="h-8 px-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Credit">Credit</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="px-3 sm:px-6 pt-4 flex-shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Receipt className="w-3.5 h-3.5" />
              Total Bills
            </div>
            <p className="text-lg font-bold text-gray-900">{filteredSales.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <IndianRupee className="w-3.5 h-3.5" />
              Revenue
            </div>
            <p className="text-lg font-bold text-emerald-700">{formatINR(summaryStats.totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FileText className="w-3.5 h-3.5" />
              Items Sold
            </div>
            <p className="text-lg font-bold text-gray-900">{summaryStats.totalItems}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Cash
            </div>
            <p className="text-lg font-bold text-gray-900">{summaryStats.cashCount}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              UPI
            </div>
            <p className="text-lg font-bold text-gray-900">{summaryStats.upiCount}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Credit
            </div>
            <p className="text-lg font-bold text-gray-900">{summaryStats.creditCount}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-hidden px-3 sm:px-6 py-4 flex flex-col">
        <div className="bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden">
          {/* Table header row */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice No</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Schedule</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Grand Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Loading sales bills...</p>
                    </td>
                  </tr>
                ) : fetchError ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-red-600">Failed to load sales</p>
                      <p className="text-xs text-red-500 max-w-md mx-auto mt-1">{fetchError}</p>
                      <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={fetchSales}>
                        <Download className="w-3.5 h-3.5" /> Retry
                      </Button>
                    </td>
                  </tr>
                ) : paginatedSales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center">
                      <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-gray-700">No sales found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {searchQuery ? 'Try a different search term' : 'No sales in the selected date range'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale, idx) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-emerald-50/30 transition-colors cursor-pointer"
                      onDoubleClick={() => setSelectedSale(sale)}
                    >
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {(currentPage - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-emerald-700 text-xs">{sale.invoiceNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-600">{formatShortDate(sale.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-gray-300" />
                          <span className="text-xs text-gray-400">{formatTime(sale.createdAt)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-gray-400" />
                          <span className="text-xs font-medium text-gray-700">
                            {sale.customerName || sale.customer?.name || 'Walk-in'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                          {sale.items?.length || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {[...new Set((sale.items || []).map((item: any) => item.medicine?.drugSchedule || 'OTC').filter(Boolean))].map((sch: string) => (
                            <span key={sch} className={`text-[10px] px-1.5 py-0 rounded border font-medium ${
                              sch === 'H' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                              sch === 'H1' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                              sch === 'X' ? 'bg-red-50 text-red-700 border-red-300' :
                              sch === 'G' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                              'bg-green-50 text-green-700 border-green-300'
                            }`}>
                              {sch === 'OTC' ? 'OTC' : `Sch. ${sch}`}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-bold text-gray-900">{formatINR(sale.grandTotal)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PaymentBadge mode={sale.paymentMode} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={sale.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedSale(sale)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handlePrint(sale)}
                            disabled={printingId === sale.id}
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 transition-colors disabled:opacity-50"
                            title="Reprint Invoice"
                          >
                            {printingId === sale.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Printer className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filteredSales.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{' '}
                {Math.min(currentPage * PAGE_SIZE, filteredSales.length)} of {filteredSales.length} bills
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onPrint={() => {
            handlePrint(selectedSale);
            setSelectedSale(null);
          }}
        />
      )}
    </div>
  );
}
