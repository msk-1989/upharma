'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee,
  ShoppingCart,
  CreditCard,
  Smartphone,
  ArrowDownCircle,
  Receipt,
  Printer,
  RotateCcw,
  Lock,
  Unlock,
  History,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
  MonitorCheck,
  Users,
  LogOut,
  Banknote,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/stores/app-store';
import { useToast } from '@/hooks/use-toast';
import { formatDateIST } from '@/lib/dates';

// ─────────── Types ───────────

interface CounterInfo {
  id: string;
  name: string;
  status: string;
  location?: string;
}

interface LiveSummary {
  totalSales: number;
  totalCashSales: number;
  totalCardSales: number;
  totalUpiSales: number;
  totalCreditSales: number;
  totalReturns: number;
  totalCashReturns: number;
  totalInvoices: number;
  totalReturnNotes: number;
  totalWithdrawals: number;
}

interface StaffSession {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  loginTime: string;
  invoicesHandled: number;
  salesAmount: number;
}

interface CashWithdrawal {
  id: string;
  amount: number;
  reason: string;
  createdAt: string;
  createdBy: string;
  createdByUser: { name: string } | null;
}

interface UserInfo {
  id: string;
  name: string;
  username: string;
}

interface CounterShiftRecord {
  id: string;
  counterId: string;
  counterName: string;
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
  totalCashReturns: number;
  totalWithdrawals: number;
  expectedCash: number;
  difference: number;
  totalInvoices: number;
  totalReturnNotes: number;
  status: string;
  openingNote: string | null;
  closingNote: string | null;
  differenceReason: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  openedByUser: UserInfo | null;
  closedByUser: UserInfo | null;
}

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

