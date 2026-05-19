'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck,
  CalendarClock,
  IndianRupee,
  ShoppingCart,
  CreditCard,
  Smartphone,
  ArrowDownCircle,
  Package,
  Receipt,
  Printer,
  RotateCcw,
  Lock,
  Unlock,
  History,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/stores/app-store';
import { useToast } from '@/hooks/use-toast';
import { formatDateIST } from '@/lib/dates';

// ─────────── Types ───────────

interface LiveSummary {
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalUpiSales: number;
  totalCreditSales: number;
  totalReturns: number;
  totalCashReturns: number;
  totalPurchases: number;
  totalInvoices: number;
  totalReturnNotes: number;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
}

interface DayCloseRecord {
  id: string;
  date: string;
  openedBy: string | null;
  closedBy: string | null;
  openCash: number;
  closeCash: number;
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalUpiSales: number;
  totalCreditSales: number;
  totalReturns: number;
  totalPurchases: number;
  totalExpenses: number;
  expectedCash: number;
  difference: number;
  totalInvoices: number;
  totalReturnNotes: number;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  openedByUser: UserInfo | null;
  closedByUser: UserInfo | null;
}

type HistoryRecord = DayCloseRecord;

// ─────────── Helpers ───────────

function formatCurrency(amount: number): string {
  if (amount == null || isNaN(amount)) return '₹0.00';
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-₹${formatted}` : `₹${formatted}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─────────── Stat Card ───────────

function StatCard({ label, value, icon: Icon, color, bg, subLabel }: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  subLabel?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subLabel && <p className="text-xs text-gray-400">{subLabel}</p>}
          </div>
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────── Main Component ───────────

export function DayClosePage() {
  const { user, fetchDayStatus } = useAppStore();
  const [dayClose, setDayClose] = useState<DayCloseRecord | null>(null);
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actualCash, setActualCash] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');

  // Open day dialog
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [openCashInput, setOpenCashInput] = useState<string>('');
  const [openError, setOpenError] = useState<string>('');

  // Close day dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeCashInput, setCloseCashInput] = useState<string>('');
  const [closeError, setCloseError] = useState<string>('');

  // History
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/day-close');
      const json = await res.json();
      if (json.success) {
        setDayClose(json.data.dayClose);
        setLiveSummary(json.data.liveSummary);
      }
    } catch (err) {
      console.error('Failed to fetch day close:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const to = new Date();
      const res = await fetch(
        `/api/day-close/history?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&page=${page}&limit=10`
      );
      const json = await res.json();
      if (json.success) {
        setHistory(json.data.records);
        setHistoryTotalPages(json.data.pagination.totalPages);
        setHistoryPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  // ── Open Day ──
  const handleOpenDay = async () => {
    setOpenError('');
    const cash = parseFloat(openCashInput);
    if (isNaN(cash) || cash < 0) {
      setOpenError('Please enter a valid opening cash amount');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/day-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'open', openCash: cash, userId: user?.id }),
      });
      const json = await res.json();
      if (json.success) {
        setShowOpenDialog(false);
        setOpenCashInput('');
        setActualCash('');
        await fetchData();
        fetchDayStatus(); // Refresh global day status in store
      } else {
        setOpenError(json.error || 'Failed to open day');
      }
    } catch {
      setOpenError('Failed to open day');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Close Day ──
  const handleCloseDay = async () => {
    setCloseError('');
    const cash = parseFloat(closeCashInput);
    if (isNaN(cash) || cash < 0) {
      setCloseError('Please enter a valid closing cash amount');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/day-close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', closeCash: cash, notes: closeNotes, userId: user?.id }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCloseDialog(false);
        setCloseCashInput('');
        setCloseNotes('');
        setActualCash('');
        await fetchData();
        fetchDayStatus(); // Refresh global day status in store
        fetchHistory(1);
      } else {
        setCloseError(json.error || 'Failed to close day');
      }
    } catch {
      setCloseError('Failed to close day');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Print ──
  const { toast } = useToast();
  const [printLoading, setPrintLoading] = useState(false);

  const handlePrint = async () => {
    const dc = dayClose;
    if (!dc) {
      toast({ title: 'Error', description: 'No day close data available to print.', variant: 'destructive' });
      return;
    }

    setPrintLoading(true);
    try {
      const pharmaName = 'uPharma';
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
      const printDate = formatDateIST(new Date());

      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Day Close Report - ${printDate}</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; padding: 4mm; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
  .header h1 { font-size: 18px; margin-bottom: 2px; }
  .header .sub { font-size: 11px; color: #555; }
  .section { margin-bottom: 14px; }
  .section h2 { font-size: 13px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 8px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  table th, table td { padding: 5px 8px; text-align: left; border-bottom: 1px solid #e5e5e5; font-size: 12px; }
  table th { background: #f5f5f5; font-weight: 600; text-align: left; }
  table td.right, table th.right { text-align: right; }
  table td.center, table th.center { text-align: center; }
  .total-row td { font-weight: 700; background: #f0f0f0; border-top: 2px solid #333; }
  .diff-ok { color: #16a34a; font-weight: 700; }
  .diff-bad { color: #dc2626; font-weight: 700; }
  .diff-over { color: #2563eb; font-weight: 700; }
  .footer { margin-top: 16px; border-top: 1px solid #ccc; padding-top: 8px; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
  .signatures { margin-top: 30px; display: flex; justify-content: space-between; }
  .sig-block { text-align: center; }
  .sig-line { border-top: 1px solid #333; width: 150px; margin-top: 4px; padding-top: 4px; font-size: 11px; }
  .notes-section { margin-top: 10px; padding: 8px; background: #fafafa; border: 1px solid #e5e5e5; border-radius: 4px; }
  .notes-section p { font-size: 11px; color: #555; word-break: break-word; }
</style></head><body>

<div class="header">
  <h1>${pharmaName}</h1>
  <div class="sub">Day Closing Report</div>
</div>

<div class="section">
  <table>
    <tr><td><strong>Date</strong></td><td>${formatDateIST(dc.date)}</td>
        <td><strong>Status</strong></td><td class="center">${dc.status}</td></tr>
    <tr><td><strong>Opened At</strong></td><td>${formatTime(dc.createdAt)}${dc.openedByUser ? ' by ' + dc.openedByUser.name : ''}</td>
        <td><strong>Closed At</strong></td><td>${formatTime(dc.updatedAt)}${dc.closedByUser ? ' by ' + dc.closedByUser.name : ''}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Sales Summary</h2>
  <table>
    <tr><th>Sales Type</th><th class="right">Amount</th></tr>
    <tr><td>Total Sales</td><td class="right">${formatCurrency(dc.totalSales)}</td></tr>
    <tr><td>Cash Sales</td><td class="right">${formatCurrency(dc.totalCashSales)}</td></tr>
    <tr><td>Card Sales</td><td class="right">${formatCurrency(dc.totalCardSales)}</td></tr>
    <tr><td>UPI Sales</td><td class="right">${formatCurrency(dc.totalUpiSales)}</td></tr>
    <tr><td>Credit Sales</td><td class="right">${formatCurrency(dc.totalCreditSales)}</td></tr>
    <tr class="total-row"><td>Total Returns</td><td class="right">${formatCurrency(dc.totalReturns)}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Operations Summary</h2>
  <table>
    <tr><th>Metric</th><th class="right">Value</th></tr>
    <tr><td>Total Invoices</td><td class="right">${dc.totalInvoices}</td></tr>
    <tr><td>Total Return Notes</td><td class="right">${dc.totalReturnNotes}</td></tr>
    <tr><td>Total Purchases</td><td class="right">${formatCurrency(dc.totalPurchases)}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Cash Reconciliation</h2>
  <table>
    <tr><th>Description</th><th class="right">Amount</th></tr>
    <tr><td>Opening Cash</td><td class="right">${formatCurrency(dc.openCash)}</td></tr>
    <tr><td>(+) Cash Sales</td><td class="right">${formatCurrency(dc.totalCashSales)}</td></tr>
    <tr><td>(-) Cash Returns</td><td class="right">- ${formatCurrency(dc.totalReturns)}</td></tr>
    <tr class="total-row"><td>Expected Cash in Drawer</td><td class="right">${formatCurrency(dc.expectedCash)}</td></tr>
    <tr><td>Actual Cash Counted</td><td class="right">${formatCurrency(dc.closeCash)}</td></tr>
    <tr><td><strong>Difference</strong></td>
        <td class="right ${dc.difference === 0 ? 'diff-ok' : dc.difference < 0 ? 'diff-bad' : 'diff-over'}">${formatCurrency(dc.difference)}${dc.difference === 0 ? ' Matched' : ''}</td></tr>
  </table>
</div>

${dc.notes ? `<div class="notes-section"><strong>Notes: </strong><p>${dc.notes.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>` : ''}

<div class="footer">
  <span>Generated: ${now}</span>
  <span>${pharmaName} ERP v1.0</span>
</div>

<div class="signatures">
  <div class="sig-block"><div class="sig-line">Opened By</div></div>
  <div class="sig-block"><div class="sig-line">Closed By</div></div>
  <div class="sig-block"><div class="sig-line">Authorized Signatory</div></div>
</div>

</body></html>`;

      // Create blob URL and open in new tab
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        // Popup blocked - try alternative: create download
        URL.revokeObjectURL(blobUrl);
        const link = document.createElement('a');
        link.href = blobUrl;
        // Re-create blob since we revoked it
        const blob2 = new Blob([html], { type: 'text/html' });
        const blobUrl2 = URL.createObjectURL(blob2);
        link.href = blobUrl2;
        link.download = `day-close-report-${printDate}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl2), 5000);
        toast({
          title: 'Popup Blocked',
          description: 'Print page was downloaded instead. Open the downloaded file and use Ctrl+P to print.',
          variant: 'destructive',
        });
        return;
      }

      // Wait for content to load then trigger print
      printWindow.addEventListener('load', () => {
        setTimeout(() => {
          printWindow.print();
          URL.revokeObjectURL(blobUrl);
        }, 500);
      });

      toast({ title: 'Print Preview', description: 'Print dialog will open shortly...' });
    } catch (err) {
      console.error('Print failed:', err);
      toast({ title: 'Print Failed', description: 'Could not generate print report. Please try again.', variant: 'destructive' });
    } finally {
      setPrintLoading(false);
    }
  };

  // ── Calculated fields ──
  const isOpen = dayClose?.status === 'Open';
  const isClosed = dayClose?.status === 'Closed';
  const noRecord = !dayClose;
  const openCash = dayClose?.openCash || 0;
  const cashSales = liveSummary?.totalCashSales || 0;
  const cashReturns = liveSummary?.totalCashReturns || 0;
  const expectedCash = openCash + cashSales - cashReturns;
  const actualCashNum = parseFloat(actualCash) || 0;
  const difference = actualCashNum - expectedCash;
  const displayDiff = dayClose?.difference ?? (actualCashNum > 0 ? difference : null);

  if (loading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 bg-gray-200 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-lg" />)}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Day Closing</h1>
          <p className="text-sm text-gray-500 mt-1">Cash reconciliation &amp; day-end summary</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={`text-xs font-medium px-3 py-1 ${
              isOpen
                ? 'bg-emerald-100 text-emerald-700'
                : isClosed
                ? 'bg-gray-100 text-gray-600'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {noRecord ? (
              <><CalendarClock className="w-3 h-3 mr-1.5 inline" /> Not Opened</>
            ) : isOpen ? (
              <><Unlock className="w-3 h-3 mr-1.5 inline" /> Day Open</>
            ) : (
              <><Lock className="w-3 h-3 mr-1.5 inline" /> Day Closed</>
            )}
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 border-border/60 text-gray-600" onClick={() => fetchHistory(historyPage)}>
            <History className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* Section 1: Day Status Card */}
      <Card className={`border-2 shadow-sm ${
        isOpen ? 'border-emerald-200 bg-emerald-50/30' : 
        isClosed ? 'border-gray-200 bg-gray-50/30' : 
        'border-yellow-300 bg-yellow-50/50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {noRecord ? (
              <><AlertTriangle className="w-4 h-4 text-yellow-600" /> Day Status — Not Opened</>
            ) : isOpen ? (
              <><Unlock className="w-4 h-4 text-emerald-600" /> Day Status — Open</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 text-gray-500" /> Day Status — Closed</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {noRecord ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                <AlertTriangle className="w-7 h-7 text-yellow-600" />
              </div>
              <p className="text-base text-gray-800 font-semibold">Day has not been opened yet</p>
              <p className="text-sm text-gray-500 mt-1">You must open the day before performing any sales, purchases, or returns.</p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 mt-4"
                onClick={() => { setShowOpenDialog(true); setOpenError(''); setOpenCashInput(''); }}
              >
                <Unlock className="w-4 h-4" /> Open Day Now
              </Button>
            </div>
          ) : isOpen ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Day opened at {formatTime(dayClose.createdAt)}</span>
                  {dayClose.openedByUser && (
                    <span className="text-gray-400"> by {dayClose.openedByUser.name}</span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Opening Cash: <span className="font-semibold text-gray-800">{formatCurrency(openCash)}</span>
                </p>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 self-start sm:self-auto">Active</Badge>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Opened</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {formatTime(dayClose.createdAt)} {dayClose.openedByUser && `by ${dayClose.openedByUser.name}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Closed</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {formatTime(dayClose.updatedAt)} {dayClose.closedByUser && `by ${dayClose.closedByUser.name}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Cash Difference</p>
                <p className={`text-sm font-semibold mt-0.5 ${
                  dayClose.difference === 0 ? 'text-emerald-600' : dayClose.difference > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {formatCurrency(dayClose.difference)}
                  {dayClose.difference === 0 && <CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Today's Summary (Live) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Today&apos;s Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Sales"
            value={formatCurrency(liveSummary?.totalSales || 0)}
            icon={IndianRupee}
            color="text-emerald-600"
            bg="bg-emerald-50"
            subLabel="All payment modes"
          />
          <StatCard
            label="Total Returns"
            value={formatCurrency(liveSummary?.totalReturns || 0)}
            icon={RotateCcw}
            color="text-red-500"
            bg="bg-red-50"
            subLabel={`${liveSummary?.totalReturnNotes || 0} return notes`}
          />
          <StatCard
            label="Total Invoices"
            value={String(liveSummary?.totalInvoices || 0)}
            icon={Receipt}
            color="text-teal-600"
            bg="bg-teal-50"
            subLabel="Completed sales"
          />
          <StatCard
            label="Total Purchases"
            value={formatCurrency(liveSummary?.totalPurchases || 0)}
            icon={Package}
            color="text-orange-600"
            bg="bg-orange-50"
            subLabel="Goods received"
          />
        </div>
      </div>

      {/* Payment Mode Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Cash Sales</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalCashSales || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Card Sales</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalCardSales || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">UPI Sales</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalUpiSales || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Credit Sales</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalCreditSales || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Cash Reconciliation */}
      {(isOpen || noRecord) && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-600" />
              Cash Reconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {/* Opening Cash */}
              <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                <span className="text-sm text-gray-600">Opening Cash</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(openCash)}</span>
              </div>
              {/* Cash Sales */}
              <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" /> Cash Sales
                </span>
                <span className="text-sm font-semibold text-emerald-700">+ {formatCurrency(cashSales)}</span>
              </div>
              {/* Cash Returns */}
              <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-red-400" /> Cash Returns
                </span>
                <span className="text-sm font-semibold text-red-600">- {formatCurrency(cashReturns)}</span>
              </div>
              <Separator className="my-2" />
              {/* Expected Cash */}
              <div className="flex items-center justify-between py-3 bg-gray-50 -mx-6 px-6 rounded">
                <span className="text-sm font-semibold text-gray-800">Expected Cash in Drawer</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(expectedCash)}</span>
              </div>
              {/* Actual Cash Input */}
              {isOpen && (
                <>
                  <div className="flex items-center justify-between py-3 border-t border-dashed border-border/60 mt-2">
                    <Label htmlFor="actual-cash" className="text-sm font-medium text-gray-800">
                      Actual Cash in Drawer
                    </Label>
                    <div className="w-48">
                      <Input
                        id="actual-cash"
                        type="number"
                        step="0.01"
                        placeholder="Enter amount"
                        value={actualCash}
                        onChange={(e) => setActualCash(e.target.value)}
                        className="text-right text-sm font-semibold h-9"
                      />
                    </div>
                  </div>
                  {/* Difference */}
                  {actualCashNum > 0 && (
                    <div className={`flex items-center justify-between py-3 -mx-6 px-6 rounded mt-1 ${
                      difference === 0 ? 'bg-emerald-50' : difference < 0 ? 'bg-red-50' : 'bg-blue-50'
                    }`}>
                      <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        {difference === 0 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : difference < 0 ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-blue-500" />
                        )}
                        Difference
                      </span>
                      <span className={`text-base font-bold ${
                        difference === 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-700' : 'text-blue-700'
                      }`}>
                        {formatCurrency(difference)}
                        {difference === 0 && ' ✓'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed day reconciliation (read-only) */}
      {isClosed && dayClose && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-gray-500" />
              Cash Reconciliation (Closed)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                <span className="text-sm text-gray-600">Opening Cash</span>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(dayClose.openCash)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" /> Cash Sales
                </span>
                <span className="text-sm font-semibold text-emerald-700">+ {formatCurrency(dayClose.totalCashSales)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-red-400" /> Returns
                </span>
                <span className="text-sm font-semibold text-red-600">- {formatCurrency(dayClose.totalReturns)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between py-3 bg-gray-50 -mx-6 px-6 rounded">
                <span className="text-sm font-semibold text-gray-800">Expected Cash</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(dayClose.expectedCash)}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-dashed border-border/60">
                <span className="text-sm font-medium text-gray-800">Actual Cash Counted</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(dayClose.closeCash)}</span>
              </div>
              <div className={`flex items-center justify-between py-3 -mx-6 px-6 rounded ${
                dayClose.difference === 0 ? 'bg-emerald-50' : dayClose.difference < 0 ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  {dayClose.difference === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  Difference
                </span>
                <span className={`text-base font-bold ${
                  dayClose.difference === 0 ? 'text-emerald-700' : dayClose.difference < 0 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {formatCurrency(dayClose.difference)}
                  {dayClose.difference === 0 && ' ✓'}
                </span>
              </div>
              {dayClose.notes && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{dayClose.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 4: Actions */}
      <div className="flex flex-wrap gap-3">
        {noRecord && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => { setShowOpenDialog(true); setOpenError(''); setOpenCashInput(''); }}
          >
            <Unlock className="w-4 h-4" /> Open Day
          </Button>
        )}
        {isOpen && (
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            onClick={() => {
              setShowCloseDialog(true);
              setCloseError('');
              setCloseCashInput('');
              setCloseNotes('');
            }}
          >
            <Lock className="w-4 h-4" /> Close Day
          </Button>
        )}
        {isClosed && (
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            onClick={handlePrint}
            disabled={printLoading}
          >
            <Printer className={`w-4 h-4 ${printLoading ? 'animate-pulse' : ''}`} />
            {printLoading ? 'Generating Report...' : 'Print Day Close Report'}
          </Button>
        )}
      </div>

      {/* Section 5: History Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" /> Day Close History
          </CardTitle>
          <p className="text-sm text-gray-500">Last 30 days</p>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <CalendarClock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No day close records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Date</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Sales</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Cash</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Returns</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Difference</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Opened By</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Closed By</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedHistory(record)}
                    >
                      <td className="py-3 pr-4 text-sm font-medium text-gray-900">{formatDate(record.date)}</td>
                      <td className="py-3 pr-4 text-sm text-right font-medium text-gray-900">{formatCurrency(record.totalSales)}</td>
                      <td className="py-3 pr-4 text-sm text-right text-emerald-700">{formatCurrency(record.totalCashSales)}</td>
                      <td className="py-3 pr-4 text-sm text-right text-red-600">{formatCurrency(record.totalReturns)}</td>
                      <td className={`py-3 pr-4 text-sm text-right font-semibold ${
                        record.difference === 0 ? 'text-emerald-600' : record.difference < 0 ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {formatCurrency(record.difference)}
                        {record.difference === 0 && ' ✓'}
                      </td>
                      <td className="py-3 pr-4 text-center">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            record.status === 'Closed'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {record.status}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{record.openedByUser?.name || '—'}</td>
                      <td className="py-3 text-sm text-gray-600">{record.closedByUser?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/60">
              <p className="text-xs text-gray-400">Page {historyPage} of {historyTotalPages}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={historyPage <= 1}
                  onClick={() => fetchHistory(historyPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => fetchHistory(historyPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════ DIALOGS ═══════════ */}

      {/* Open Day Dialog */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" /> Open Day
            </DialogTitle>
            <DialogDescription>
              Enter the opening cash amount to start the business day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="open-cash-input">Opening Cash Amount (₹)</Label>
              <Input
                id="open-cash-input"
                type="number"
                step="0.01"
                placeholder="e.g. 5000"
                value={openCashInput}
                onChange={(e) => setOpenCashInput(e.target.value)}
                className="text-lg font-semibold h-12"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleOpenDay(); }}
              />
              <p className="text-xs text-gray-400">Enter the physical cash present in the drawer at the start of day</p>
            </div>
            {openError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <XCircle className="w-4 h-4" />
                {openError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowOpenDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleOpenDay}
              disabled={actionLoading || !openCashInput}
            >
              {actionLoading ? 'Opening...' : 'Open Day'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Day Dialog */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-600" /> Close Day
            </DialogTitle>
            <DialogDescription>
              Review today&apos;s summary and enter the actual cash counted to close the day.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Summary inside dialog */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Today&apos;s Summary</h4>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Sales</span>
                <span className="font-semibold text-gray-900">{formatCurrency(liveSummary?.totalSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Cash Sales</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(liveSummary?.totalCashSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Card Sales</span>
                <span className="font-semibold text-blue-700">{formatCurrency(liveSummary?.totalCardSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">UPI Sales</span>
                <span className="font-semibold text-purple-700">{formatCurrency(liveSummary?.totalUpiSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Credit Sales</span>
                <span className="font-semibold text-amber-700">{formatCurrency(liveSummary?.totalCreditSales || 0)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Returns</span>
                <span className="font-semibold text-red-600">{formatCurrency(liveSummary?.totalReturns || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Invoices</span>
                <span className="font-semibold text-gray-900">{liveSummary?.totalInvoices || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Purchases</span>
                <span className="font-semibold text-gray-900">{formatCurrency(liveSummary?.totalPurchases || 0)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Opening Cash</span>
                <span className="font-semibold text-gray-900">{formatCurrency(openCash)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold bg-emerald-50 -mx-2 px-2 py-1.5 rounded">
                <span className="text-gray-700">Expected Cash in Drawer</span>
                <span className="text-emerald-700">{formatCurrency(expectedCash)}</span>
              </div>
            </div>

            {/* Actual cash input */}
            <div className="space-y-2">
              <Label htmlFor="close-cash-input">Actual Cash in Drawer (₹)</Label>
              <Input
                id="close-cash-input"
                type="number"
                step="0.01"
                placeholder="e.g. 15750"
                value={closeCashInput}
                onChange={(e) => setCloseCashInput(e.target.value)}
                className="text-lg font-semibold h-12"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleCloseDay(); }}
              />
            </div>

            {/* Live difference in dialog */}
            {closeCashInput && !isNaN(parseFloat(closeCashInput)) && (
              <div className={`flex items-center justify-between p-3 rounded-lg ${
                difference === 0 ? 'bg-emerald-50' : difference < 0 ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                  {difference === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  Difference
                </span>
                <span className={`text-base font-bold ${
                  difference === 0 ? 'text-emerald-700' : difference < 0 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {formatCurrency(difference)}
                </span>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="close-notes">Notes (optional)</Label>
              <Textarea
                id="close-notes"
                placeholder="Any observations, discrepancies, etc."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            {closeError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <XCircle className="w-4 h-4" />
                {closeError}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCloseDialog(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCloseDay}
              disabled={actionLoading || !closeCashInput}
            >
              {actionLoading ? 'Closing...' : 'Confirm & Close Day'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Detail Dialog */}
      <Dialog open={!!selectedHistory} onOpenChange={() => setSelectedHistory(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" /> Day Close — {selectedHistory && formatDate(selectedHistory.date)}
            </DialogTitle>
            <DialogDescription>
              Full detail of the day close record
            </DialogDescription>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Status</p>
                  <Badge
                    variant="secondary"
                    className={`mt-1 text-xs ${
                      selectedHistory.status === 'Closed' ? 'bg-gray-200 text-gray-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {selectedHistory.status}
                  </Badge>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Invoices</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedHistory.totalInvoices}</p>
                </div>
              </div>

              <div className="space-y-0">
                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Sales Breakdown</h4>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Total Sales</span>
                  <span className="text-sm font-semibold">{formatCurrency(selectedHistory.totalSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Cash Sales</span>
                  <span className="text-sm font-semibold text-emerald-700">{formatCurrency(selectedHistory.totalCashSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Card Sales</span>
                  <span className="text-sm font-semibold text-blue-700">{formatCurrency(selectedHistory.totalCardSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">UPI Sales</span>
                  <span className="text-sm font-semibold text-purple-700">{formatCurrency(selectedHistory.totalUpiSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Credit Sales</span>
                  <span className="text-sm font-semibold text-amber-700">{formatCurrency(selectedHistory.totalCreditSales)}</span>
                </div>
              </div>

              <div className="space-y-0">
                <h4 className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-medium">Cash Reconciliation</h4>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Opening Cash</span>
                  <span className="text-sm font-semibold">{formatCurrency(selectedHistory.openCash)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Cash Sales (+)</span>
                  <span className="text-sm font-semibold text-emerald-700">+ {formatCurrency(selectedHistory.totalCashSales)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Returns (-)</span>
                  <span className="text-sm font-semibold text-red-600">- {formatCurrency(selectedHistory.totalReturns)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Expected Cash</span>
                  <span className="text-sm font-semibold">{formatCurrency(selectedHistory.expectedCash)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-gray-600">Actual Cash</span>
                  <span className="text-sm font-semibold">{formatCurrency(selectedHistory.closeCash)}</span>
                </div>
                <div className={`flex justify-between py-2 rounded px-2 ${
                  selectedHistory.difference === 0 ? 'bg-emerald-50' : selectedHistory.difference < 0 ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <span className="text-sm font-semibold text-gray-800">Difference</span>
                  <span className={`text-sm font-bold ${
                    selectedHistory.difference === 0 ? 'text-emerald-700' : selectedHistory.difference < 0 ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {formatCurrency(selectedHistory.difference)}
                    {selectedHistory.difference === 0 && ' ✓'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total Purchases</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedHistory.totalPurchases)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Return Notes</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedHistory.totalReturnNotes}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Opened By</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedHistory.openedByUser?.name || '—'}</p>
                  {selectedHistory.openedByUser && (
                    <p className="text-xs text-gray-400">at {formatTime(selectedHistory.createdAt)}</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Closed By</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">{selectedHistory.closedByUser?.name || '—'}</p>
                  {selectedHistory.closedByUser && (
                    <p className="text-xs text-gray-400">at {formatTime(selectedHistory.updatedAt)}</p>
                  )}
                </div>
              </div>

              {selectedHistory.notes && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedHistory.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
