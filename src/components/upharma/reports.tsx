'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart3,
  TrendingUp,
  ShoppingCart,
  Package,
  FileText,
  AlertTriangle,
  CalendarDays,
  IndianRupee,
  Download,
  Filter,
  Percent,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Hash,
  BoxIcon,
  Calculator,
  Layers,
  FileSpreadsheet,
  FileCode,
  Shield,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Types
interface SalesSummary {
  totalSales: number;
  totalRevenue: number;
  totalSubtotal: number;
  totalGst: number;
  totalDiscount: number;
  totalPaid: number;
  totalDue: number;
  avgSaleValue: number;
}

interface PurchaseSummary {
  totalPurchases: number;
  totalCost: number;
  totalGst: number;
  totalPaid: number;
  totalDue: number;
}

interface GstByRate {
  rate: number;
  taxable: number;
  cgst: number;
  sgst: number;
  totalGst: number;
}

interface GstReport {
  salesGst: {
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalGst: number;
  };
  purchaseGst: {
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalGst: number;
  };
  gstByRate: GstByRate[];
  netGstPayable: number;
}

interface StockSummary {
  totalItems: number;
  totalUnits: number;
  totalCostValue: number;
  totalSaleValue: number;
  potentialProfit: number;
}

interface ExpirySummary {
  total: number;
  expired: number;
  expiredValue: number;
  critical: number;
  criticalValue: number;
  warning: number;
  warningValue: number;
}

interface ProfitReport {
  revenue: { total: number; subtotal: number; gst: number; discount: number };
  costOfGoods: { total: number };
  profit: { grossProfit: number; grossMargin: number };
  stockSummary?: { totalItems: number; totalValue: number };
}

interface SalesReportData {
  sales: any[];
  summary: SalesSummary;
  paymentBreakdown?: Record<string, { count: number; total: number }>;
}

interface PurchaseReportData {
  purchases: any[];
  summary: PurchaseSummary;
}

type ReportType = 'sales' | 'purchases' | 'gst' | 'stock' | 'expiry' | 'profit' | 'schedule-inventory' | 'schedule-sales';

