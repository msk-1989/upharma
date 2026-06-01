'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, X, Loader2, Trash2, Eye, FileWarning, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ───────────────────────────────────────────────────────────────────────

interface ParsedRow {
  _row: number;
  name: string;
  genericName: string;
  manufacturer: string;
  category: string;
  drugSchedule: string;
  hsnCode: string;
  gstPercent: number;
  barcode: string;
  baseUnit: string;
  unitsPerStrip: number;
  stripsPerBox: number;
  allowLooseSale: string;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
  reorderLevel: number;
  batchNo: string;
  expiryDate: string;
  stockQty: number;
  _status?: 'valid' | 'warning' | 'error';
  _message?: string;
}

interface UploadResult {
  created: number;
  updated: number;
  errors: number;
  details: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function validateRow(row: ParsedRow): void {
  row._status = 'valid';
  row._message = '';

  if (!row.name) {
    row._status = 'error';
    row._message = 'Missing medicine name';
    return;
  }

  const warnings: string[] = [];

  if (row.purchaseRate <= 0 && row.saleRate <= 0 && row.mrp <= 0) {
    warnings.push('No pricing set');
  }
  if (row.batchNo && !row.expiryDate) {
    warnings.push('Batch has no expiry date');
  }
  if (row.batchNo && row.stockQty <= 0) {
    warnings.push('Batch has no stock qty');
  }
  if (!row.batchNo && !row.expiryDate && row.stockQty <= 0) {
    // No inventory data — fine for medicine-only upload
  }

  const validSchedules = ['OTC', 'H', 'H1', 'X', 'G', 'K', 'C', 'C1', 'N', 'P'];
  if (row.drugSchedule && !validSchedules.includes(row.drugSchedule.toUpperCase())) {
    warnings.push(`Invalid schedule: ${row.drugSchedule}`);
  }

  if (warnings.length > 0) {
    row._status = 'warning';
    row._message = warnings.join('; ');
  }
}

// ─── Component ────────────────────────────────────────────────────────────────────

export function BulkUploadPage() {
  const { user } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [rawFileName, setRawFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [stats, setStats] = useState({ valid: 0, warnings: 0, errors: 0 });

  // ─── Download Template ────────────────────────────────────────────────────

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/medicines/bulk-upload/template');
      if (!res.ok) throw new Error('Failed to download template');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uPharma_Bulk_Upload_Template.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setParseError(msg);
    }
  };

  // ─── Parse File ───────────────────────────────────────────────────────────

