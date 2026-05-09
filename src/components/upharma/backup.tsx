'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Database,
  Download,
  Upload,
  Clock,
  AlertTriangle,
  Shield,
  BarChart3,
  Trash2,
  FileJson,
  HardDrive,
  Users,
  ShoppingCart,
  Package,
  Pill,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DataSummary {
  medicines: number;
  customers: number;
  suppliers: number;
  sales: number;
  purchases: number;
  batches: number;
  returns: number;
}

interface BackupRecord {
  date: string;
  records: DataSummary;
  filename: string;
}

interface ImportPreview {
  medicines: number;
  sales: number;
  customers: number;
  suppliers: number;
  purchases: number;
  returns: number;
  batches: number;
  settings: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const BACKUP_HISTORY_KEY = 'upharma-backup-history';
const MAX_HISTORY = 10;

const ENDPOINTS = [
  { key: 'medicines', url: '/api/medicines' },
  { key: 'sales', url: '/api/sales' },
  { key: 'customers', url: '/api/customers' },
  { key: 'suppliers', url: '/api/suppliers' },
  { key: 'purchases', url: '/api/purchases' },
  { key: 'returns', url: '/api/returns' },
  { key: 'batches', url: '/api/batches' },
  { key: 'settings', url: '/api/settings' },
] as const;

const STAT_CARDS: {
  label: string;
  key: keyof DataSummary;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { label: 'Total Medicines', key: 'medicines', icon: Pill, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Total Customers', key: 'customers', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Total Suppliers', key: 'suppliers', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
  { label: 'Total Sales', key: 'sales', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'Total Purchases', key: 'purchases', icon: HardDrive, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { label: 'Total Batches', key: 'batches', icon: Database, color: 'text-amber-600', bg: 'bg-amber-50' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getBackupHistory(): BackupRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUP_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBackupHistory(records: BackupRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(records.slice(0, MAX_HISTORY)));
}

function addBackupRecord(records: DataSummary, filename: string) {
  const history = getBackupHistory();
  history.unshift({
    date: new Date().toISOString(),
    records,
    filename,
  });
  saveBackupHistory(history);
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function BackupPage() {
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupRecord[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current data summary
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data: Record<string, unknown> = {};
      for (const ep of ENDPOINTS) {
        const res = await fetch(ep.url);
        if (res.ok) {
          const json = await res.json();
          data[ep.key] = Array.isArray(json.data) ? json.data : [];
        } else {
          data[ep.key] = [];
        }
      }
      setSummary({
        medicines: (data.medicines as unknown[]).length,
        customers: (data.customers as unknown[]).length,
        suppliers: (data.suppliers as unknown[]).length,
        sales: (data.sales as unknown[]).length,
        purchases: (data.purchases as unknown[]).length,
        batches: (data.batches as unknown[]).length,
        returns: (data.returns as unknown[]).length,
      });
    } catch (err) {
      console.error('Failed to fetch data summary:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
    setBackupHistory(getBackupHistory());
  }, [fetchSummary]);

  // ─── Export ────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);
    setExportProgress('Starting export...');

    try {
      const data: Record<string, unknown> = {};

      for (let i = 0; i < ENDPOINTS.length; i++) {
        const ep = ENDPOINTS[i];
        setExportProgress(`Fetching ${ep.key}...`);
        const res = await fetch(ep.url);
        if (res.ok) {
          const json = await res.json();
          data[ep.key] = json.data;
        } else {
          data[ep.key] = [];
        }
      }

      setExportProgress('Generating backup file...');

      const backupPayload = {
        _metadata: {
          app: 'Upharma ERP',
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          exportedBy: 'user',
        },
        ...data,
      };

      const blob = new Blob([JSON.stringify(backupPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upharma-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const counts: DataSummary = {
        medicines: (data.medicines as unknown[]).length,
        sales: (data.sales as unknown[]).length,
        customers: (data.customers as unknown[]).length,
        suppliers: (data.suppliers as unknown[]).length,
        purchases: (data.purchases as unknown[]).length,
        batches: (data.batches as unknown[]).length,
        returns: (data.returns as unknown[]).length,
      };

      addBackupRecord(counts, a.download);
      setBackupHistory(getBackupHistory());

      // Refresh summary after export
      setSummary(counts);
      setExportSuccess(true);
      setExportProgress('');
    } catch (err) {
      console.error('Export failed:', err);
      setExportProgress('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ─── Import ────────────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const preview: ImportPreview = {
          medicines: Array.isArray(parsed.medicines) ? parsed.medicines.length : 0,
          sales: Array.isArray(parsed.sales) ? parsed.sales.length : 0,
          customers: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
          suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers.length : 0,
          purchases: Array.isArray(parsed.purchases) ? parsed.purchases.length : 0,
          returns: Array.isArray(parsed.returns) ? parsed.returns.length : 0,
          batches: Array.isArray(parsed.batches) ? parsed.batches.length : 0,
          settings: Array.isArray(parsed.settings) ? parsed.settings.length : 0,
        };
        setImportPreview(preview);
      } catch {
        setImportPreview(null);
        setImportResult({ success: false, message: 'Invalid JSON file. Please select a valid Upharma backup file.' });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importFile || !importPreview) return;

    setImporting(true);
    setImportResult(null);

    try {
      const reader = new FileReader();
      const content = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target?.result;
          if (typeof result === 'string') resolve(result);
          else reject(new Error('Failed to read file'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(importFile);
      });

      const parsed = JSON.parse(content);

      // POST to individual endpoints
      const importEndpoints = [
        { key: 'settings', url: '/api/settings' },
        { key: 'suppliers', url: '/api/suppliers' },
        { key: 'customers', url: '/api/customers' },
        { key: 'medicines', url: '/api/medicines' },
        { key: 'batches', url: '/api/batches' },
        { key: 'purchases', url: '/api/purchases' },
        { key: 'sales', url: '/api/sales' },
        { key: 'returns', url: '/api/returns' },
      ];

      let imported = 0;
      let total = 0;

      for (const ep of importEndpoints) {
        const items = parsed[ep.key];
        if (!Array.isArray(items) || items.length === 0) continue;
        total += items.length;

        try {
          const res = await fetch(ep.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: items }),
          });
          if (res.ok) {
            const json = await res.json();
            imported += json.count || items.length;
          }
        } catch {
          // Continue with other endpoints even if one fails
        }
      }

      setImportResult({
        success: true,
        message: `Successfully imported ${imported} of ${total} records. Please refresh the page to see updated data.`,
      });

      // Refresh summary
      fetchSummary();
    } catch (err) {
      console.error('Import failed:', err);
      setImportResult({
        success: false,
        message: 'Import failed. Please check the file format and try again.',
      });
    } finally {
      setImporting(false);
    }
  };

  const clearImportState = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const handleResetAll = async () => {
    try {
      for (const ep of ENDPOINTS) {
        try {
          await fetch(ep.url, { method: 'DELETE' });
        } catch {
          // Continue
        }
      }
      setResetDone(true);
      fetchSummary();
      setTimeout(() => setResetDone(false), 4000);
    } catch {
      // Silent fail
    }
  };

  // ─── Render: Loading ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-full">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-56 bg-gray-200 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-gray-200 rounded-lg" />
            <div className="h-64 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Database Backup</h1>
        <p className="text-sm text-gray-500 mt-1">Export, import, and manage your Upharma database backups</p>
      </div>

      {/* ─── Data Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAT_CARDS.map(({ label, key, icon: Icon, color, bg }) => (
          <Card key={key} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500 font-medium">{label}</p>
                  <p className="text-xl font-bold text-gray-900">
                    {summary ? summary[key].toLocaleString('en-IN') : '—'}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Export & Import ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <Download className="w-4.5 h-4.5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Export Database</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Download a full backup of all your data
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileJson className="w-4 h-4 text-emerald-500" />
                Backup includes:
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                {ENDPOINTS.map((ep) => (
                  <div key={ep.key} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="capitalize">{ep.key}</span>
                  </div>
                ))}
              </div>
            </div>

            {exporting && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{exportProgress}</span>
              </div>
            )}

            {exportSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
                <span>Backup downloaded successfully!</span>
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={exporting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Backup
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Upload className="w-4.5 h-4.5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Import Database</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Restore data from a previously exported backup
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File upload area */}
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const file = e.dataTransfer.files?.[0];
                if (file && file.name.endsWith('.json')) {
                  const dt = new DataTransfer();
                  dt.items.add(file);
                  if (fileInputRef.current) {
                    fileInputRef.current.files = dt.files;
                    fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
              }}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 font-medium">
                {importFile ? importFile.name : 'Select or drag a backup file'}
              </p>
              <p className="text-xs text-gray-400 mt-1">Supports .json files exported from Upharma</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Import preview */}
            {importPreview && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Preview:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                    onClick={clearImportState}
                  >
                    Clear
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    Object.entries(importPreview) as [string, number][]
                  ).map(([key, count]) => (
                    <div
                      key={key}
                      className="bg-white rounded-md px-2 py-1.5 text-center border border-blue-100"
                    >
                      <p className="text-xs text-gray-500 capitalize">{key}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {count.toLocaleString('en-IN')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Import result */}
            {importResult && (
              <div
                className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 border ${
                  importResult.success
                    ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                }`}
              >
                {importResult.success ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{importResult.message}</span>
              </div>
            )}

            <Button
              onClick={() => setImportDialogOpen(true)}
              disabled={!importFile || !importPreview}
              variant="outline"
              className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 gap-2"
            >
              <Upload className="w-4 h-4" />
              Import Data
            </Button>

            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Confirm Data Import
                  </DialogTitle>
                  <DialogDescription>
                    This will import data from the backup file into your database. Existing records with
                    matching IDs will be skipped. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                {importPreview && (
                  <div className="rounded-lg bg-gray-50 border p-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Records to import:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      {(
                        Object.entries(importPreview) as [string, number][]
                      ).map(([key, count]) => (
                        <div key={key} className="space-y-0.5">
                          <p className="text-xs text-gray-500 capitalize">{key}</p>
                          <p className="text-sm font-semibold text-gray-900">{count}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      setImportDialogOpen(false);
                      handleImport();
                    }}
                    disabled={importing}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Confirm Import
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      {/* ─── Backup History ──────────────────────────────────────────────────── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="w-4.5 h-4.5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">Backup History</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  Recent backup operations stored locally
                </CardDescription>
              </div>
            </div>
            {backupHistory.length > 0 && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                {backupHistory.length} record{backupHistory.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {backupHistory.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No backup history yet</p>
              <p className="text-xs text-gray-400 mt-1">Export a backup to see it here</p>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto space-y-2">
              {backupHistory.map((record, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/60 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{record.filename}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500">{formatDate(record.date)}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700">
                          {record.records.medicines} Med
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700">
                          {record.records.sales} Sales
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700">
                          {record.records.customers} Cust
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-orange-50 text-orange-700">
                          {record.records.suppliers} Supp
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-cyan-50 text-cyan-700">
                          {record.records.purchases} Purch
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700">
                          {record.records.batches} Batch
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Auto-Backup Info ────────────────────────────────────────────────── */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <CardTitle className="text-base font-semibold text-blue-900">
              Auto-Backup Information
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-2 text-sm text-blue-800">
              <p>
                Your Upharma data is stored locally in a <strong>SQLite database</strong> on this device.
                This means your data persists across sessions within this environment.
              </p>
              <p>
                We <strong>recommend exporting a backup regularly</strong> to keep your data safe. You can
                download a complete JSON backup using the Export button above and store it securely.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-blue-600 font-medium">
                  Tip: Schedule weekly backups to ensure you never lose critical pharmacy data.
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Danger Zone ─────────────────────────────────────────────────────── */}
      <Card className="border-red-200 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-red-900">Danger Zone</CardTitle>
              <CardDescription className="text-xs text-red-600">
                Irreversible and destructive actions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resetDone && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200 mb-4">
              <CheckCircle2 className="w-4 h-4" />
              <span>All data has been reset successfully.</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-red-200 bg-red-50/50">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold text-red-900">Reset All Data</p>
              </div>
              <p className="text-xs text-red-600 ml-6">
                Permanently delete all medicines, sales, purchases, customers, suppliers, batches, returns,
                and settings from the database. This action <strong>cannot be undone</strong>.
              </p>
              <p className="text-xs text-red-500 ml-6 font-medium">
                For development and testing purposes only.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2 bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-2">
                      <p>
                        This will permanently delete <strong>all data</strong> from your Upharma database
                        including:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-0.5 ml-2">
                        <li>All medicines and their details</li>
                        <li>All sales records and invoices</li>
                        <li>All purchase records</li>
                        <li>All customers and suppliers</li>
                        <li>All batches and inventory data</li>
                        <li>All return records</li>
                        <li>All app settings</li>
                      </ul>
                      <p className="font-semibold text-red-700">
                        This action cannot be undone. Please export a backup first if you want to preserve
                        your data.
                      </p>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAll}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Yes, delete everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