function formatCurrency(amount: number | undefined | null) {
  const val = amount ?? 0;
  return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  subtext,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  subtext?: string;
}) {
  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
          </div>
          <div
            className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}
          >
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
        </div>
        {subtext && (
          <p className="text-xs text-gray-400 mt-1.5">{subtext}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth());
  const [dateTo, setDateTo] = useState(getToday());
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // Print handler
  const handlePrint = () => {
    const content = reportContentRef.current;
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Upharma Report - ${reportType}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #111; font-size: 13px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f5f5f5; font-weight: 600; }
        h1, h2, h3 { margin: 8px 0; }
        .print-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 10px; }
        .print-header h1 { color: #059669; }
        .summary-cards { display: flex; flex-wrap: wrap; gap: 12px; margin: 15px 0; }
        .summary-card { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; flex: 1; min-width: 140px; }
        .summary-card .label { font-size: 11px; color: #666; }
        .summary-card .value { font-size: 18px; font-weight: 700; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-xs { font-size: 11px; }
        .text-sm { font-size: 13px; }
        .text-muted { color: #666; }
        .font-bold { font-weight: 700; }
        .font-semibold { font-weight: 600; }
        .mt-2 { margin-top: 8px; }
        .mb-2 { margin-bottom: 8px; }
        .hidden-print { display: none; }
        @media print { body { padding: 10px; } .summary-cards { gap: 8px; } }
      </style></head><body>
      <div class="print-header"><h1>Upharma - Pharmacy Management</h1><p class="text-muted">Report: ${reportType.toUpperCase()} | Generated: ${new Date().toLocaleString('en-IN')}</p><p style="font-size:9px;color:#999;margin-top:2px;">MultiNex Multi Solutions LLP | All Rights Reserved</p></div>
      ${content.innerHTML}
      <script>window.onload = function() { window.print(); }</script>
      </body></html>`);
    printWindow.document.close();
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      if (reportType !== 'stock' && reportType !== 'expiry' && reportType !== 'schedule-inventory') {
        params.set('from', dateFrom);
        params.set('to', dateTo);
      }
      const res = await fetch(`/api/reports?${params}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data || data);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Listen for schedule sales date change events from child
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.from) setDateFrom(detail.from);
      if (detail?.to) setDateTo(detail.to);
    };
    window.addEventListener('scheduleDateChange', handler);
    return () => window.removeEventListener('scheduleDateChange', handler);
  }, []);

  const handleTabChange = (value: string) => {
    setReportType(value as ReportType);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" /> Reports
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze your pharmacy business data
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export to Tally */}
          {(reportType === 'sales' || reportType === 'purchases') && (
            <Button
              variant="outline"
              className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
              onClick={() => {
                const params = new URLSearchParams();
                params.set('type', reportType);
                params.set('from', dateFrom);
                params.set('to', dateTo);
                window.open(`/api/exports/tally?${params}`, '_blank');
              }}
              disabled={loading}
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Export Tally</span>
            </Button>
          )}
          {reportType === 'gst' && (
            <Button
              variant="outline"
              className="gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
              onClick={() => {
                window.open('/api/exports/tally?type=masters', '_blank');
              }}
              disabled={loading}
            >
              <FileCode className="w-4 h-4" />
              <span className="hidden sm:inline">Tally Masters</span>
            </Button>
          )}
          {/* Export CSV */}
          <Button
            variant="outline"
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => {
              const params = new URLSearchParams();
              params.set('type', reportType);
              if (reportType !== 'stock' && reportType !== 'expiry' && reportType !== 'schedule-inventory' && reportType !== 'schedule-sales') {
                params.set('from', dateFrom);
                params.set('to', dateTo);
              }
              window.open(`/api/exports/csv?${params}`, '_blank');
            }}
            disabled={loading}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          {/* Print Report */}
          <Button
            variant="outline"
            className="gap-2 border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={handlePrint}
            disabled={loading || !reportData}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            onClick={fetchReport}
            disabled={loading}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <Tabs value={reportType} onValueChange={handleTabChange}>
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="sales" className="gap-1.5 text-xs sm:text-sm">
            <ShoppingCart className="w-4 h-4" /> Sales
          </TabsTrigger>
          <TabsTrigger value="purchases" className="gap-1.5 text-xs sm:text-sm">
            <Package className="w-4 h-4" /> Purchases
          </TabsTrigger>
          <TabsTrigger value="gst" className="gap-1.5 text-xs sm:text-sm">
            <Percent className="w-4 h-4" /> GST
          </TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="w-4 h-4" /> Stock
          </TabsTrigger>
          <TabsTrigger value="expiry" className="gap-1.5 text-xs sm:text-sm">
            <AlertTriangle className="w-4 h-4" /> Expiry
          </TabsTrigger>
          <TabsTrigger value="profit" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="w-4 h-4" /> Profit
          </TabsTrigger>
          <TabsTrigger value="schedule-inventory" className="gap-1.5 text-xs sm:text-sm">
            <Shield className="w-4 h-4" /> Sch. Inventory
          </TabsTrigger>
          <TabsTrigger value="schedule-sales" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="w-4 h-4" /> Sch. Sales
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Date Range (hidden for stock, expiry, schedule-inventory, schedule-sales - they have their own) */}
      {reportType !== 'stock' && reportType !== 'expiry' && reportType !== 'schedule-inventory' && reportType !== 'schedule-sales' && (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-end">
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
                  setDateFrom(getFirstDayOfMonth());
                  setDateTo(getToday());
                }}
                className="h-9 text-xs"
              >
                This Month
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      <div ref={reportContentRef}>
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>
      ) : reportData ? (
        <>
          {/* SALES REPORT */}
          {reportType === 'sales' && (
            <SalesReport
              data={reportData as SalesReportData}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          )}

          {/* PURCHASES REPORT */}
          {reportType === 'purchases' && (
            <PurchasesReport
              data={reportData as PurchaseReportData}
              dateFrom={dateFrom}
              dateTo={dateTo}
            />
          )}

          {/* GST REPORT */}
          {reportType === 'gst' && (
            <GstReport data={reportData as GstReport} />
          )}

          {/* STOCK REPORT */}
          {reportType === 'stock' && (
            <StockReport
              data={{
                items: reportData.items || [],
                summary: reportData.summary,
              }}
            />
          )}

          {/* EXPIRY REPORT */}
          {reportType === 'expiry' && (
            <ExpiryReport
              data={{
                items: reportData.items || [],
                summary: reportData.summary,
              }}
            />
          )}

          {/* PROFIT REPORT */}
          {reportType === 'profit' && (
            <ProfitReport data={reportData as ProfitReport} />
          )}

          {/* SCHEDULE-WISE INVENTORY */}
          {reportType === 'schedule-inventory' && (
            <ScheduleInventoryReport data={reportData} />
          )}

          {/* SCHEDULE-WISE SALES */}
          {reportType === 'schedule-sales' && (
            <ScheduleSalesReport data={reportData} dateFrom={dateFrom} dateTo={dateTo} />
          )}
        </>
      ) : (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No report data available</p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}