  const parseFile = useCallback(async (file: File) => {
    setParseError('');
    setUploadResult(null);
    setParsedData([]);

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setParseError('Only .xlsx and .xls files are supported. Please download the sample template first.');
      return;
    }

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });

      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

      if (jsonData.length === 0) {
        setParseError('The file is empty. Please add medicine data before uploading.');
        return;
      }

      // Map Excel columns to our fields
      const mapped: ParsedRow[] = jsonData.map((row, idx) => {
        const parsed: ParsedRow = {
          _row: idx + 2, // Excel rows are 1-indexed, +1 for header
          name: (row['Name *'] || row['Name'] || row['name'] || '').toString().trim(),
          genericName: (row['Generic Name'] || row['genericName'] || '').toString().trim(),
          manufacturer: (row['Manufacturer'] || row['manufacturer'] || '').toString().trim(),
          category: (row['Category'] || row['category'] || 'General').toString().trim(),
          drugSchedule: (row['Drug Schedule'] || row['drugSchedule'] || 'OTC').toString().trim(),
          hsnCode: (row['HSN Code'] || row['hsnCode'] || '').toString().trim(),
          gstPercent: parseFloat(row['GST %'] as string) || parseFloat(row['gstPercent'] as string) || 12,
          barcode: (row['Barcode'] || row['barcode'] || '').toString().trim(),
          baseUnit: (row['Base Unit'] || row['baseUnit'] || 'Tablet').toString().trim(),
          unitsPerStrip: parseInt(row['Units/Strip'] as string) || parseInt(row['unitsPerStrip'] as string) || 10,
          stripsPerBox: parseInt(row['Strips/Box'] as string) || parseInt(row['stripsPerBox'] as string) || 10,
          allowLooseSale: (row['Allow Loose Sale'] || row['allowLooseSale'] || 'Yes').toString().trim(),
          purchaseRate: parseFloat(row['Purchase Rate'] as string) || parseFloat(row['purchaseRate'] as string) || 0,
          saleRate: parseFloat(row['Sale Rate'] as string) || parseFloat(row['saleRate'] as string) || 0,
          mrp: parseFloat(row['MRP'] as string) || parseFloat(row['mrp'] as string) || 0,
          reorderLevel: parseInt(row['Reorder Level'] as string) || parseInt(row['reorderLevel'] as string) || 20,
          batchNo: (row['Batch No'] || row['batchNo'] || '').toString().trim(),
          expiryDate: (row['Expiry Date'] || row['expiryDate'] || '').toString().trim(),
          stockQty: parseInt(row['Stock Qty (units)'] as string) || parseInt(row['stockQty'] as string) || 0,
        };

        validateRow(parsed);
        return parsed;
      });

      setParsedData(mapped);
      setRawFileName(file.name);

      // Calculate stats
      const valid = mapped.filter(r => r._status === 'valid').length;
      const warnings = mapped.filter(r => r._status === 'warning').length;
      const errors = mapped.filter(r => r._status === 'error').length;
      setStats({ valid, warnings, errors });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse file';
      setParseError(`Error parsing file: ${msg}`);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  // ─── Upload ────────────────────────────────────────────────────────────────

  const handleUpload = async () => {
    setUploading(true);
    setUploadResult(null);

    const validRows = parsedData.filter(r => r._status !== 'error');
    const { _row, _status, _message, ...cleaned } = validRows[0] || {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const medicinesData = validRows.map(({ _row: _1, _status: _2, _message: _3, ...rest }) => rest);

    try {
      const res = await fetch('/api/medicines/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines: medicinesData }),
      });
      const data = await res.json();

      if (data.success) {
        setUploadResult(data.data);
      } else {
        setParseError(data.error || 'Upload failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setParseError(`Upload error: ${msg}`);
    }

    setUploading(false);
  };

  // ─── Reset ───────────────────────────────────────────────────────────────

  const handleReset = () => {
    setParsedData([]);
    setRawFileName('');
    setParseError('');
    setUploadResult(null);
    setShowPreview(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Upload className="w-6 h-6 text-emerald-600" />
          Bulk Upload Medicines
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload medicines in bulk using an Excel file. Create or update medicines and their inventory in one go.
        </p>
      </div>

      {/* Step 1: Download Template */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-blue-900">Step 1: Download Sample Template</h3>
              <p className="text-xs text-blue-700 mt-1">
                Download the Excel template with sample data and instructions. The template includes column descriptions, valid values reference, and 5 sample medicines. Fill in your data and upload.
              </p>
              <Button
                size="sm"
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                onClick={handleDownloadTemplate}
              >
                <Download className="w-3.5 h-3.5" />
                Download uPharma_Template.xlsx
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Upload File */}
      <Card className="border-emerald-200 bg-emerald-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-emerald-900">Step 2: Upload Your File</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Upload the filled Excel file. Only <code className="bg-emerald-100 px-1 rounded">.xlsx</code> and <code className="bg-emerald-100 px-1 rounded">.xls</code> files are accepted. Max 2000 medicines per upload.
              </p>

              <div
                className="mt-4 border-2 border-dashed border-emerald-300 rounded-xl p-8 text-center cursor-pointer hover:bg-emerald-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <Upload className="w-10 h-10 mx-auto text-emerald-400 mb-3" />
                <p className="text-sm font-medium text-emerald-800">
                  {rawFileName ? (
                    <span className="flex items-center justify-center gap-2">
                      <FileSpreadsheet className="w-4 h-4" />
                      {rawFileName}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleReset(); }}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ) : (
                    'Click to browse or drag & drop your Excel file here'
                  )}
                </p>
                <p className="text-xs text-emerald-500 mt-1">
                  {rawFileName ? 'File parsed — ready to upload' : 'Supports .xlsx and .xls files'}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {parseError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-800 font-medium">Error</p>
            <p className="text-xs text-red-600 mt-0.5">{parseError}</p>
          </div>
          <button onClick={() => setParseError('')} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Step 3: Review & Upload */}
      {parsedData.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <Eye className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-purple-900">Step 3: Review & Upload</h3>

                {/* Stats Summary */}
                <div className="flex flex-wrap gap-3 mt-3">
                  <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-bold text-gray-900">{parsedData.length}</span>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-800">{stats.valid}</span>
                    <span className="text-xs text-emerald-600">Valid</span>
                  </div>
                  {stats.warnings > 0 && (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <FileWarning className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold text-amber-800">{stats.warnings}</span>
                      <span className="text-xs text-amber-600">Warnings</span>
                    </div>
                  )}
                  {stats.errors > 0 && (
                    <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-bold text-red-800">{stats.errors}</span>
                      <span className="text-xs text-red-600">Errors</span>
                    </div>
                  )}
                </div>

                {/* Preview Toggle */}
                <div className="mt-3">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs font-medium text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    {showPreview ? 'Hide' : 'Show'} Data Preview ({parsedData.length} rows)
                  </button>
                </div>

                {/* Preview Table */}
                {showPreview && (
                  <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="p-2 text-left text-gray-500 font-medium w-8">#</th>
                          <th className="p-2 text-left text-gray-500 font-medium">Status</th>
                          <th className="p-2 text-left text-gray-500 font-medium">Name</th>
                          <th className="p-2 text-left text-gray-500 font-medium">Generic</th>
                          <th className="p-2 text-left text-gray-500 font-medium">Mfg</th>
                          <th className="p-2 text-right text-gray-500 font-medium">P. Rate</th>
                          <th className="p-2 text-right text-gray-500 font-medium">S. Rate</th>
                          <th className="p-2 text-right text-gray-500 font-medium">MRP</th>
                          <th className="p-2 text-center text-gray-500 font-medium">Batch</th>
                          <th className="p-2 text-center text-gray-500 font-medium">Stock</th>
                          <th className="p-2 text-left text-gray-500 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.map((row, idx) => (
                          <tr key={idx} className={`border-t border-gray-100 ${row._status === 'error' ? 'bg-red-50' : row._status === 'warning' ? 'bg-amber-50/50' : ''}`}>
                            <td className="p-2 text-gray-400">{idx + 1}</td>
                            <td className="p-2">
                              {row._status === 'valid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {row._status === 'warning' && <FileWarning className="w-3.5 h-3.5 text-amber-600" />}
                              {row._status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                            </td>
                            <td className="p-2 font-medium text-gray-900 max-w-[140px] truncate">{row.name}</td>
                            <td className="p-2 text-gray-500 max-w-[100px] truncate">{row.genericName}</td>
                            <td className="p-2 text-gray-500 max-w-[80px] truncate">{row.manufacturer}</td>
                            <td className="p-2 text-right text-gray-700">{fmt(row.purchaseRate)}</td>
                            <td className="p-2 text-right text-gray-700">{fmt(row.saleRate)}</td>
                            <td className="p-2 text-right text-gray-700">{fmt(row.mrp)}</td>
                            <td className="p-2 text-center text-gray-500">{row.batchNo || '—'}</td>
                            <td className="p-2 text-center text-gray-700">{row.stockQty || '—'}</td>
                            <td className="p-2 text-gray-500 max-w-[150px] truncate">{row._message || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Upload Actions */}
                <div className="flex items-center gap-3 mt-4 pt-3 border-t border-purple-200">
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    onClick={handleUpload}
                    disabled={uploading || parsedData.length === 0}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading {parsedData.length} medicines...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload {parsedData.length - stats.errors} Medicines
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="gap-2">
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <Card className="border-emerald-300 bg-emerald-50/50">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
                  Upload Complete!
                  <Badge className="bg-emerald-600 text-white">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Badge>
                </h3>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="bg-white border border-emerald-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{uploadResult.created}</p>
                    <p className="text-xs text-emerald-600 font-medium">Created</p>
                  </div>
                  <div className="bg-white border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{uploadResult.updated}</p>
                    <p className="text-xs text-blue-600 font-medium">Updated</p>
                  </div>
                  <div className="bg-white border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{uploadResult.errors}</p>
                    <p className="text-xs text-red-600 font-medium">Errors</p>
                  </div>
                </div>

                {uploadResult.details.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowPreview(!showPreview)}
                      className="text-xs font-medium text-gray-600 hover:text-gray-800 flex items-center gap-1"
                    >
                      {showPreview ? 'Hide' : 'Show'} Error Details ({uploadResult.details.length})
                    </button>
                    {showPreview && (
                      <div className="mt-2 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg p-3">
                        {uploadResult.details.map((detail, idx) => (
                          <p key={idx} className="text-xs text-red-600 py-0.5">{detail}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button
                  size="sm"
                  className="mt-4 gap-2"
                  variant="outline"
                  onClick={handleReset}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload Another File
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="border-gray-200">
        <CardContent className="p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Reference</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600">
            <div className="space-y-1">
              <p className="font-semibold text-gray-700">Important Notes</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Rates are per <strong>smallest unit</strong> (per tablet), not per strip/box</li>
                <li>Stock qty is in <strong>smallest units</strong> (e.g., 50 strips × 10 = 500 units)</li>
                <li>Existing medicines (by name) will be <strong>updated</strong>, not duplicated</li>
                <li>Same batch numbers will have stock <strong>added</strong> to existing batch</li>
                <li>Maximum <strong>2000 medicines</strong> per upload</li>
              </ul>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-700">Drug Schedules</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li><span className="font-medium text-emerald-700">OTC</span> — No prescription needed</li>
                <li><span className="font-medium text-amber-700">H</span> — Prescription required</li>
                <li><span className="font-medium text-orange-700">H1</span> — Strict Rx (Narcotics/Psychotropic)</li>
                <li><span className="font-medium text-red-700">X</span> — Restricted narcotic</li>
                <li><span className="font-medium text-blue-700">G</span> — Caution label required</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
