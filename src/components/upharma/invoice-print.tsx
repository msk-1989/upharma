'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// ==================== TYPES ====================

interface InvoiceItem {
  medicineName: string;
  quantity: number;
  unitType: string;
  saleRate: number;
  mrp: number;
  batchNo: string | null;
  expiryDate: string | null;
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
  items: InvoiceItem[];
  createdAt: string;
}

// ==================== PHARMACY STORE CONFIG ====================

const STORE_DEFAULTS = {
  name: 'Upharma Medical Store',
  address: 'Main Market, City Center',
  phone: '9876543210',
  gstNo: '27XXXXX1234X1ZX',
  drugLicenseNo: 'DL-2024000001',
  fssaiNo: '12345678901234',
  upiId: '',
};

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
        upiId: data.data.upiId || STORE_DEFAULTS.upiId,
      };
      return _cachedStore;
    }
  } catch { /* ignore */ }
  return STORE_DEFAULTS;
}

function getStore(): typeof STORE_DEFAULTS {
  return _cachedStore || STORE_DEFAULTS;
}

// ==================== HELPERS ====================

function fmtAmt(amount: number): string {
  if (amount == null || isNaN(amount)) return '0.00';
  return amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatExpiry(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mi}`;
}

// ==================== UPI STRING ====================

function generateUpiString(upiId: string, storeName: string, amount: number, invoiceNo: string): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(storeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(invoiceNo)}`;
}

// ==================== NUMBER TO WORDS (Indian) ====================

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  }

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);
  let result = convert(rupees) + ' Rupees';
  if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
  return result + ' Only';
}

// ==================== COMMON TABLE STYLES ====================

const BORDER = '1px solid #333';
const HEADER_BG = '#f0f4f8';
const STORE_COLOR = '#1a365d';

// ==================== INVOICE HTML (for new window print) ====================