export function CounterShiftPage() {
  const { user, fetchShiftStatus, setShiftStatus, setShiftInfo, dayStatus, fetchDayStatus } = useAppStore();
  const { toast } = useToast();

  // Shift data
  const [activeShift, setActiveShift] = useState<CounterShiftRecord | null>(null);
  const [liveSummary, setLiveSummary] = useState<LiveSummary | null>(null);
  const [counters, setCounters] = useState<CounterInfo[]>([]);
  const [staffSessions, setStaffSessions] = useState<StaffSession[]>([]);
  const [withdrawals, setWithdrawals] = useState<CashWithdrawal[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);

  // Open shift dialog
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [openCounterId, setOpenCounterId] = useState<string>('');
  const [openCashInput, setOpenCashInput] = useState<string>('');
  const [openNote, setOpenNote] = useState<string>('');
  const [openError, setOpenError] = useState<string>('');

  // Close shift dialog
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeCashInput, setCloseCashInput] = useState<string>('');
  const [closeNote, setCloseNote] = useState<string>('');
  const [differenceReason, setDifferenceReason] = useState<string>('');
  const [closeError, setCloseError] = useState<string>('');

  // Withdrawal dialog
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string>('');

  // History
  const [history, setHistory] = useState<CounterShiftRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<CounterShiftRecord | null>(null);

  // End session loading
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager';

  // ── Fetch active shift and related data ──
  const fetchData = useCallback(async () => {
    try {
      // Use the full shift endpoint (returns shift + liveSummary + staffSessions)
      const res = await fetch('/api/counter-shifts');
      const json = await res.json();
      const shift = json.data?.shift || null;
      if (json.success && shift) {
        setActiveShift(shift);
        setLiveSummary(json.data.liveSummary || null);
        setStaffSessions(shift.staffSessions || []);

        // Update global store
        setShiftStatus(shift.shiftStatus);
        setShiftInfo({
          shiftId: shift.id,
          counterId: shift.counterId,
          counterName: shift.counter?.name || null,
        });
      } else {
        setActiveShift(null);
        setLiveSummary(null);
        setStaffSessions([]);
        setWithdrawals([]);
        setShiftStatus(null);
        setShiftInfo({ shiftId: null, counterId: null, counterName: null });
      }
    } catch (err) {
      console.error('Failed to fetch counter shift:', err);
    } finally {
      setLoading(false);
    }
  }, [setShiftStatus, setShiftInfo]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Fetch counters for the open dialog ──
  const fetchCounters = useCallback(async () => {
    try {
      const res = await fetch('/api/counters');
      const json = await res.json();
      if (json.success) {
        setCounters(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch counters:', err);
    }
  }, []);

  // ── Fetch history ──
  const fetchHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 30);
      const to = new Date();
      const res = await fetch(
        `/api/counter-shifts/history?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}&page=${page}&limit=10`
      );
      const json = await res.json();
      if (json.success) {
        setHistory(json.records || []);
        setHistoryTotalPages(json.pagination?.totalPages || 1);
        setHistoryPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch shift history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1);
  }, [fetchHistory]);

  // ── Open Shift ──
  const handleOpenShift = async () => {
    setOpenError('');
    if (!openCounterId) {
      setOpenError('Please select a counter');
      return;
    }
    const cash = parseFloat(openCashInput);
    if (isNaN(cash) || cash < 0) {
      setOpenError('Please enter a valid opening cash amount');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/counter-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterId: openCounterId,
          openingCash: cash,
          openingNote: openNote || null,
          userId: user?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowOpenDialog(false);
        setOpenCounterId('');
        setOpenCashInput('');
        setOpenNote('');
        await fetchData();
        fetchShiftStatus();
        fetchDayStatus(); // Refresh day status (auto-opened by backend)
        toast({ title: dayStatus !== 'Open' ? 'Day Started!' : 'Shift Opened', description: dayStatus !== 'Open' ? 'Day has been opened and counter shift is now active. You can start billing.' : 'Counter shift has been opened successfully.' });
      } else {
        setOpenError(json.error || 'Failed to open shift');
      }
    } catch {
      setOpenError('Failed to open shift. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Close Shift ──
  const handleCloseShift = async () => {
    setCloseError('');
    const cash = parseFloat(closeCashInput);
    if (isNaN(cash) || cash < 0) {
      setCloseError('Please enter a valid closing cash amount');
      return;
    }

    const expected = activeShift
      ? activeShift.openCash
        + (liveSummary?.totalCashSales || 0)
        - (liveSummary?.totalCashReturns || 0)
        - (liveSummary?.totalWithdrawals || 0)
      : 0;
    const diff = Math.round((cash - expected) * 100) / 100;

    if (diff !== 0 && !differenceReason.trim()) {
      setCloseError('A reason is required when there is a cash difference');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/counter-shifts/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift?.id,
          closingCash: cash,
          closingNote: closeNote || null,
          differenceReason: diff !== 0 ? differenceReason : null,
          userId: user?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowCloseDialog(false);
        setCloseCashInput('');
        setCloseNote('');
        setDifferenceReason('');
        await fetchData();
        fetchShiftStatus();
        fetchHistory(1);
        toast({ title: 'Shift Closed', description: 'Counter shift has been closed successfully.' });
      } else {
        setCloseError(json.error || 'Failed to close shift');
      }
    } catch {
      setCloseError('Failed to close shift. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Record Withdrawal ──
  const handleWithdrawal = async () => {
    setWithdrawError('');
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid withdrawal amount');
      return;
    }
    if (!withdrawReason.trim()) {
      setWithdrawError('Please enter a reason for the withdrawal');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/cash-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shiftId: activeShift?.id,
          amount,
          reason: withdrawReason,
          userId: user?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowWithdrawDialog(false);
        setWithdrawAmount('');
        setWithdrawReason('');
        await fetchData();
        toast({ title: 'Withdrawal Recorded', description: `₹${amount.toLocaleString('en-IN')} has been withdrawn.` });
      } else {
        setWithdrawError(json.error || 'Failed to record withdrawal');
      }
    } catch {
      setWithdrawError('Failed to record withdrawal. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── End Staff Session ──
  const handleEndSession = async (sessionId: string) => {
    setEndingSessionId(sessionId);
    try {
      const res = await fetch('/api/staff-sessions/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId: user?.id }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        toast({ title: 'Session Ended', description: 'Staff session has been ended.' });
      } else {
        toast({ title: 'Error', description: json.error || 'Failed to end session', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to end session', variant: 'destructive' });
    } finally {
      setEndingSessionId(null);
    }
  };

  // ── Print Shift Report ──
  const handlePrint = async () => {
    const shift = selectedHistory || activeShift;
    if (!shift) {
      toast({ title: 'Error', description: 'No shift data available to print.', variant: 'destructive' });
      return;
    }

    setPrintLoading(true);
    try {
      const pharmaName = 'uPharma';
      const now = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });
      const printDate = formatDateIST(new Date());
      const isClosed = shift.status === 'Closed';

      // Build staff session rows
      const staffRows = staffSessions.length > 0
        ? staffSessions.map((s) => `
            <tr>
              <td>${s.userName}</td>
              <td class="center">${s.userRole}</td>
              <td class="center">${formatTime(s.loginTime)}</td>
              <td class="right">${s.invoicesHandled}</td>
              <td class="right">${formatCurrency(s.salesAmount)}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="5" class="center">No staff sessions recorded</td></tr>';

      // Build withdrawal rows
      const withdrawalRows = withdrawals.length > 0
        ? withdrawals.map((w) => `
            <tr>
              <td>${formatTime(w.createdAt)}</td>
              <td class="right">${formatCurrency(w.amount)}</td>
              <td>${w.reason}</td>
              <td>${w.createdByUser?.name || '—'}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="4" class="center">No withdrawals recorded</td></tr>';

      const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);

      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Counter Shift Report - ${printDate}</title>
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
  <div class="sub">Counter Shift Report</div>
</div>

<div class="section">
  <table>
    <tr><td><strong>Counter</strong></td><td>${shift.counterName}</td>
        <td><strong>Status</strong></td><td class="center">${shift.status}</td></tr>
    <tr><td><strong>Opened At</strong></td><td>${formatTime(shift.createdAt)}${shift.openedByUser ? ' by ' + shift.openedByUser.name : ''}</td>
        <td><strong>${isClosed ? 'Closed At' : 'Running Since'}</strong></td><td>${isClosed && shift.closedAt ? formatTime(shift.closedAt) + (shift.closedByUser ? ' by ' + shift.closedByUser.name : '') : formatTime(shift.createdAt)}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Sales Summary</h2>
  <table>
    <tr><th>Sales Type</th><th class="right">Amount</th></tr>
    <tr><td>Total Sales</td><td class="right">${formatCurrency(shift.totalSales)}</td></tr>
    <tr><td>Cash Sales</td><td class="right">${formatCurrency(shift.totalCashSales)}</td></tr>
    <tr><td>Card Sales</td><td class="right">${formatCurrency(shift.totalCardSales)}</td></tr>
    <tr><td>UPI Sales</td><td class="right">${formatCurrency(shift.totalUpiSales)}</td></tr>
    <tr><td>Credit Sales</td><td class="right">${formatCurrency(shift.totalCreditSales)}</td></tr>
    <tr class="total-row"><td>Total Returns</td><td class="right">${formatCurrency(shift.totalReturns)}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Operations Summary</h2>
  <table>
    <tr><th>Metric</th><th class="right">Value</th></tr>
    <tr><td>Total Invoices</td><td class="right">${shift.totalInvoices}</td></tr>
    <tr><td>Total Return Notes</td><td class="right">${shift.totalReturnNotes}</td></tr>
    <tr><td>Total Withdrawals</td><td class="right">${formatCurrency(totalWithdrawals)}</td></tr>
  </table>
</div>

<div class="section">
  <h2>Cash Reconciliation</h2>
  <table>
    <tr><th>Description</th><th class="right">Amount</th></tr>
    <tr><td>Opening Cash</td><td class="right">${formatCurrency(shift.openCash)}</td></tr>
    <tr><td>(+) Cash Sales</td><td class="right">${formatCurrency(shift.totalCashSales)}</td></tr>
    <tr><td>(-) Cash Returns</td><td class="right">- ${formatCurrency(shift.totalCashReturns)}</td></tr>
    <tr><td>(-) Withdrawals</td><td class="right">- ${formatCurrency(totalWithdrawals)}</td></tr>
    <tr class="total-row"><td>Expected Cash in Drawer</td><td class="right">${formatCurrency(shift.expectedCash)}</td></tr>
    ${isClosed ? `
    <tr><td>Actual Cash Counted</td><td class="right">${formatCurrency(shift.closeCash)}</td></tr>
    <tr><td><strong>Difference</strong></td>
        <td class="right ${shift.difference === 0 ? 'diff-ok' : shift.difference < 0 ? 'diff-bad' : 'diff-over'}">${formatCurrency(shift.difference)}${shift.difference === 0 ? ' Matched' : ''}</td></tr>
    ` : ''}
  </table>
</div>

<div class="section">
  <h2>Staff Sessions</h2>
  <table>
    <tr><th>Staff</th><th class="center">Role</th><th class="center">Login Time</th><th class="right">Invoices</th><th class="right">Sales</th></tr>
    ${staffRows}
  </table>
</div>

<div class="section">
  <h2>Cash Withdrawals</h2>
  <table>
    <tr><th>Time</th><th class="right">Amount</th><th>Reason</th><th>By</th></tr>
    ${withdrawalRows}
  </table>
</div>

${shift.openingNote ? `<div class="notes-section"><strong>Opening Note: </strong><p>${shift.openingNote.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>` : ''}
${isClosed && shift.closingNote ? `<div class="notes-section"><strong>Closing Note: </strong><p>${shift.closingNote.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>` : ''}
${isClosed && shift.differenceReason ? `<div class="notes-section"><strong>Difference Reason: </strong><p>${shift.differenceReason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p></div>` : ''}

<div class="footer">
  <span>Generated: ${now}</span>
  <span>MultiNex Multi Solutions LLP | All Rights Reserved</span>
</div>

<div class="signatures">
  <div class="sig-block"><div class="sig-line">Opened By</div></div>
  <div class="sig-block"><div class="sig-line">Closed By</div></div>
  <div class="sig-block"><div class="sig-line">Authorized Signatory</div></div>
</div>

</body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);

      const printWindow = window.open(blobUrl, '_blank');
      if (!printWindow) {
        URL.revokeObjectURL(blobUrl);
        const blob2 = new Blob([html], { type: 'text/html' });
        const blobUrl2 = URL.createObjectURL(blob2);
        const link = document.createElement('a');
        link.href = blobUrl2;
        link.download = `counter-shift-report-${printDate}.html`;
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
  const isOpen = activeShift?.status === 'Open';
  const isClosed = activeShift?.status === 'Closed';
  const noShift = !activeShift;
  const openCash = activeShift?.openCash || 0;
  const cashSales = liveSummary?.totalCashSales || 0;
  const cashReturns = liveSummary?.totalCashReturns || 0;
  const totalWithdrawals = liveSummary?.totalWithdrawals || 0;
  const expectedCash = openCash + cashSales - cashReturns - totalWithdrawals;
  const closeCashNum = parseFloat(closeCashInput) || 0;
  const closeDiff = closeCashNum > 0 ? Math.round((closeCashNum - expectedCash) * 100) / 100 : 0;

  // ── Open dialog triggers ──
  const openOpenDialog = () => {
    setOpenError('');
    setOpenCounterId(user?.defaultCounterId || '');
    setOpenCashInput('');
    setOpenNote('');
    fetchCounters();
    setShowOpenDialog(true);
  };

  // ── Inline Start Your Day (no dialog) ──
  const [inlineCash, setInlineCash] = useState('');
  const [inlineCounter, setInlineCounter] = useState('');
  const [inlineNote, setInlineNote] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);

  // Pre-fill counter on mount if user has a default
  useEffect(() => {
    if (noShift && user?.defaultCounterId) {
      setInlineCounter(user.defaultCounterId);
    }
  }, [noShift, user?.defaultCounterId]);

  // Fetch counters for inline form
  useEffect(() => {
    if (noShift && counters.length === 0) {
      fetchCounters();
    }
  }, [noShift, counters.length, fetchCounters]);

  const handleInlineStart = async () => {
    setInlineError('');
    if (!inlineCounter) {
      setInlineError('Please select a counter');
      return;
    }
    const cash = parseFloat(inlineCash);
    if (isNaN(cash) || cash < 0) {
      setInlineError('Please enter a valid opening cash amount');
      return;
    }

    setInlineLoading(true);
    try {
      const res = await fetch('/api/counter-shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterId: inlineCounter,
          openingCash: cash,
          openingNote: inlineNote || null,
          userId: user?.id,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setInlineCash('');
        setInlineNote('');
        setInlineError('');
        await fetchData();
        fetchShiftStatus();
        fetchDayStatus();
        toast({ title: 'Day Started!', description: 'Day has been opened and counter shift is now active. Start billing now.' });
      } else {
        setInlineError(json.error || 'Failed to start. Please try again.');
      }
    } catch {
      setInlineError('Network error. Please try again.');
    } finally {
      setInlineLoading(false);
    }
  };

  const dayNotOpen = dayStatus !== 'Open';

  const openCloseDialog = () => {
    setCloseError('');
    setCloseCashInput('');
    setCloseNote('');
    setDifferenceReason('');
    setShowCloseDialog(true);
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-gray-200 rounded" />
          <div className="h-24 bg-gray-200 rounded-lg" />
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
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Counter Shift</h1>
          <p className="text-sm text-gray-500 mt-1">Manage counter shifts, staff sessions &amp; cash reconciliation</p>
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
            {noShift ? (
              <><CalendarClock className="w-3 h-3 mr-1.5 inline" />{dayNotOpen ? 'Day Not Started' : 'No Active Shift'}</>
            ) : isOpen ? (
              <><Unlock className="w-3 h-3 mr-1.5 inline" /> Shift Open</>
            ) : (
              <><Lock className="w-3 h-3 mr-1.5 inline" /> Shift Closed</>
            )}
          </Badge>
          <Button variant="outline" size="sm" className="gap-1.5 border-border/60 text-gray-600" onClick={() => { fetchData(); fetchHistory(historyPage); }}>
            <History className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Section A: Counter Status Banner
          ══════════════════════════════════════════ */}
      <Card className={`border-2 shadow-sm ${
        isOpen ? 'border-emerald-200 bg-emerald-50/30' :
        isClosed ? 'border-gray-200 bg-gray-50/30' :
        dayNotOpen ? 'border-emerald-300 bg-emerald-50/50' :
        'border-yellow-300 bg-yellow-50/50'
      }`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {noShift ? (
              dayNotOpen ? (
                <><CalendarClock className="w-4 h-4 text-emerald-600" /> Start Your Day</>
              ) : (
                <><AlertTriangle className="w-4 h-4 text-yellow-600" /> Counter Status — No Active Shift</>
              )
            ) : isOpen ? (
              <><Unlock className="w-4 h-4 text-emerald-600" /> Counter Status — Shift Open</>
            ) : (
              <><CheckCircle2 className="w-4 h-4 text-gray-500" /> Counter Status — Shift Closed</>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {noShift ? (
            dayNotOpen ? (
              /* ── UNIFIED: Start Your Day (inline form) ── */
              <div className="py-2">
                <div className="flex flex-col items-center text-center mb-5">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                    <CalendarClock className="w-7 h-7 text-emerald-600" />
                  </div>
                  <p className="text-lg text-gray-900 font-bold">Start Your Day</p>
                  <p className="text-sm text-gray-500 mt-1">Select your counter and enter opening cash to begin operations.</p>
                </div>
                {isAdminOrManager && (
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Select Counter</Label>
                      <Select value={inlineCounter} onValueChange={setInlineCounter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a counter..." />
                        </SelectTrigger>
                        <SelectContent>
                          {counters.filter(c => c.status === 'Active').map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}{c.location ? ` — ${c.location}` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Opening Cash (₹)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={inlineCash}
                        onChange={(e) => setInlineCash(e.target.value)}
                        className="text-lg"
                        min="0"
                        step="0.01"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleInlineStart(); }}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Note (optional)</Label>
                      <Textarea
                        placeholder="Any notes for this shift..."
                        value={inlineNote}
                        onChange={(e) => setInlineNote(e.target.value)}
                        rows={2}
                      />
                    </div>
                    {inlineError && (
                      <p className="text-sm text-red-600 font-medium">{inlineError}</p>
                    )}
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11 text-base font-semibold"
                      onClick={handleInlineStart}
                      disabled={inlineLoading}
                    >
                      {inlineLoading ? (
                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Starting...</>
                      ) : (
                        <><Unlock className="w-5 h-5" /> Start Your Day</>
                      )}
                    </Button>
                    <p className="text-xs text-gray-400 text-center">This will open the day and start your counter shift in one step.</p>
                  </div>
                )}
                {!isAdminOrManager && (
                  <p className="text-sm text-gray-500">Please ask your Admin or Manager to start the day.</p>
                )}
              </div>
            ) : (
              /* Day is open but no shift — show simple Open Counter Shift button */
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mb-3">
                  <MonitorCheck className="w-7 h-7 text-yellow-600" />
                </div>
                <p className="text-base text-gray-800 font-semibold">No counter shift is active</p>
                <p className="text-sm text-gray-500 mt-1">Open a counter shift to begin billing and tracking sales.</p>
                {isAdminOrManager && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 mt-4"
                    onClick={openOpenDialog}
                  >
                    <Unlock className="w-4 h-4" /> Open Counter Shift
                  </Button>
                )}
              </div>
            )
          ) : isOpen ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-gray-800">Counter: {activeShift.counterName}</span>
                </p>
                <p className="text-sm text-gray-600 mt-0.5">
                  <span className="font-medium text-gray-800">Shift opened at {formatTime(activeShift.createdAt)}</span>
                  {activeShift.openedByUser && (
                    <span className="text-gray-400"> by {activeShift.openedByUser.name}</span>
                  )}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  Opening Cash: <span className="font-semibold text-gray-800">{formatCurrency(openCash)}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>
                {isAdminOrManager && (
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    onClick={openCloseDialog}
                  >
                    <Lock className="w-3.5 h-3.5" /> Close Shift
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Counter</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{activeShift.counterName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Opened</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">
                  {formatTime(activeShift.createdAt)} {activeShift.openedByUser && `by ${activeShift.openedByUser.name}`}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Cash Difference</p>
                <p className={`text-sm font-semibold mt-0.5 ${
                  activeShift.difference === 0 ? 'text-emerald-600' : activeShift.difference > 0 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {formatCurrency(activeShift.difference)}
                  {activeShift.difference === 0 && <CheckCircle2 className="w-3.5 h-3.5 inline ml-1" />}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════
          Section C: Live Summary Cards (when Open or Closed)
          ══════════════════════════════════════════ */}
      {!noShift && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Shift Summary</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Sales"
                value={formatCurrency(liveSummary?.totalSales || activeShift.totalSales)}
                icon={IndianRupee}
                color="text-emerald-600"
                bg="bg-emerald-50"
                subLabel="All payment modes"
              />
              <StatCard
                label="Total Returns"
                value={formatCurrency(liveSummary?.totalReturns || activeShift.totalReturns)}
                icon={RotateCcw}
                color="text-red-500"
                bg="bg-red-50"
                subLabel={`${liveSummary?.totalReturnNotes || activeShift.totalReturnNotes} return notes`}
              />
              <StatCard
                label="Total Invoices"
                value={String(liveSummary?.totalInvoices || activeShift.totalInvoices)}
                icon={Receipt}
                color="text-teal-600"
                bg="bg-teal-50"
                subLabel="Completed sales"
              />
              <StatCard
                label="Total Withdrawals"
                value={formatCurrency(liveSummary?.totalWithdrawals || totalWithdrawals)}
                icon={Banknote}
                color="text-orange-600"
                bg="bg-orange-50"
                subLabel="Cash taken out"
              />
            </div>
          </div>

          {/* ── Section D: Payment Mode Breakdown ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Cash Sales</p>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalCashSales || activeShift.totalCashSales)}</p>
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
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalCardSales || activeShift.totalCardSales)}</p>
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
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalUpiSales || activeShift.totalUpiSales)}</p>
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
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(liveSummary?.totalCreditSales || activeShift.totalCreditSales)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Section E: Cash Reconciliation ── */}
          {isOpen ? (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-emerald-600" />
                  Cash Reconciliation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-0">
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600">Opening Cash</span>
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(openCash)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" /> Cash Sales
                    </span>
                    <span className="text-sm font-semibold text-emerald-700">+ {formatCurrency(cashSales)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" /> Cash Returns
                    </span>
                    <span className="text-sm font-semibold text-red-600">- {formatCurrency(cashReturns)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-orange-500" /> Withdrawals
                    </span>
                    <span className="text-sm font-semibold text-orange-600">- {formatCurrency(totalWithdrawals)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between py-3 bg-gray-50 -mx-6 px-6 rounded">
                    <span className="text-sm font-semibold text-gray-800">Expected Cash in Drawer</span>
                    <span className="text-base font-bold text-gray-900">{formatCurrency(expectedCash)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : isClosed ? (
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
                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(activeShift.openCash)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" /> Cash Sales
                    </span>
                    <span className="text-sm font-semibold text-emerald-700">+ {formatCurrency(activeShift.totalCashSales)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" /> Cash Returns
                    </span>
                    <span className="text-sm font-semibold text-red-600">- {formatCurrency(activeShift.totalCashReturns)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-dashed border-border/60">
                    <span className="text-sm text-gray-600 flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-orange-500" /> Withdrawals
                    </span>
                    <span className="text-sm font-semibold text-orange-600">- {formatCurrency(activeShift.totalWithdrawals)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between py-3 bg-gray-50 -mx-6 px-6 rounded">
                    <span className="text-sm font-semibold text-gray-800">Expected Cash</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(activeShift.expectedCash)}</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-t border-dashed border-border/60">
                    <span className="text-sm font-medium text-gray-800">Actual Cash Counted</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(activeShift.closeCash)}</span>
                  </div>
                  <div className={`flex items-center justify-between py-3 -mx-6 px-6 rounded ${
                    activeShift.difference === 0 ? 'bg-emerald-50' : activeShift.difference < 0 ? 'bg-red-50' : 'bg-blue-50'
                  }`}>
                    <span className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                      {activeShift.difference === 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      Difference
                    </span>
                    <span className={`text-base font-bold ${
                      activeShift.difference === 0 ? 'text-emerald-700' : activeShift.difference < 0 ? 'text-red-700' : 'text-blue-700'
                    }`}>
                      {formatCurrency(activeShift.difference)}
                      {activeShift.difference === 0 && ' ✓'}
                    </span>
                  </div>
                  {activeShift.differenceReason && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Difference Reason</p>
                      <p className="text-sm text-gray-600">{activeShift.differenceReason}</p>
                    </div>
                  )}
                  {activeShift.closingNote && (
                    <div className="mt-2 pt-2 border-t border-border/60">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Closing Note</p>
                      <p className="text-sm text-gray-600">{activeShift.closingNote}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* ── Section G: Active Staff Panel ── */}
          {isOpen && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Active Staff
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 ml-1">
                    {staffSessions.length} online
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {staffSessions.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No active staff sessions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Staff Name</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Role</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Login Time</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Invoices</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Sales</th>
                          <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staffSessions.map((session) => (
                          <tr key={session.id} className="border-b border-border/50 last:border-0">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">{session.userName.charAt(0)}</span>
                                </div>
                                <span className="text-sm font-medium text-gray-900">{session.userName}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-sm text-gray-500">{session.userRole}</td>
                            <td className="py-3 pr-4 text-sm text-gray-500">{formatTime(session.loginTime)}</td>
                            <td className="py-3 pr-4 text-sm text-right font-medium text-gray-900">{session.invoicesHandled}</td>
                            <td className="py-3 pr-4 text-sm text-right font-medium text-emerald-700">{formatCurrency(session.salesAmount)}</td>
                            <td className="py-3 text-center">
                              {isAdminOrManager && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                  disabled={endingSessionId === session.id}
                                  onClick={() => handleEndSession(session.id)}
                                >
                                  <LogOut className="w-3 h-3" />
                                  {endingSessionId === session.id ? 'Ending...' : 'End Session'}
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Section H: Cash Withdrawal ── */}
          {isOpen && (
            <Card className="border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Banknote className="w-4 h-4 text-orange-600" />
                    Cash Withdrawals
                    {withdrawals.length > 0 && (
                      <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 ml-1">
                        {formatCurrency(withdrawals.reduce((s, w) => s + w.amount, 0))}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-orange-700 border-orange-200 hover:bg-orange-50"
                    onClick={() => { setWithdrawError(''); setWithdrawAmount(''); setWithdrawReason(''); setShowWithdrawDialog(true); }}
                  >
                    <Banknote className="w-3.5 h-3.5" /> Record Withdrawal
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {withdrawals.length === 0 ? (
                  <div className="text-center py-6">
                    <Banknote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No withdrawals recorded for this shift</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Time</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Amount</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Reason</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {withdrawals.map((w) => (
                          <tr key={w.id} className="border-b border-border/50 last:border-0">
                            <td className="py-3 pr-4 text-sm text-gray-500">{formatTime(w.createdAt)}</td>
                            <td className="py-3 pr-4 text-sm text-right font-semibold text-orange-600">{formatCurrency(w.amount)}</td>
                            <td className="py-3 pr-4 text-sm text-gray-700">{w.reason}</td>
                            <td className="py-3 text-sm text-gray-500">{w.createdByUser?.name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Action Buttons ── */}
          <div className="flex flex-wrap gap-3">
            {isAdminOrManager && noShift && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={openOpenDialog}
              >
                <Unlock className="w-4 h-4" /> Open Counter Shift
              </Button>
            )}
            {isAdminOrManager && isOpen && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={openCloseDialog}
              >
                <Lock className="w-4 h-4" /> Close Shift
              </Button>
            )}
            {(isClosed || isOpen) && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={() => { setSelectedHistory(null); handlePrint(); }}
                disabled={printLoading}
              >
                <Printer className={`w-4 h-4 ${printLoading ? 'animate-pulse' : ''}`} />
                {printLoading ? 'Generating Report...' : 'Print Shift Report'}
              </Button>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════
          Section I: Shift History Table
          ══════════════════════════════════════════ */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-gray-500" /> Shift History
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
              <p className="text-sm text-gray-400">No shift records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Counter</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Opened By</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Sales</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Cash</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Returns</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3 pr-4">Difference</th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedHistory(record)}
                    >
                      <td className="py-3 pr-4 text-sm font-medium text-gray-900">{formatDate(record.createdAt)}</td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{record.counterName}</td>
                      <td className="py-3 pr-4 text-sm text-gray-600">{record.openedByUser?.name || '—'}</td>
                      <td className="py-3 pr-4 text-sm text-right font-medium text-gray-900">{formatCurrency(record.totalSales)}</td>
                      <td className="py-3 pr-4 text-sm text-right text-emerald-700">{formatCurrency(record.totalCashSales)}</td>
                      <td className="py-3 pr-4 text-sm text-right text-red-600">{formatCurrency(record.totalReturns)}</td>
                      <td className={`py-3 pr-4 text-sm text-right font-semibold ${
                        record.difference === 0 ? 'text-emerald-600' : record.difference < 0 ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {formatCurrency(record.difference)}
                        {record.difference === 0 && ' ✓'}
                      </td>
                      <td className="py-3 text-center">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

      {/* ══════════════════════════════════════════
          Dialogs
          ══════════════════════════════════════════ */}

      {/* ── B: Shift Opening Dialog ── */}
      <Dialog open={showOpenDialog} onOpenChange={(open) => { setShowOpenDialog(open); if (!open) setOpenError(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="w-5 h-5 text-emerald-600" />
              Open Counter Shift
            </DialogTitle>
            <DialogDescription>
              Select a counter and enter the opening cash amount to start the shift.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="counter-select">Counter *</Label>
              <Select value={openCounterId} onValueChange={setOpenCounterId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a counter" />
                </SelectTrigger>
                <SelectContent>
                  {counters.map((counter) => (
                    <SelectItem key={counter.id} value={counter.id}>
                      {counter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="open-cash">Opening Cash (₹) *</Label>
              <Input
                id="open-cash"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter opening cash amount"
                value={openCashInput}
                onChange={(e) => setOpenCashInput(e.target.value)}
                className="text-right font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="open-note">Opening Note (optional)</Label>
              <Textarea
                id="open-note"
                placeholder="Any notes for this shift..."
                value={openNote}
                onChange={(e) => setOpenNote(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            {openError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {openError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowOpenDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleOpenShift}
              disabled={actionLoading}
            >
              {actionLoading ? 'Opening...' : 'Open Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── F: Shift Closing Dialog ── */}
      <Dialog open={showCloseDialog} onOpenChange={(open) => { setShowCloseDialog(open); if (!open) setCloseError(''); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-600" />
              Close Counter Shift
            </DialogTitle>
            <DialogDescription>
              Review the summary and enter the closing cash amount.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Counter</span>
                <span className="font-medium text-gray-900">{activeShift?.counterName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Sales</span>
                <span className="font-medium text-gray-900">{formatCurrency(liveSummary?.totalSales || activeShift?.totalSales || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Returns</span>
                <span className="font-medium text-red-600">{formatCurrency(liveSummary?.totalReturns || activeShift?.totalReturns || 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Invoices</span>
                <span className="font-medium text-gray-900">{liveSummary?.totalInvoices || activeShift?.totalInvoices || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Withdrawals</span>
                <span className="font-medium text-orange-600">{formatCurrency(totalWithdrawals)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Expected Cash</span>
                <span className="font-bold text-gray-900">{formatCurrency(expectedCash)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="close-cash">Closing Cash (₹) *</Label>
              <Input
                id="close-cash"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter actual cash in drawer"
                value={closeCashInput}
                onChange={(e) => setCloseCashInput(e.target.value)}
                className="text-right font-semibold"
              />
            </div>

            {/* Live difference preview */}
            {closeCashNum > 0 && (
              <div className={`rounded-lg p-3 flex justify-between items-center ${
                closeDiff === 0 ? 'bg-emerald-50' : closeDiff < 0 ? 'bg-red-50' : 'bg-blue-50'
              }`}>
                <span className="text-sm font-semibold flex items-center gap-1.5">
                  {closeDiff === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  Difference
                </span>
                <span className={`text-base font-bold ${
                  closeDiff === 0 ? 'text-emerald-700' : closeDiff < 0 ? 'text-red-700' : 'text-blue-700'
                }`}>
                  {formatCurrency(closeDiff)}
                  {closeDiff === 0 && ' ✓'}
                </span>
              </div>
            )}

            {/* Mandatory reason if difference != 0 */}
            {closeCashNum > 0 && closeDiff !== 0 && (
              <div className="space-y-2">
                <Label htmlFor="diff-reason" className="text-red-600">
                  Difference Reason * <span className="text-xs text-red-400">(required when difference ≠ 0)</span>
                </Label>
                <Textarea
                  id="diff-reason"
                  placeholder="Explain the cash difference..."
                  value={differenceReason}
                  onChange={(e) => setDifferenceReason(e.target.value)}
                  rows={2}
                  className="text-sm border-red-200 focus-visible:ring-red-200"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="close-note">Closing Note (optional)</Label>
              <Textarea
                id="close-note"
                placeholder="Any additional notes..."
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>

            {closeError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {closeError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCloseShift}
              disabled={actionLoading}
            >
              {actionLoading ? 'Closing...' : 'Close Shift'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── H: Withdrawal Dialog ── */}
      <Dialog open={showWithdrawDialog} onOpenChange={(open) => { setShowWithdrawDialog(open); if (!open) setWithdrawError(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="w-5 h-5 text-orange-600" />
              Record Cash Withdrawal
            </DialogTitle>
            <DialogDescription>
              Record a cash withdrawal from the counter drawer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (₹) *</Label>
              <Input
                id="withdraw-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter withdrawal amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="text-right font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="withdraw-reason">Reason *</Label>
              <Textarea
                id="withdraw-reason"
                placeholder="Reason for withdrawal (e.g., Petty cash, Expenses...)"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            {withdrawError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {withdrawError}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={handleWithdrawal}
              disabled={actionLoading}
            >
              {actionLoading ? 'Recording...' : 'Record Withdrawal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── History Detail Dialog ── */}
      <Dialog open={!!selectedHistory} onOpenChange={() => setSelectedHistory(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Shift Detail — {selectedHistory && selectedHistory.counterName}
            </DialogTitle>
            <DialogDescription>
              {selectedHistory && `${formatDate(selectedHistory.createdAt)} at ${formatTime(selectedHistory.createdAt)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedHistory && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={`text-xs ${
                    selectedHistory.status === 'Closed'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {selectedHistory.status}
                </Badge>
                <span className="text-sm text-gray-500">
                  Opened by {selectedHistory.openedByUser?.name || '—'}
                  {selectedHistory.openedByUser && ` at ${formatTime(selectedHistory.createdAt)}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Total Invoices</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{selectedHistory.totalInvoices}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Total Sales</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{formatCurrency(selectedHistory.totalSales)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Cash Sales</p>
                  <p className="text-sm font-semibold text-emerald-700 mt-0.5">{formatCurrency(selectedHistory.totalCashSales)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Card Sales</p>
                  <p className="text-sm font-semibold text-blue-700 mt-0.5">{formatCurrency(selectedHistory.totalCardSales)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">UPI Sales</p>
                  <p className="text-sm font-semibold text-purple-700 mt-0.5">{formatCurrency(selectedHistory.totalUpiSales)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 uppercase">Credit Sales</p>
                  <p className="text-sm font-semibold text-amber-700 mt-0.5">{formatCurrency(selectedHistory.totalCreditSales)}</p>
                </div>
              </div>

              {/* Reconciliation */}
              <div className="space-y-0 border border-border/60 rounded-lg overflow-hidden">
                <div className="flex justify-between px-4 py-2.5 bg-gray-50">
                  <span className="text-sm text-gray-500">Opening Cash</span>
                  <span className="text-sm font-semibold">{formatCurrency(selectedHistory.openCash)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 border-t border-dashed border-border/60">
                  <span className="text-sm text-gray-500">+ Cash Sales</span>
                  <span className="text-sm font-semibold text-emerald-700">+ {formatCurrency(selectedHistory.totalCashSales)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 border-t border-dashed border-border/60">
                  <span className="text-sm text-gray-500">- Cash Returns</span>
                  <span className="text-sm font-semibold text-red-600">- {formatCurrency(selectedHistory.totalCashReturns)}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5 border-t border-dashed border-border/60">
                  <span className="text-sm text-gray-500">- Withdrawals</span>
                  <span className="text-sm font-semibold text-orange-600">- {formatCurrency(selectedHistory.totalWithdrawals)}</span>
                </div>
                <Separator />
                <div className="flex justify-between px-4 py-3 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-800">Expected Cash</span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(selectedHistory.expectedCash)}</span>
                </div>
                {selectedHistory.status === 'Closed' && (
                  <>
                    <div className="flex justify-between px-4 py-2.5 border-t border-dashed border-border/60">
                      <span className="text-sm text-gray-600">Actual Cash</span>
                      <span className="text-sm font-bold">{formatCurrency(selectedHistory.closeCash)}</span>
                    </div>
                    <div className={`flex justify-between px-4 py-3 ${
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
                  </>
                )}
              </div>

              {selectedHistory.openedByUser && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Opened By</p>
                  <p className="text-sm font-medium text-gray-800">{selectedHistory.openedByUser.name}</p>
                  <p className="text-xs text-gray-400">{formatTime(selectedHistory.createdAt)}</p>
                </div>
              )}
              {selectedHistory.status === 'Closed' && selectedHistory.closedByUser && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Closed By</p>
                  <p className="text-sm font-medium text-gray-800">{selectedHistory.closedByUser.name}</p>
                  {selectedHistory.closedAt && <p className="text-xs text-gray-400">{formatTime(selectedHistory.closedAt)}</p>}
                </div>
              )}
              {selectedHistory.differenceReason && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Difference Reason</p>
                  <p className="text-sm text-gray-700">{selectedHistory.differenceReason}</p>
                </div>
              )}
              {selectedHistory.closingNote && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Closing Note</p>
                  <p className="text-sm text-gray-700">{selectedHistory.closingNote}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  onClick={() => handlePrint()}
                  disabled={printLoading}
                >
                  <Printer className={`w-4 h-4 ${printLoading ? 'animate-pulse' : ''}`} />
                  {printLoading ? 'Generating...' : 'Print Report'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedHistory(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