/* ======================= SALES REPORT ======================= */
function SalesReport({
  data,
  dateFrom,
  dateTo,
}: {
  data: SalesReportData;
  dateFrom: string;
  dateTo: string;
}) {
  const summary = data.summary;
  const paymentBreakdown = data.paymentBreakdown || {};

  const paymentColors: Record<string, string> = {
    Cash: 'bg-emerald-100 text-emerald-700',
    UPI: 'bg-blue-100 text-blue-700',
    Card: 'bg-purple-100 text-purple-700',
    Credit: 'bg-orange-100 text-orange-700',
    Bank: 'bg-teal-100 text-teal-700',
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Revenue"
          value={formatCurrency(summary.totalRevenue)}
          icon={IndianRupee}
          color="text-emerald-600"
          bg="bg-emerald-50"
          subtext={`${summary.totalSales} sales`}
        />
        <MetricCard
          label="Total GST"
          value={formatCurrency(summary.totalGst)}
          icon={Percent}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <MetricCard
          label="Total Paid"
          value={formatCurrency(summary.totalPaid)}
          icon={DollarSign}
          color="text-teal-600"
          bg="bg-teal-50"
        />
        <MetricCard
          label="Total Due"
          value={formatCurrency(summary.totalDue)}
          icon={AlertTriangle}
          color={summary.totalDue > 0 ? 'text-orange-600' : 'text-gray-500'}
          bg={summary.totalDue > 0 ? 'bg-orange-50' : 'bg-gray-50'}
        />
        <MetricCard
          label="Avg Sale Value"
          value={formatCurrency(summary.avgSaleValue)}
          icon={TrendingUp}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* Payment Breakdown */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Payment
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(paymentBreakdown).map(
                ([method, info]: [string, any]) => (
                  <div
                    key={method}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:border-emerald-200 transition-all"
                  >
                    <div
                      className={`w-10 h-10 rounded-lg ${paymentColors[method] || 'bg-gray-100 text-gray-700'} flex items-center justify-center`}
                    >
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{method}</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(info.total)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {info.count} transaction(s)
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Sales List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Invoice
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Customer
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Subtotal
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    GST
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Discount
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Grand Total
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Schedule
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Payment
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.sales?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="p-8 text-center text-gray-400"
                    >
                      No sales found for this period
                    </td>
                  </tr>
                ) : (
                  data.sales?.map((sale: any, i: number) => {
                    // Get unique drug schedules from sale items
                    const schedules = [...new Set(
                      (sale.items || [])
                        .map((item: any) => item.medicine?.drugSchedule || 'OTC')
                        .filter(Boolean)
                    )];
                    const hasRestricted = schedules.some((s: string) => ['H', 'H1', 'X'].includes(s));

                    return (
                    <tr
                      key={sale.id || i}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-3 text-sm font-medium text-emerald-600">
                        {sale.invoiceNo}
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-gray-900">
                          {sale.customer?.name || 'Walk-in'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {sale.customer?.phone || ''}
                        </p>
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(sale.subtotal || 0)}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(sale.totalGst || sale.gst || 0)}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(sale.discount || 0)}
                      </td>
                      <td className="p-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(sale.grandTotal)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {schedules.map((sch: string) => {
                            const style = getScheduleStyle(sch);
                            return (
                              <Badge
                                key={sch}
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${style.bgColor} ${style.textColor} ${style.color} border`}
                              >
                                {style.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${paymentColors[sale.paymentMethod] || 'bg-gray-100 text-gray-700'}`}
                        >
                          {sale.paymentMethod || 'Cash'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {sale.date ? formatDate(sale.date) : sale.createdAt ? formatDate(sale.createdAt) : '-'}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================= PURCHASES REPORT ======================= */
function PurchasesReport({
  data,
  dateFrom,
  dateTo,
}: {
  data: PurchaseReportData;
  dateFrom: string;
  dateTo: string;
}) {
  const summary = data.summary;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Purchases"
          value={String(summary.totalPurchases)}
          icon={Package}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <MetricCard
          label="Total Cost"
          value={formatCurrency(summary.totalCost)}
          icon={IndianRupee}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <MetricCard
          label="Total GST"
          value={formatCurrency(summary.totalGst)}
          icon={Percent}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <MetricCard
          label="Total Paid"
          value={formatCurrency(summary.totalPaid)}
          icon={DollarSign}
          color="text-teal-600"
          bg="bg-teal-50"
        />
        <MetricCard
          label="Total Due"
          value={formatCurrency(summary.totalDue)}
          icon={AlertTriangle}
          color={summary.totalDue > 0 ? 'text-orange-600' : 'text-gray-500'}
          bg={summary.totalDue > 0 ? 'bg-orange-50' : 'bg-gray-50'}
        />
      </div>

      {/* Purchases Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Purchase List
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Invoice
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Supplier
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Subtotal
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    GST
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Grand Total
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Payment
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.purchases?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-gray-400"
                    >
                      No purchases found for this period
                    </td>
                  </tr>
                ) : (
                  data.purchases?.map((purchase: any, i: number) => (
                    <tr
                      key={purchase.id || i}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-3 text-sm font-medium text-blue-600">
                        {purchase.invoiceNo}
                      </td>
                      <td className="p-3">
                        <p className="text-sm text-gray-900">
                          {purchase.supplier?.name || '-'}
                        </p>
                        {purchase.supplier?.address && (
                          <p className="text-xs text-gray-500">{purchase.supplier.address}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {purchase.supplier?.phone || ''}
                        </p>
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(purchase.subtotal || 0)}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(purchase.totalGst || purchase.gst || 0)}
                      </td>
                      <td className="p-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(purchase.grandTotal)}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${purchase.paymentMethod === 'Cash' ? 'bg-emerald-100 text-emerald-700' : purchase.paymentMethod === 'UPI' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {purchase.paymentMethod || 'Cash'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${purchase.status === 'Completed' || purchase.status === 'Received' ? 'bg-emerald-100 text-emerald-700' : purchase.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}
                        >
                          {purchase.status || 'Completed'}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {purchase.date ? formatDate(purchase.date) : purchase.createdAt ? formatDate(purchase.createdAt) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================= GST REPORT ======================= */
function GstReport({ data }: { data: GstReport }) {
  return (
    <div className="space-y-6">
      {/* Sales GST & Purchase GST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales GST */}
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Sales GST (Output)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700">Total Taxable</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(data.salesGst?.totalTaxable || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700">CGST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(data.salesGst?.totalCgst || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700">SGST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(data.salesGst?.totalSgst || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-emerald-700">IGST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(data.salesGst?.totalIgst || 0)}
                </span>
              </div>
              <div className="border-t border-emerald-200 pt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-emerald-800">Total Sales GST</span>
                  <span className="text-emerald-800">
                    {formatCurrency(data.salesGst?.totalGst || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purchase GST */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
              <Package className="w-4 h-4" /> Purchase GST (Input)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Total Taxable</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(data.purchaseGst?.totalTaxable || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">CGST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(data.purchaseGst?.totalCgst || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">SGST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(data.purchaseGst?.totalSgst || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">IGST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(data.purchaseGst?.totalIgst || 0)}
                </span>
              </div>
              <div className="border-t border-blue-200 pt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-blue-800">Total Purchase GST</span>
                  <span className="text-blue-800">
                    {formatCurrency(data.purchaseGst?.totalGst || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net GST Payable */}
      <Card
        className={`border-border/60 shadow-sm ${data.netGstPayable > 0 ? 'border-orange-200 bg-orange-50/30' : data.netGstPayable < 0 ? 'border-emerald-200 bg-emerald-50/30' : ''}`}
      >
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg ${data.netGstPayable > 0 ? 'bg-orange-100' : data.netGstPayable < 0 ? 'bg-emerald-100' : 'bg-gray-100'} flex items-center justify-center`}
              >
                <Calculator
                  className={`w-5 h-5 ${data.netGstPayable > 0 ? 'text-orange-600' : data.netGstPayable < 0 ? 'text-emerald-600' : 'text-gray-600'}`}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Net GST Payable
                </p>
                <p className="text-xs text-gray-500">
                  {data.netGstPayable > 0
                    ? 'GST to be paid to government'
                    : data.netGstPayable < 0
                      ? 'Eligible for GST credit/refund'
                      : 'No GST liability'}
                </p>
              </div>
            </div>
            <p
              className={`text-2xl font-bold ${data.netGstPayable > 0 ? 'text-orange-700' : data.netGstPayable < 0 ? 'text-emerald-700' : 'text-gray-900'}`}
            >
              {formatCurrency(Math.abs(data.netGstPayable))}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* GST by Rate Table */}
      {data.gstByRate && data.gstByRate.length > 0 && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900">
              GST Breakdown by Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50/50">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                      GST Rate
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                      Taxable Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                      CGST
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                      SGST
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                      Total GST
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.gstByRate.map((row: GstByRate, i: number) => (
                    <tr
                      key={i}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-3">
                        <Badge
                          variant="outline"
                          className="text-sm font-semibold border-purple-200 text-purple-700 bg-purple-50"
                        >
                          {row.rate}%
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-gray-900 text-right">
                        {formatCurrency(row.taxable)}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(row.cgst)}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(row.sgst)}
                      </td>
                      <td className="p-3 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(row.totalGst)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="p-3 text-sm text-gray-700">Total</td>
                    <td className="p-3 text-sm text-gray-900 text-right">
                      {formatCurrency(
                        data.gstByRate.reduce(
                          (sum, r) => sum + r.taxable,
                          0
                        )
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-900 text-right">
                      {formatCurrency(
                        data.gstByRate.reduce(
                          (sum, r) => sum + r.cgst,
                          0
                        )
                      )}
                    </td>
                    <td className="p-3 text-sm text-gray-900 text-right">
                      {formatCurrency(
                        data.gstByRate.reduce(
                          (sum, r) => sum + r.sgst,
                          0
                        )
                      )}
                    </td>
                    <td className="p-3 text-sm text-emerald-700 text-right">
                      {formatCurrency(
                        data.gstByRate.reduce(
                          (sum, r) => sum + r.totalGst,
                          0
                        )
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ======================= STOCK REPORT ======================= */
function StockReport({
  data,
}: {
  data: { items: any[]; summary: StockSummary };
}) {
  const summary = data.summary;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Total Items"
          value={String(summary.totalItems)}
          icon={Hash}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <MetricCard
          label="Total Units"
          value={String(summary.totalUnits)}
          icon={BoxIcon}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <MetricCard
          label="Cost Value"
          value={formatCurrency(summary.totalCostValue)}
          icon={Package}
          color="text-orange-600"
          bg="bg-orange-50"
          subtext="Purchase cost"
        />
        <MetricCard
          label="Sale Value"
          value={formatCurrency(summary.totalSaleValue)}
          icon={IndianRupee}
          color="text-purple-600"
          bg="bg-purple-50"
          subtext="At current rates"
        />
        <MetricCard
          label="Potential Profit"
          value={formatCurrency(summary.potentialProfit)}
          icon={TrendingUp}
          color="text-emerald-600"
          bg="bg-emerald-50"
          subtext="On full sale"
        />
      </div>

      {/* Stock Items Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Stock Valuation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Medicine
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Stock
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Purchase Rate
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Sale Rate
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Cost Value
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Sale Value
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-gray-400"
                    >
                      No stock items found
                    </td>
                  </tr>
                ) : (
                  data.items?.map((item: any, i: number) => (
                    <tr
                      key={item.id || i}
                      className="border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="p-3">
                        <p className="text-sm font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.genericName} | {item.manufacturer}
                        </p>
                      </td>
                      <td className="p-3 text-sm text-gray-900 text-right font-medium">
                        {item.totalStock || item.stock || 0}
                      </td>
                      <td className="p-3 text-sm text-gray-600 text-right">
                        {formatCurrency(item.purchaseRate || 0)}
                      </td>
                      <td className="p-3 text-sm text-gray-600 text-right">
                        {formatCurrency(item.saleRate || 0)}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(item.costValue || (item.totalStock || item.stock || 0) * (item.purchaseRate || 0))}
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">
                        {formatCurrency(item.saleValue || (item.totalStock || item.stock || 0) * (item.saleRate || 0))}
                      </td>
                      <td className="p-3 text-sm font-medium text-emerald-600 text-right">
                        {formatCurrency(
                          (item.profit || 0) ||
                            ((item.totalStock || item.stock || 0) * (item.saleRate || 0)) -
                              ((item.totalStock || item.stock || 0) * (item.purchaseRate || 0))
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================= EXPIRY REPORT ======================= */
function ExpiryReport({
  data,
}: {
  data: { items: any[]; summary: ExpirySummary };
}) {
  const summary = data.summary;

  const getExpiryStatus = (expiryDate: string) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return { label: 'Expired', color: 'bg-red-100 text-red-700 border-red-200', bgRow: 'bg-red-50/50' };
    if (diffDays <= 30) return { label: 'Critical', color: 'bg-orange-100 text-orange-700 border-orange-200', bgRow: 'bg-orange-50/50' };
    if (diffDays <= 90) return { label: 'Warning', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', bgRow: 'bg-yellow-50/50' };
    return { label: 'OK', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', bgRow: '' };
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard
          label="Total Tracked"
          value={String(summary.total)}
          icon={Hash}
          color="text-gray-600"
          bg="bg-gray-50"
        />
        <MetricCard
          label="Expired"
          value={`${summary.expired} items`}
          icon={AlertTriangle}
          color="text-red-600"
          bg="bg-red-50"
          subtext={formatCurrency(summary.expiredValue)}
        />
        <MetricCard
          label="Critical (≤30d)"
          value={`${summary.critical} items`}
          icon={AlertTriangle}
          color="text-orange-600"
          bg="bg-orange-50"
          subtext={formatCurrency(summary.criticalValue)}
        />
        <MetricCard
          label="Warning (≤90d)"
          value={`${summary.warning} items`}
          icon={Clock}
          color="text-yellow-600"
          bg="bg-yellow-50"
          subtext={formatCurrency(summary.warningValue)}
        />
        <MetricCard
          label="Expired Value"
          value={formatCurrency(summary.expiredValue)}
          icon={IndianRupee}
          color="text-red-600"
          bg="bg-red-50"
        />
        <MetricCard
          label="At-Risk Value"
          value={formatCurrency(
            summary.expiredValue + summary.criticalValue + summary.warningValue
          )}
          icon={AlertTriangle}
          color="text-orange-600"
          bg="bg-orange-50"
          subtext="Expired + Critical + Warning"
        />
      </div>

      {/* Expiry Items Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Expiry Details
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Medicine
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Batch No
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Stock Qty
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Expiry Date
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3 text-right">
                    Value
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider p-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items?.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-400"
                    >
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                      No expiry items found — all medicines are safe!
                    </td>
                  </tr>
                ) : (
                  data.items?.map((item: any, i: number) => {
                    const status = getExpiryStatus(item.expiryDate);
                    return (
                      <tr
                        key={item.id || i}
                        className={`border-b border-border/50 last:border-0 hover:bg-gray-50/50 transition-colors ${status.bgRow}`}
                      >
                        <td className="p-3">
                          <p className="text-sm font-medium text-gray-900">
                            {item.name || item.medicine?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {item.genericName || item.medicine?.genericName || ''} | {item.manufacturer || item.medicine?.manufacturer || ''}
                          </p>
                        </td>
                        <td className="p-3 text-sm text-gray-700 font-mono">
                          {item.batchNo || '-'}
                        </td>
                        <td className="p-3 text-sm text-gray-900 text-right font-medium">
                          {item.stockQty || item.quantity || 0}
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-sm font-medium ${status.label === 'Expired' ? 'text-red-700' : status.label === 'Critical' ? 'text-orange-700' : status.label === 'Warning' ? 'text-yellow-700' : 'text-gray-900'}`}
                          >
                            {item.expiryDate
                              ? formatDate(item.expiryDate)
                              : '-'}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-gray-700 text-right">
                          {formatCurrency(
                            item.value ||
                              (item.stockQty || item.quantity || 0) *
                                (item.saleRate || item.rate || 0)
                          )}
                        </td>
                        <td className="p-3">
                          <Badge
                            variant="outline"
                            className={`text-xs border font-medium ${status.color}`}
                          >
                            {status.label}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================= PROFIT REPORT ======================= */
function ProfitReport({ data }: { data: ProfitReport }) {
  const revenue = data?.revenue || { total: 0, subtotal: 0, gst: 0, discount: 0 };
  const costOfGoods = data?.costOfGoods || { total: 0 };
  const profit = data?.profit || { grossProfit: 0, grossMargin: 0 };
  const stockSummary = data?.stockSummary;

  return (
    <div className="space-y-6">
      {/* Gross Profit Hero */}
      <Card
        className={`border-border/60 shadow-sm ${profit.grossProfit >= 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-red-200 bg-red-50/30'}`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">
                Gross Profit
              </p>
              <p
                className={`text-3xl font-bold ${profit.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
              >
                {formatCurrency(profit.grossProfit)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-12 h-12 rounded-xl ${profit.grossMargin >= 0 ? 'bg-emerald-100' : 'bg-red-100'} flex items-center justify-center`}
              >
                <TrendingUp
                  className={`w-6 h-6 ${profit.grossMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500">Gross Margin</p>
                <p
                  className={`text-lg font-bold ${profit.grossMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {profit.grossMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue & COGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Revenue */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Revenue
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(revenue.subtotal || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total GST</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(revenue.gst || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="font-medium text-red-600">
                  -{formatCurrency(revenue.discount || 0)}
                </span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Total Revenue</span>
                  <span className="text-emerald-700">
                    {formatCurrency(revenue.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COGS */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-600" /> Cost of Goods
              Sold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total COGS</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(costOfGoods.total || 0)}
                </span>
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Total Cost</span>
                  <span className="text-orange-600">
                    {formatCurrency(costOfGoods.total || 0)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock Summary */}
      {stockSummary && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" /> Stock Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Total Items</p>
                <p className="text-lg font-bold text-gray-900">
                  {stockSummary.totalItems || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Total Stock Value</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(stockSummary.totalValue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profit Breakdown Visual */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-900">
            Profit Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Revenue bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Revenue</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(revenue.total || 0)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            {/* COGS bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Cost of Goods</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(costOfGoods.total || 0)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${revenue.total ? Math.min(((costOfGoods.total || 0) / revenue.total) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
            {/* Profit bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 font-medium">Gross Profit</span>
                <span
                  className={`font-bold ${profit.grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                >
                  {formatCurrency(profit.grossProfit)}
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${profit.grossProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{
                    width: `${revenue.total ? Math.min((Math.abs(profit.grossProfit) / revenue.total) * 100, 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ======================= SCHEDULE-WISE INVENTORY REPORT ======================= */

const SCHEDULE_CONFIG: Record<string, { label: string; color: string; bgColor: string; textColor: string }> = {
  OTC: { label: 'OTC', color: 'border-green-300', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  G: { label: 'Sch. G', color: 'border-blue-300', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
  H: { label: 'Sch. H', color: 'border-amber-300', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  H1: { label: 'Sch. H1', color: 'border-orange-300', bgColor: 'bg-orange-50', textColor: 'text-orange-700' },
  X: { label: 'Sch. X', color: 'border-red-300', bgColor: 'bg-red-50', textColor: 'text-red-700' },
  K: { label: 'Sch. K', color: 'border-gray-300', bgColor: 'bg-gray-50', textColor: 'text-gray-600' },
  C: { label: 'Sch. C', color: 'border-purple-300', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  C1: { label: 'Sch. C1', color: 'border-purple-300', bgColor: 'bg-purple-50', textColor: 'text-purple-700' },
  N: { label: 'Sch. N', color: 'border-teal-300', bgColor: 'bg-teal-50', textColor: 'text-teal-700' },
  P: { label: 'Sch. P', color: 'border-indigo-300', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700' },
};

function getScheduleStyle(schedule: string) {
  return SCHEDULE_CONFIG[schedule] || SCHEDULE_CONFIG['OTC'];
}

function ScheduleInventoryReport({ data }: { data: any }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  if (!data?.groups) return null;
  const { groups, summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Drug Schedules" value={String(summary.totalSchedules)} icon={Shield} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard label="Total Items" value={String(summary.totalItems)} icon={Package} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard label="Cost Value" value={formatCurrency(summary.totalCostValue)} icon={IndianRupee} color="text-orange-600" bg="bg-orange-50" />
        <MetricCard label="Sale Value" value={formatCurrency(summary.totalSaleValue)} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* Schedule Groups */}
      <div className="space-y-3">
        {groups.map((group: any) => {
          const style = getScheduleStyle(group.schedule);
          const isExpanded = expandedGroup === group.schedule;

          return (
            <Card key={group.schedule} className={`border ${style.color} shadow-sm overflow-hidden`}>
              {/* Group Header */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.schedule)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${style.bgColor} flex items-center justify-center`}>
                    <Shield className={`w-5 h-5 ${style.textColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{style.label}</p>
                    <p className="text-xs text-gray-500">{group.totalItems ?? 0} items | {(group.totalUnits ?? 0).toLocaleString('en-IN')} units</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">Cost Value</p>
                    <p className="text-sm font-semibold text-gray-700">{formatCurrency(group.totalCostValue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Sale Value</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(group.totalSaleValue)}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Items */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={`bg-gray-50/80 ${style.bgColor}`}>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Medicine</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase p-3 hidden md:table-cell">Manufacturer</th>
                          <th className="text-center text-xs font-medium text-gray-500 uppercase p-3">Stock</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase p-3 hidden lg:table-cell">Batches</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase p-3">Cost Val.</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase p-3">Sale Val.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item: any) => (
                          <tr key={item.id} className="border-t border-gray-50 hover:bg-gray-50/30">
                            <td className="p-3">
                              <p className="text-sm font-medium text-gray-900">{item.name}</p>
                              <p className="text-xs text-gray-400">{item.genericName} | {item.category}</p>
                            </td>
                            <td className="p-3 text-xs text-gray-600 hidden md:table-cell">{item.manufacturer || '-'}</td>
                            <td className="p-3 text-center">
                              <span className="text-sm font-semibold text-gray-900">{item.totalStock}</span>
                              <span className="text-xs text-gray-400 ml-1">{item.baseUnit.toLowerCase()}s</span>
                            </td>
                            <td className="p-3 hidden lg:table-cell">
                              <div className="space-y-0.5">
                                {item.batches.slice(0, 2).map((b: any, i: number) => (
                                  <p key={i} className="text-[11px] text-gray-500">
                                    {b.batchNo}: {b.stockQty} qty (exp {new Date(b.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })})
                                  </p>
                                ))}
                                {item.batches.length > 2 && (
                                  <p className="text-[10px] text-gray-400">+{item.batches.length - 2} more batches</p>
                                )}
                              </div>
                            </td>
                            <td className="p-3 text-right text-sm text-gray-600">{formatCurrency(item.stockValue)}</td>
                            <td className="p-3 text-right text-sm font-semibold text-emerald-700">{formatCurrency(item.saleValue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ======================= SCHEDULE-WISE SALES REPORT ======================= */

function getThisWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function ScheduleSalesReport({ data, dateFrom, dateTo }: { data: any; dateFrom: string; dateTo: string }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<'custom' | 'today' | 'week' | 'month'>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  if (!data?.groups) return null;
  const { groups, summary } = data;

  const handleQuickFilter = (filter: 'today' | 'week' | 'month' | 'custom', newFrom?: string, newTo?: string) => {
    setQuickFilter(filter);
    if (newFrom) setCustomFrom(newFrom);
    if (newTo) setCustomTo(newTo);
    // Dispatch custom events that the parent can listen to
    const detail = { from: newFrom, to: newTo };
    window.dispatchEvent(new CustomEvent('scheduleDateChange', { detail }));
  };

  const handleCustomDateApply = () => {
    if (customFrom && customTo) {
      handleQuickFilter('custom', customFrom, customTo);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Date Filters */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-gray-500">Quick Filter</Label>
              <div className="flex gap-2 flex-wrap">
                <Button variant={quickFilter === 'today' ? 'default' : 'outline'} size="sm" className="h-8 text-xs"
                  onClick={() => handleQuickFilter('today', getToday(), getToday())}>
                  Today
                </Button>
                <Button variant={quickFilter === 'week' ? 'default' : 'outline'} size="sm" className="h-8 text-xs"
                  onClick={() => handleQuickFilter('week', getThisWeekStart(), getToday())}>
                  This Week
                </Button>
                <Button variant={quickFilter === 'month' ? 'default' : 'outline'} size="sm" className="h-8 text-xs"
                  onClick={() => handleQuickFilter('month', getFirstDayOfMonth(), getToday())}>
                  This Month
                </Button>
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">From</Label>
                <Input type="date" value={quickFilter === 'custom' ? customFrom : dateFrom} onChange={(e) => { setCustomFrom(e.target.value); setQuickFilter('custom'); }} className="w-40 h-9 text-sm border-border/80" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-500">To</Label>
                <Input type="date" value={quickFilter === 'custom' ? customTo : dateTo} onChange={(e) => { setCustomTo(e.target.value); setQuickFilter('custom'); }} className="w-40 h-9 text-sm border-border/80" />
              </div>
              <Button variant="outline" size="sm" className="h-9 text-xs" onClick={handleCustomDateApply} disabled={!customFrom || !customTo}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Schedules Sold" value={String(summary.totalSchedules)} icon={Shield} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard label="Total Sales" value={String(summary.totalSales)} icon={ShoppingCart} color="text-blue-600" bg="bg-blue-50" />
        <MetricCard label="Total Revenue" value={formatCurrency(summary.totalRevenue)} icon={IndianRupee} color="text-emerald-600" bg="bg-emerald-50" />
        <MetricCard label="Total Qty Sold" value={(summary.totalQuantity ?? 0).toLocaleString('en-IN')} icon={Package} color="text-purple-600" bg="bg-purple-50" />
      </div>

      {/* Schedule Groups */}
      <div className="space-y-3">
        {groups.map((group: any) => {
          const style = getScheduleStyle(group.schedule);
          const isExpanded = expandedGroup === group.schedule;

          return (
            <Card key={group.schedule} className={`border ${style.color} shadow-sm overflow-hidden`}>
              {/* Group Header */}
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.schedule)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${style.bgColor} flex items-center justify-center`}>
                    <ClipboardList className={`w-5 h-5 ${style.textColor}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-gray-900">{style.label}</p>
                    <p className="text-xs text-gray-500">{group.totalSalesCount} invoices | {group.totalQuantity} units sold</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="text-sm font-bold text-emerald-700">{formatCurrency(group.totalRevenue)}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Expanded Sales */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50/80">
                          <th className="text-left text-xs font-medium text-gray-500 uppercase p-3">Invoice</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase p-3 hidden sm:table-cell">Date</th>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase p-3 hidden md:table-cell">Customer</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase p-3">Amount</th>
                          <th className="text-center text-xs font-medium text-gray-500 uppercase p-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.sales.map((sale: any) => (
                          <React.Fragment key={sale.invoiceNo}>
                            <tr className="border-t border-gray-50 hover:bg-gray-50/30 cursor-pointer"
                              onClick={() => setExpandedSale(expandedSale === sale.invoiceNo ? null : sale.invoiceNo)}>
                              <td className="p-3">
                                <p className="text-sm font-medium text-gray-900">{sale.invoiceNo}</p>
                                <p className="text-xs text-gray-400">{sale.items.length} item(s)</p>
                              </td>
                              <td className="p-3 text-xs text-gray-600 hidden sm:table-cell">
                                {formatDate(sale.date)}
                              </td>
                              <td className="p-3 text-xs text-gray-600 hidden md:table-cell">
                                {sale.customerName || 'Walk-in'}
                              </td>
                              <td className="p-3 text-right text-sm font-semibold text-emerald-700">
                                {formatCurrency(sale.itemTotal)}
                              </td>
                              <td className="p-3 text-center">
                                {expandedSale === sale.invoiceNo ? (
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 inline" />
                                ) : (
                                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 inline" />
                                )}
                              </td>
                            </tr>
                            {/* Expanded items */}
                            {expandedSale === sale.invoiceNo && (
                              <tr className="border-t border-gray-100 bg-gray-50/50">
                                <td colSpan={5} className="p-3">
                                  <table className="w-full">
                                    <thead>
                                      <tr>
                                        <th className="text-left text-[10px] font-medium text-gray-400 uppercase pb-1 pl-2">Medicine</th>
                                        <th className="text-center text-[10px] font-medium text-gray-400 uppercase pb-1">Qty</th>
                                        <th className="text-center text-[10px] font-medium text-gray-400 uppercase pb-1 hidden sm:table-cell">Batch</th>
                                        <th className="text-right text-[10px] font-medium text-gray-400 uppercase pb-1">Rate</th>
                                        <th className="text-right text-[10px] font-medium text-gray-400 uppercase pb-1 pr-2">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sale.items.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                          <td className="py-1 pl-2 text-xs text-gray-700">{item.medicineName}</td>
                                          <td className="py-1 text-center text-xs text-gray-600">{item.quantity} {item.unitType}</td>
                                          <td className="py-1 text-center text-xs text-gray-500 hidden sm:table-cell">{item.batchNo || '-'}</td>
                                          <td className="py-1 text-right text-xs text-gray-600">{formatCurrency(item.saleRate)}</td>
                                          <td className="py-1 text-right text-xs font-medium text-gray-900 pr-2">{formatCurrency(item.total)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