function buildInvoiceHTML(data: InvoiceData, store: typeof STORE_DEFAULTS): string {
  const itemsHTML = data.items.map((item, idx) => `
    <tr>
      <td style="border:${BORDER};padding:3px 5px;text-align:center;font-size:9px;">${idx + 1}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:left;font-weight:600;font-size:9px;">${item.medicineName}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:center;font-size:9px;">${item.unitType || ''}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:center;font-size:9px;">${item.batchNo || '-'}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:center;font-size:9px;">${formatExpiry(item.expiryDate)}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:right;font-size:9px;">${fmtAmt(item.mrp)}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:right;font-size:9px;">${item.quantity}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:right;font-size:9px;">${fmtAmt(item.saleRate)}</td>
      <td style="border:${BORDER};padding:3px 5px;text-align:right;font-weight:600;font-size:9px;">${fmtAmt(item.total)}</td>
    </tr>`).join('');

  const emptyRows = data.items.length < 8
    ? Array.from({ length: 8 - data.items.length }).map(() =>
      '<tr>' + Array(9).fill('<td style="border:' + BORDER + ';padding:3px 5px;height:16px;font-size:9px;">&nbsp;</td>').join('') + '</tr>'
    ).join('')
    : '';

  const loyaltyDeduction = data.loyaltyPointsUsed > 0 ? data.loyaltyPointsUsed : 0;
  const finalTotal = data.subtotal - loyaltyDeduction;

  const inv = (copyLabel: string) => `
    <div style="width:100%;max-width:210mm;padding:6mm 8mm;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;background:#fff;line-height:1.4;page-break-inside:avoid;">
      <!-- Copy Label -->
      <div style="text-align:center;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#888;margin-bottom:3px;">${copyLabel}</div>

      <!-- Store Header -->
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;">
        <div style="flex:1;">
          <h1 style="font-size:16px;font-weight:800;color:${STORE_COLOR};margin:0;line-height:1.2;text-transform:uppercase;letter-spacing:1px;">${store.name}</h1>
          <p style="font-size:8.5px;color:#555;margin:2px 0 0 0;">${store.address}</p>
          <p style="font-size:8px;color:#666;margin:1px 0 0 0;">Ph: ${store.phone}</p>
        </div>
        <div style="text-align:right;flex-shrink:0;margin-left:12px;">
          <div style="font-size:14px;font-weight:800;color:${STORE_COLOR};text-transform:uppercase;letter-spacing:2px;">CASH MEMO</div>
          <div style="font-size:8px;color:#666;margin-top:1px;">${store.drugLicenseNo ? 'DL No: ' + store.drugLicenseNo : ''}</div>
        </div>
      </div>

      <!-- Separator -->
      <div style="border-top:1px solid #333;border-bottom:1px solid #333;margin:5px 0;"></div>

      <!-- Bill Info -->
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:9px;">
        <div>
          <div><span style="font-weight:700;">Inv. No: </span><span>${data.invoiceNo}</span></div>
          <div><span style="font-weight:700;">Date: </span><span>${formatShortDate(data.createdAt)}</span></div>
          <div><span style="font-weight:700;">Time: </span><span>${formatTime(data.createdAt)}</span></div>
        </div>
        <div style="text-align:right;">
          <div><span style="font-weight:700;">Payment: </span><span>${data.paymentMode || 'Cash'}</span></div>
          ${data.customerName ? `<div><span style="font-weight:700;">Customer: </span><span>${data.customerName}</span></div>` : ''}
          ${data.doctorName ? `<div><span style="font-weight:700;">Dr.: </span><span>${data.doctorName}</span></div>` : ''}
        </div>
      </div>

      <!-- Separator -->
      <div style="border-top:1px solid #333;border-bottom:1px solid #333;margin:3px 0;"></div>

      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;font-size:9px;margin-bottom:4px;">
        <thead>
          <tr style="background:${HEADER_BG};">
            <th style="border:${BORDER};padding:4px 5px;text-align:center;font-weight:700;font-size:8px;width:5%;">Sr.</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:left;font-weight:700;font-size:8px;width:24%;">Name of Product</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:center;font-weight:700;font-size:8px;width:8%;">Pkg.</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:center;font-weight:700;font-size:8px;width:11%;">Batch</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:center;font-weight:700;font-size:8px;width:8%;">Exp.</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:right;font-weight:700;font-size:8px;width:10%;">MRP</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:right;font-weight:700;font-size:8px;width:7%;">Qty</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:right;font-weight:700;font-size:8px;width:10%;">Rate</th>
            <th style="border:${BORDER};padding:4px 5px;text-align:right;font-weight:700;font-size:8px;width:12%;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHTML}${emptyRows}</tbody>
      </table>

      <!-- Totals -->
      <div style="border-top:1px solid #333;padding-top:4px;">
        <table style="width:100%;font-size:9.5px;">
          <tbody>
            ${loyaltyDeduction > 0 ? `
            <tr>
              <td style="text-align:left;padding:1px 5px;color:#555;">Subtotal</td>
              <td style="text-align:right;padding:1px 5px;font-weight:600;color:#333;">${fmtAmt(data.subtotal)}</td>
            </tr>
            <tr>
              <td style="text-align:left;padding:1px 5px;color:#b45309;">Loyalty Discount</td>
              <td style="text-align:right;padding:1px 5px;font-weight:600;color:#b45309;">-${fmtAmt(loyaltyDeduction)}</td>
            </tr>` : ''}
            <tr>
              <td colspan="2" style="border-top:1px solid #333;padding:0;"></td>
            </tr>
            <tr>
              <td style="text-align:left;padding:4px 5px;font-size:13px;font-weight:800;color:#1a1a1a;">NET AMOUNT</td>
              <td style="text-align:right;padding:4px 5px;font-size:13px;font-weight:800;color:${STORE_COLOR};">${fmtAmt(finalTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Amount in Words -->
      <div style="margin-top:4px;padding:3px 5px;border:1px solid #ddd;background:#fafafa;border-radius:2px;">
        <span style="font-size:8px;font-weight:700;color:#555;text-transform:uppercase;">Amount in Words: </span>
        <span style="font-size:8.5px;color:#333;font-style:italic;">${numberToWords(finalTotal)}</span>
      </div>

      <!-- Footer -->
      <div style="border-top:1px solid #333;margin-top:6px;padding-top:6px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <p style="font-size:8px;color:#555;margin:0 0 2px 0;font-style:italic;text-align:center;">Thank you for your purchase! Visit again.</p>
            <p style="font-size:7px;color:#888;margin:0 0 1px 0;text-align:center;">Goods once sold will not be taken back or exchanged.</p>
            <p style="font-size:7px;color:#999;margin:0;text-align:center;">
              ${store.drugLicenseNo ? 'DL No: ' + store.drugLicenseNo : ''}${store.drugLicenseNo && store.fssaiNo ? ' | ' : ''}${store.fssaiNo ? 'FSSAI: ' + store.fssaiNo : ''}
            </p>
            <p style="font-size:6.5px;color:#bbb;margin:2px 0 0 0;text-align:center;">MultiNex Multi Solutions LLP | All Rights Reserved</p>
            ${data.loyaltyPointsEarned > 0 ? `<p style="font-size:8px;color:#b45309;margin:3px 0 0 0;text-align:center;font-weight:600;">Loyalty Points Earned: ${data.loyaltyPointsEarned}</p>` : ''}
          </div>
          <div style="margin-left:10px;text-align:center;flex-shrink:0;" id="qr-placeholder-${copyLabel === 'Store Copy' ? 'store' : 'customer'}"></div>
        </div>
      </div>
    </div>`;

  const cutLine = `
    <div style="display:flex;align-items:center;gap:8px;margin:8px 0;padding:0 8mm;">
      <div style="flex:1;border-top:1px dashed #999;"></div>
      <span style="font-size:8px;color:#999;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Cut Here</span>
      <div style="flex:1;border-top:1px dashed #999;"></div>
    </div>`;

  return `<!DOCTYPE html><html><head><title>Invoice ${data.invoiceNo}</title>
    <style>@page{size:A4 portrait;margin:5mm 6mm;}*{margin:0;padding:0;box-sizing:border-box;}body{font-family:Arial,Helvetica,sans-serif;background:#fff;}</style>
    <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"><\/script>
  </head><body>${inv('Customer Copy')}${cutLine}${inv('Store Copy')}
    <script>
      window.onload = function() {
        if (typeof QRCode !== 'undefined' && '${store.upiId}') {
          var upi = 'upi://pay?pa=' + encodeURIComponent('${store.upiId}') + '&pn=' + encodeURIComponent('${store.name.replace(/'/g, "\\'")}') + '&am=${finalTotal.toFixed(2)}&cu=INR&tn=' + encodeURIComponent('${data.invoiceNo}');
          ['customer', 'store'].forEach(function(id) {
            var el = document.getElementById('qr-placeholder-' + id);
            if (el) {
              var canvas = document.createElement('canvas');
              QRCode.toCanvas(canvas, upi, { width: 90, margin: 1 }, function(error) {
                if (!error) el.appendChild(canvas);
              });
              var label = document.createElement('p');
              label.style.cssText = 'font-size:6px;color:#888;margin:2px 0 0 0;';
              label.textContent = 'Scan to Pay via UPI';
              el.appendChild(label);
            }
          });
        }
        window.print();
        setTimeout(function() { window.close(); }, 500);
      };
    <\/script>
  </body></html>`;
}

