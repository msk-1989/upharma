'use client';

import React from 'react';

// ==================== TYPES ====================

interface InvoiceItem {
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
  subtotal: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  paymentMode: string;
  items: InvoiceItem[];
  createdAt: string;
}

// ==================== PHARMACY STORE CONFIG ====================
// Defaults used when settings API hasn't loaded yet

const STORE_DEFAULTS = {
  name: 'Upharma Medical Store',
  address: 'Main Market, City Center',
  phone: '9876543210',
  gstNo: '27XXXXX1234X1ZX',
  drugLicenseNo: 'DL-2024000001',
  fssaiNo: '12345678901234',
};

// Cached settings loaded from API
let _cachedStore: typeof STORE_DEFAULTS | null = null;

export async function loadStoreSettings(): Promise<typeof STORE_DEFAULTS> {
  if (_cachedStore) return _cachedStore;
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      _cachedStore = {
        name: data.data.storeName || STORE_DEFAULTS.name,
        address: data.data.address || STORE_DEFAULTS.address,
        phone: data.data.phone || STORE_DEFAULTS.phone,
        gstNo: data.data.gstNumber || STORE_DEFAULTS.gstNo,
        drugLicenseNo: data.data.drugLicense || STORE_DEFAULTS.drugLicenseNo,
        fssaiNo: data.data.fssaiNo || STORE_DEFAULTS.fssaiNo,
      };
      return _cachedStore;
    }
  } catch { /* ignore */ }
  return STORE_DEFAULTS;
}

// Helper to get store settings (sync, returns cached or defaults)
function getStore(): typeof STORE_DEFAULTS {
  return _cachedStore || STORE_DEFAULTS;
}

// ==================== HELPERS ====================

function formatINR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const month = d.toLocaleString('en-IN', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear()).slice(-2);
  return `${month}-${year}`;
}

// ==================== SINGLE INVOICE TEMPLATE ====================