export async function printInvoiceNewWindow(data: InvoiceData): Promise<void> {
  const store = await loadStoreSettings();
  const html = buildInvoiceHTML(data, store);
  const win = window.open('', '_blank', 'width=800,height=1000');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ==================== SINGLE INVOICE TEMPLATE (React) ====================

function InvoiceTemplate({ data, copyLabel }: { data: InvoiceData; copyLabel: string }) {
  const store = getStore();
  const loyaltyDeduction = data.loyaltyPointsUsed > 0 ? data.loyaltyPointsUsed : 0;
  const finalTotal = data.subtotal - loyaltyDeduction;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (store.upiId && finalTotal > 0) {
      const upiString = generateUpiString(store.upiId, store.name, finalTotal, data.invoiceNo);
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(upiString, { width: 150, margin: 1 }).then((url: string) => {
          setQrDataUrl(url);
        }).catch(() => setQrDataUrl(null));
      }).catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [store.upiId, store.name, finalTotal, data.invoiceNo]);

  return (
    <div style={{ pageBreakInside: 'avoid' }}>
      {/* Copy Label */}
      <div style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#888', marginBottom: '3px' }}>
        {copyLabel}
      </div>

      {/* Store Header - Two Column Layout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '16px', fontWeight: 800, color: STORE_COLOR, margin: 0, lineHeight: '1.2', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>
            {store.name}
          </h1>
          <p style={{ fontSize: '8.5px', color: '#555', margin: '2px 0 0 0' }}>{store.address}</p>
          <p style={{ fontSize: '8px', color: '#666', margin: '1px 0 0 0' }}>Ph: {store.phone}</p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ fontSize: '14px', fontWeight: 800, color: STORE_COLOR, textTransform: 'uppercase' as const, letterSpacing: '2px' }}>CASH MEMO</div>
          {store.drugLicenseNo && <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>DL No: {store.drugLicenseNo}</div>}
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid #333', borderBottom: '1px solid #333', margin: '5px 0' }} />

      {/* Bill Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '9px' }}>
        <div>
          <div><span style={{ fontWeight: 700 }}>Inv. No: </span><span>{data.invoiceNo}</span></div>
          <div><span style={{ fontWeight: 700 }}>Date: </span><span>{formatShortDate(data.createdAt)}</span></div>
          <div><span style={{ fontWeight: 700 }}>Time: </span><span>{formatTime(data.createdAt)}</span></div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><span style={{ fontWeight: 700 }}>Payment: </span><span>{data.paymentMode || 'Cash'}</span></div>
          {data.customerName && <div><span style={{ fontWeight: 700 }}>Customer: </span><span>{data.customerName}</span></div>}
          {data.doctorName && <div><span style={{ fontWeight: 700 }}>Dr.: </span><span>{data.doctorName}</span></div>}
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid #333', borderBottom: '1px solid #333', margin: '3px 0' }} />

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '4px' }}>
        <thead>
          <tr style={{ background: HEADER_BG }}>
            {[
              { label: 'Sr.', w: '5%', a: 'center' as const },
              { label: 'Name of Product', w: '24%', a: 'left' as const },
              { label: 'Pkg.', w: '8%', a: 'center' as const },
              { label: 'Batch', w: '11%', a: 'center' as const },
              { label: 'Exp.', w: '8%', a: 'center' as const },
              { label: 'MRP', w: '10%', a: 'right' as const },
              { label: 'Qty', w: '7%', a: 'right' as const },
              { label: 'Rate', w: '10%', a: 'right' as const },
              { label: 'Amount', w: '12%', a: 'right' as const },
            ].map(c => (
              <th key={c.label} style={{ border: BORDER, padding: '4px 5px', textAlign: c.a, fontWeight: 700, fontSize: '8px', width: c.w, background: HEADER_BG }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>{idx + 1}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'left', fontWeight: 600, fontSize: '9px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>{item.medicineName}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>{item.unitType || ''}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>{item.batchNo || '-'}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'center', fontSize: '9px' }}>{formatExpiry(item.expiryDate)}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'right', fontSize: '9px' }}>{fmtAmt(item.mrp)}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'right', fontSize: '9px' }}>{item.quantity}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'right', fontSize: '9px' }}>{fmtAmt(item.saleRate)}</td>
              <td style={{ border: BORDER, padding: '3px 5px', textAlign: 'right', fontWeight: 600, fontSize: '9px' }}>{fmtAmt(item.total)}</td>
            </tr>
          ))}
          {data.items.length < 8 && Array.from({ length: 8 - data.items.length }).map((_, idx) => (
            <tr key={`empty-${idx}`}>
              {Array.from({ length: 9 }).map((_, ci) => (
                <td key={ci} style={{ border: BORDER, padding: '3px 5px', height: '16px', fontSize: '9px' }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #333', paddingTop: '4px' }}>
        <table style={{ width: '100%', fontSize: '9.5px' }}>
          <tbody>
            {loyaltyDeduction > 0 && (
              <tr>
                <td style={{ textAlign: 'left', padding: '1px 5px', color: '#555' }}>Subtotal</td>
                <td style={{ textAlign: 'right', padding: '1px 5px', fontWeight: 600, color: '#333' }}>{fmtAmt(data.subtotal)}</td>
              </tr>
            )}
            {loyaltyDeduction > 0 && (
              <tr>
                <td style={{ textAlign: 'left', padding: '1px 5px', color: '#b45309' }}>Loyalty Discount</td>
                <td style={{ textAlign: 'right', padding: '1px 5px', fontWeight: 600, color: '#b45309' }}>-{fmtAmt(loyaltyDeduction)}</td>
              </tr>
            )}
            <tr><td colSpan={2} style={{ borderTop: '1px solid #333', padding: 0 }} /></tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '4px 5px', fontSize: '13px', fontWeight: 800, color: '#1a1a1a' }}>NET AMOUNT</td>
              <td style={{ textAlign: 'right', padding: '4px 5px', fontSize: '13px', fontWeight: 800, color: STORE_COLOR }}>{fmtAmt(finalTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Amount in Words */}
      <div style={{ marginTop: '4px', padding: '3px 5px', border: '1px solid #ddd', background: '#fafafa', borderRadius: '2px' }}>
        <span style={{ fontSize: '8px', fontWeight: 700, color: '#555', textTransform: 'uppercase' as const }}>Amount in Words: </span>
        <span style={{ fontSize: '8.5px', color: '#333', fontStyle: 'italic' }}>{numberToWords(finalTotal)}</span>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #333', marginTop: '6px', paddingTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '8px', color: '#555', margin: '0 0 2px 0', fontStyle: 'italic', textAlign: 'center' }}>Thank you for your purchase! Visit again.</p>
            <p style={{ fontSize: '7px', color: '#888', margin: '0 0 1px 0', textAlign: 'center' }}>Goods once sold will not be taken back or exchanged.</p>
            <p style={{ fontSize: '7px', color: '#999', margin: 0, textAlign: 'center' }}>
              {store.drugLicenseNo && <span>DL No: {store.drugLicenseNo}</span>}
              {store.drugLicenseNo && store.fssaiNo && <span> | </span>}
              {store.fssaiNo && <span>FSSAI: {store.fssaiNo}</span>}
            </p>
            {data.loyaltyPointsEarned > 0 && <p style={{ fontSize: '8px', color: '#b45309', margin: '3px 0 0 0', textAlign: 'center', fontWeight: 600 }}>Loyalty Points Earned: {data.loyaltyPointsEarned}</p>}
          </div>
          {qrDataUrl && (
            <div style={{ marginLeft: '10px', textAlign: 'center', flexShrink: 0 }}>
              <img src={qrDataUrl} alt="UPI QR" style={{ width: '80px', height: '80px', border: '1px solid #ddd', borderRadius: '4px' }} />
              <p style={{ fontSize: '6px', color: '#888', margin: '2px 0 0 0' }}>Scan to Pay via UPI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== CUT LINE ====================

function CutLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0', padding: '0 10mm' }}>
      <div style={{ flex: 1, borderTop: '1px dashed #999' }} />
      <span style={{ fontSize: '8px', color: '#999', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const }}>
        Cut Here
      </span>
      <div style={{ flex: 1, borderTop: '1px dashed #999' }} />
    </div>
  );
}

// ==================== PRINT DIALOG ====================

interface InvoicePrintProps {
  data: InvoiceData | null;
  show: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export function InvoicePrintDialog({ data, show, onClose, onPrint }: InvoicePrintProps) {
  if (!show || !data) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxWidth: '95vw', maxHeight: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Invoice Generated</h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0 0' }}>{data.invoiceNo}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: '#666', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}>Skip</button>
            <button onClick={onPrint} style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: STORE_COLOR, border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
              Print A4 (2 Copies)
            </button>
          </div>
        </div>
        {/* Preview */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', backgroundColor: '#f0f0f0' }}>
          <div style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', backgroundColor: '#fff', padding: '8mm', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transform: 'scale(0.6)', transformOrigin: 'top center' }}>
            <InvoiceTemplate data={data} copyLabel="Customer Copy" />
            <CutLine />
            <InvoiceTemplate data={data} copyLabel="Store Copy" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HIDDEN PRINT AREA ====================

export function InvoicePrintArea({ data }: { data: InvoiceData | null }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!data || !mounted) return null;
  return createPortal(
    <div id="invoice-print-area" className="invoice-print-container">
      <InvoiceTemplate data={data} copyLabel="Customer Copy" />
      <CutLine />
      <InvoiceTemplate data={data} copyLabel="Store Copy" />
    </div>,
    document.body,
  );
}