function InvoiceTemplate({ data, copyLabel }: { data: InvoiceData; copyLabel: string }) {
  const itemQtySmallest = (item: InvoiceItem) => {
    // Items come from API - quantity is in the unitType requested
    // For display, show quantity as entered
    return item.quantity;
  };

  const itemTotal = (item: InvoiceItem) => item.total;
  const store = getStore();

  return (
    <div className="invoice-page" style={{ pageBreakInside: 'avoid' }}>
      {/* Copy label */}
      <div style={{
        textAlign: 'center',
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '2px',
        textTransform: 'uppercase' as const,
        color: '#888',
        marginBottom: '2px',
      }}>
        {copyLabel}
      </div>

      {/* Store Header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h1 style={{
          fontSize: '16px',
          fontWeight: 800,
          color: '#1a1a1a',
          fontFamily: 'serif',
          margin: '0',
          lineHeight: '1.2',
        }}>
          {store.name}
        </h1>
        <p style={{
          fontSize: '9px',
          color: '#555',
          margin: '1px 0 0 0',
        }}>
          {store.address}
          {store.phone && <span> | Ph: {store.phone}</span>}
        </p>
        <p style={{
          fontSize: '8px',
          color: '#777',
          margin: '1px 0 0 0',
        }}>
          {store.gstNo && <span>GSTIN: {store.gstNo}</span>}
          {store.gstNo && store.drugLicenseNo && <span> | </span>}
          {store.drugLicenseNo && <span>DL No: {store.drugLicenseNo}</span>}
          {store.drugLicenseNo && store.fssaiNo && <span> | </span>}
          {store.fssaiNo && <span>FSSAI: {store.fssaiNo}</span>}
        </p>
      </div>

      {/* CASH MEMO Badge */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: '#8B0000',
          color: '#fff',
          padding: '2px 24px',
          fontSize: '12px',
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: '3px',
          borderRadius: '2px',
        }}>
          CASH MEMO
        </span>
      </div>

      {/* Bill Number & Date */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #CC0000',
        borderBottom: '1px solid #CC0000',
        padding: '3px 6px',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>
          {data.invoiceNo}
        </span>
        <span style={{ fontSize: '11px', color: '#333', fontWeight: 500 }}>
          Date: {formatShortDate(data.createdAt)}
        </span>
      </div>

      {/* Customer & Doctor */}
      <div style={{ marginBottom: '4px', padding: '0 4px' }}>
        <div style={{
          fontSize: '10px',
          color: '#333',
          marginBottom: '2px',
          borderBottom: '1px dotted #999',
          paddingBottom: '1px',
        }}>
          <span style={{ fontWeight: 600 }}>Customer: </span>
          <span>{data.customerName || 'Walk-in'}</span>
        </div>
      </div>

      {/* Items Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '9px',
        marginBottom: '4px',
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f0f0' }}>
            {[
              { label: '#', width: '6%', align: 'center' as const },
              { label: 'Particulars', width: '32%', align: 'left' as const },
              { label: 'Qty', width: '7%', align: 'center' as const },
              { label: 'Comp.', width: '20%', align: 'left' as const },
              { label: 'Batch', width: '13%', align: 'center' as const },
              { label: 'Exp.', width: '10%', align: 'center' as const },
              { label: 'Amount Rs.', width: '12%', align: 'right' as const },
            ].map(col => (
              <th key={col.label} style={{
                border: '1px solid #CC0000',
                padding: '2px 3px',
                textAlign: col.align,
                fontWeight: 700,
                fontSize: '8px',
                color: '#1a1a1a',
                width: col.width,
                backgroundColor: '#f5f0f0',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'center',
                color: '#444',
              }}>
                {idx + 1}
              </td>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'left',
                fontWeight: 600,
                color: '#1a1a1a',
                maxWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '8.5px',
              }}>
                {item.medicineName}
              </td>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'center',
                color: '#333',
              }}>
                {itemQtySmallest(item)}
              </td>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'left',
                color: '#555',
                fontSize: '8px',
                maxWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {/* Manufacturer not returned by API in items - skip for now */}
              </td>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'center',
                color: '#444',
                fontSize: '8px',
              }}>
                {item.batchNo || '-'}
              </td>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'center',
                color: '#444',
                fontSize: '8px',
              }}>
                {formatExpiry(item.expiryDate)}
              </td>
              <td style={{
                border: '1px solid #CC0000',
                padding: '1.5px 3px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#1a1a1a',
              }}>
                {formatINR(itemTotal(item))}
              </td>
            </tr>
          ))}
          {/* Empty rows to fill space if few items */}
          {data.items.length < 7 && Array.from({ length: 7 - data.items.length }).map((_, idx) => (
            <tr key={`empty-${idx}`}>
              {Array.from({ length: 7 }).map((_, cellIdx) => (
                <td key={cellIdx} style={{
                  border: '1px solid #CC0000',
                  padding: '2px 3px',
                  height: '14px',
                }}>
                  &nbsp;
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{
        borderTop: '1px solid #CC0000',
        paddingTop: '3px',
        marginBottom: '3px',
      }}>
        <table style={{ width: '100%', fontSize: '9px' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>Subtotal</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 600, color: '#333' }}>{formatINR(data.subtotal)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>CGST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', color: '#333' }}>{formatINR(data.cgst)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>SGST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', color: '#333' }}>{formatINR(data.sgst)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>Total GST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 600, color: '#333' }}>{formatINR(data.totalGst)}</td>
            </tr>
            {data.loyaltyPointsUsed > 0 && (
              <tr>
                <td style={{ textAlign: 'left', padding: '1px 4px', color: '#b45309' }}>Loyalty Discount</td>
                <td style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 600, color: '#b45309' }}>-{formatINR(data.loyaltyPointsUsed)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={2} style={{
                borderTop: '1px solid #CC0000',
                padding: '0',
              }} />
            </tr>
            <tr>
              <td style={{
                textAlign: 'left',
                padding: '3px 4px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#1a1a1a',
              }}>
                GRAND TOTAL
              </td>
              <td style={{
                textAlign: 'right',
                padding: '3px 4px',
                fontSize: '12px',
                fontWeight: 800,
                color: '#8B0000',
              }}>
                {formatINR(data.grandTotal)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Mode */}
      <div style={{
        fontSize: '9px',
        color: '#555',
        marginBottom: '4px',
        padding: '0 4px',
      }}>
        <span style={{ fontWeight: 600 }}>Payment: </span>
        <span>{data.paymentMode}</span>
        {data.loyaltyPointsEarned > 0 && (
          <span style={{ marginLeft: '12px', color: '#b45309', fontWeight: 600 }}>
            Points Earned: {data.loyaltyPointsEarned}
          </span>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid #CC0000',
        paddingTop: '3px',
        marginTop: '2px',
        padding: '3px 4px',
      }}>
        <p style={{
          textAlign: 'center',
          fontSize: '8px',
          color: '#555',
          margin: '0 0 2px 0',
          fontStyle: 'italic',
        }}>
          Thank you for your purchase! Visit again.
        </p>
        <p style={{
          textAlign: 'center',
          fontSize: '7px',
          color: '#888',
          margin: '0 0 1px 0',
        }}>
          Goods once sold will not be taken back or exchanged.
        </p>
        <p style={{
          textAlign: 'center',
          fontSize: '7px',
          color: '#999',
          margin: '0',
        }}>
          {store.drugLicenseNo && <span>DL No: {store.drugLicenseNo}</span>}
          {store.drugLicenseNo && store.fssaiNo && <span> | </span>}
          {store.fssaiNo && <span>FSSAI: {store.fssaiNo}</span>}
        </p>
      </div>
    </div>
  );
}

// ==================== CUT LINE ====================

function CutLine() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: '8px 0',
      padding: '0 10mm',
    }}>
      <div style={{
        flex: 1,
        borderTop: '1px dashed #999',
      }} />
      <span style={{
        fontSize: '8px',
        color: '#999',
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase' as const,
      }}>
        ✂ Cut Here ✂
      </span>
      <div style={{
        flex: 1,
        borderTop: '1px dashed #999',
      }} />
    </div>
  );
}

// ==================== PRINT BUTTON (for dialog) ====================

interface InvoicePrintProps {
  data: InvoiceData | null;
  show: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function InvoicePrintDialog({ data, show, onClose, onPrint }: InvoicePrintProps) {
  if (!show || !data) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        maxWidth: '95vw',
        maxHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Dialog Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              Invoice Generated
            </h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0 0' }}>
              {data.invoiceNo} — {formatINR(data.grandTotal)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#666',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Skip
            </button>
            <button
              onClick={onPrint}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
                backgroundColor: '#8B0000',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print A4 (2 Copies)
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
          backgroundColor: '#f0f0f0',
        }}>
          <div style={{
            width: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            backgroundColor: '#fff',
            padding: '8mm',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transform: 'scale(0.6)',
            transformOrigin: 'top center',
          }}>
            <InvoiceTemplate data={data} copyLabel="Customer Copy" />
            <CutLine />
            <InvoiceTemplate data={data} copyLabel="Store Copy" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HIDDEN PRINT AREA (renders during window.print) ====================

export function InvoicePrintArea({ data }: { data: InvoiceData | null }) {
  if (!data) return null;

  return (
    <div id="invoice-print-area" className="invoice-print-container">
      <InvoiceTemplate data={data} copyLabel="Customer Copy" />
      <CutLine />
      <InvoiceTemplate data={data} copyLabel="Store Copy" />
    </div>
  );
}
