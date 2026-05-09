'use client';

import React from 'react';

// ==================== SAMPLE INVOICE PREVIEW (for Settings page) ====================
// Renders a scaled-down preview of the invoice using live store settings

interface StoreInfo {
  storeName: string;
  phone: string;
  address: string;
  gstNumber: string;
  drugLicense: string;
  fssaiNo: string;
}

function formatINR(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Sample data for preview
const SAMPLE_ITEMS = [
  { name: 'Dolo 650 Tab', qty: 10, batch: 'D650A', exp: 'MAR-27', amount: 28.50 },
  { name: 'Pan D Caps', qty: 5, batch: 'PD2024', exp: 'JUN-27', amount: 95.00 },
  { name: 'Azithromycin 500mg', qty: 3, batch: 'AZT015', exp: 'DEC-26', amount: 147.00 },
];

export function InvoiceSamplePreview({ storeInfo, invoicePrefix, terms }: {
  storeInfo: StoreInfo;
  invoicePrefix: string;
  terms: string;
}) {
  const s = storeInfo;
  const subtotal = SAMPLE_ITEMS.reduce((sum, i) => sum + i.amount, 0);
  const gst = Math.round(subtotal * 0.12 * 100) / 100;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const grandTotal = subtotal + gst;
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const sampleInvNo = `${invoicePrefix || 'INV-'}01042`;

  const regLine = [s.drugLicense ? `DL No: ${s.drugLicense}` : '', s.fssaiNo ? `FSSAI: ${s.fssaiNo}` : ''].filter(Boolean).join(' | ');

  return (
    <div style={{
      width: '210mm',
      backgroundColor: '#fff',
      padding: '4mm 6mm',
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '9px',
      color: '#1a1a1a',
      lineHeight: 1.3,
      border: '1px solid #ddd',
      margin: '0 auto',
    }}>
      {/* ========== CUSTOMER COPY ========== */}
      <div style={{ textAlign: 'center', fontSize: '8px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '2px' }}>
        Customer Copy
      </div>

      {/* Store Header */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'serif', margin: '0', lineHeight: '1.2', color: '#1a1a1a' }}>
          {s.storeName || 'Your Store Name'}
        </h2>
        <p style={{ fontSize: '9px', color: '#555', margin: '1px 0 0 0' }}>
          {s.address || 'Your Address'}
          {s.phone ? ` | Ph: ${s.phone}` : ''}
        </p>
        <p style={{ fontSize: '8px', color: '#777', margin: '1px 0 0 0' }}>
          {s.gstNumber ? `GSTIN: ${s.gstNumber}` : 'GSTIN: XX...'}
          {s.drugLicense ? ` | DL No: ${s.drugLicense}` : ''}
          {s.fssaiNo ? ` | FSSAI: ${s.fssaiNo}` : ''}
        </p>
      </div>

      {/* CASH MEMO Badge */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: '#8B0000',
          color: '#fff',
          padding: '2px 24px',
          fontSize: '11px',
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: '3px',
          borderRadius: '2px',
        }}>
          CASH MEMO
        </span>
      </div>

      {/* Bill No & Date */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #CC0000',
        borderBottom: '1px solid #CC0000',
        padding: '3px 6px',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>{sampleInvNo}</span>
        <span style={{ fontSize: '10px', color: '#333', fontWeight: 500 }}>Date: {today}</span>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: '4px', padding: '0 4px' }}>
        <div style={{ fontSize: '10px', color: '#333', marginBottom: '2px', borderBottom: '1px dotted #999', paddingBottom: '1px' }}>
          <span style={{ fontWeight: 600 }}>Customer: </span>
          <span>Walk-in (Sample)</span>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '4px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f0f0' }}>
            {[
              { label: '#', w: '6%', a: 'center' },
              { label: 'Particulars', w: '32%', a: 'left' },
              { label: 'Qty', w: '7%', a: 'center' },
              { label: 'Comp.', w: '20%', a: 'left' },
              { label: 'Batch', w: '13%', a: 'center' },
              { label: 'Exp.', w: '10%', a: 'center' },
              { label: 'Amount Rs.', w: '12%', a: 'right' },
            ].map(col => (
              <th key={col.label} style={{
                border: '1px solid #CC0000',
                padding: '2px 3px',
                textAlign: col.a,
                fontWeight: 700,
                fontSize: '8px',
                color: '#1a1a1a',
                width: col.w,
                backgroundColor: '#f5f0f0',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ITEMS.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#444' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'left', fontWeight: 600, color: '#1a1a1a', fontSize: '8.5px' }}>{item.name}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#333' }}>{item.qty}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'left', color: '#555', fontSize: '8px' }}></td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#444', fontSize: '8px' }}>{item.batch}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#444', fontSize: '8px' }}>{item.exp}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'right', fontWeight: 600, color: '#1a1a1a' }}>{formatINR(item.amount)}</td>
            </tr>
          ))}
          {/* Fill rows */}
          {Array.from({ length: 4 }).map((_, idx) => (
            <tr key={`e-${idx}`}>
              {Array.from({ length: 7 }).map((_, ci) => (
                <td key={ci} style={{ border: '1px solid #CC0000', padding: '2px 3px', height: '14px' }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #CC0000', paddingTop: '3px', marginBottom: '3px' }}>
        <table style={{ width: '100%', fontSize: '9px' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>Subtotal</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 600, color: '#333' }}>{formatINR(subtotal)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>CGST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', color: '#333' }}>{formatINR(cgst)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>SGST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', color: '#333' }}>{formatINR(sgst)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ borderTop: '1px solid #CC0000', padding: '0' }} />
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '3px 4px', fontSize: '11px', fontWeight: 800, color: '#1a1a1a' }}>GRAND TOTAL</td>
              <td style={{ textAlign: 'right', padding: '3px 4px', fontSize: '11px', fontWeight: 800, color: '#8B0000' }}>{formatINR(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment */}
      <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px', padding: '0 4px' }}>
        <span style={{ fontWeight: 600 }}>Payment: </span>
        <span>Cash</span>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #CC0000', paddingTop: '3px', padding: '3px 4px' }}>
        <p style={{ textAlign: 'center', fontSize: '8px', color: '#555', margin: '0 0 2px 0', fontStyle: 'italic' }}>
          Thank you for your purchase! Visit again.
        </p>
        {terms && (
          <p style={{ textAlign: 'center', fontSize: '7px', color: '#888', margin: '0 0 1px 0', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
            {terms.split('\n').slice(0, 2).join(' | ')}
          </p>
        )}
        {regLine && (
          <p style={{ textAlign: 'center', fontSize: '7px', color: '#999', margin: '0' }}>{regLine}</p>
        )}
      </div>

      {/* ========== CUT LINE ========== */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        margin: '10px 0', padding: '0 10mm',
      }}>
        <div style={{ flex: 1, borderTop: '1px dashed #aaa' }} />
        <span style={{ fontSize: '8px', color: '#aaa', fontWeight: 600, letterSpacing: '1px' }}>
          ✂ Cut Here ✂
        </span>
        <div style={{ flex: 1, borderTop: '1px dashed #aaa' }} />
      </div>

      {/* ========== STORE COPY (abbreviated) ========== */}
      <div style={{ textAlign: 'center', fontSize: '8px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: '#999', marginBottom: '2px' }}>
        Store Copy
      </div>

      {/* Store Header (duplicate) */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 800, fontFamily: 'serif', margin: '0', lineHeight: '1.2', color: '#1a1a1a' }}>
          {s.storeName || 'Your Store Name'}
        </h2>
        <p style={{ fontSize: '9px', color: '#555', margin: '1px 0 0 0' }}>
          {s.address || 'Your Address'}
          {s.phone ? ` | Ph: ${s.phone}` : ''}
        </p>
        <p style={{ fontSize: '8px', color: '#777', margin: '1px 0 0 0' }}>
          {s.gstNumber ? `GSTIN: ${s.gstNumber}` : 'GSTIN: XX...'}
          {s.drugLicense ? ` | DL No: ${s.drugLicense}` : ''}
          {s.fssaiNo ? ` | FSSAI: ${s.fssaiNo}` : ''}
        </p>
      </div>

      {/* CASH MEMO Badge */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        <span style={{
          display: 'inline-block',
          backgroundColor: '#8B0000',
          color: '#fff',
          padding: '2px 24px',
          fontSize: '11px',
          fontWeight: 800,
          fontFamily: 'sans-serif',
          letterSpacing: '3px',
          borderRadius: '2px',
        }}>
          CASH MEMO
        </span>
      </div>

      {/* Bill No & Date */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #CC0000',
        borderBottom: '1px solid #CC0000',
        padding: '3px 6px',
        marginBottom: '4px',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>{sampleInvNo}</span>
        <span style={{ fontSize: '10px', color: '#333', fontWeight: 500 }}>Date: {today}</span>
      </div>

      {/* Customer */}
      <div style={{ marginBottom: '4px', padding: '0 4px' }}>
        <div style={{ fontSize: '10px', color: '#333', borderBottom: '1px dotted #999', paddingBottom: '1px' }}>
          <span style={{ fontWeight: 600 }}>Customer: </span>
          <span>Walk-in (Sample)</span>
        </div>
      </div>

      {/* Items Table (same items) */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', marginBottom: '4px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f0f0' }}>
            {[
              { label: '#', w: '6%', a: 'center' },
              { label: 'Particulars', w: '32%', a: 'left' },
              { label: 'Qty', w: '7%', a: 'center' },
              { label: 'Comp.', w: '20%', a: 'left' },
              { label: 'Batch', w: '13%', a: 'center' },
              { label: 'Exp.', w: '10%', a: 'center' },
              { label: 'Amount Rs.', w: '12%', a: 'right' },
            ].map(col => (
              <th key={col.label} style={{
                border: '1px solid #CC0000',
                padding: '2px 3px',
                textAlign: col.a,
                fontWeight: 700,
                fontSize: '8px',
                color: '#1a1a1a',
                width: col.w,
                backgroundColor: '#f5f0f0',
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SAMPLE_ITEMS.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#444' }}>{idx + 1}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'left', fontWeight: 600, color: '#1a1a1a', fontSize: '8.5px' }}>{item.name}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#333' }}>{item.qty}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'left', color: '#555', fontSize: '8px' }}></td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#444', fontSize: '8px' }}>{item.batch}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'center', color: '#444', fontSize: '8px' }}>{item.exp}</td>
              <td style={{ border: '1px solid #CC0000', padding: '2px 3px', textAlign: 'right', fontWeight: 600, color: '#1a1a1a' }}>{formatINR(item.amount)}</td>
            </tr>
          ))}
          {Array.from({ length: 4 }).map((_, idx) => (
            <tr key={`e2-${idx}`}>
              {Array.from({ length: 7 }).map((_, ci) => (
                <td key={ci} style={{ border: '1px solid #CC0000', padding: '2px 3px', height: '14px' }}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ borderTop: '1px solid #CC0000', paddingTop: '3px', marginBottom: '3px' }}>
        <table style={{ width: '100%', fontSize: '9px' }}>
          <tbody>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>Subtotal</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', fontWeight: 600, color: '#333' }}>{formatINR(subtotal)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>CGST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', color: '#333' }}>{formatINR(cgst)}</td>
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '1px 4px', color: '#555' }}>SGST</td>
              <td style={{ textAlign: 'right', padding: '1px 4px', color: '#333' }}>{formatINR(sgst)}</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ borderTop: '1px solid #CC0000', padding: '0' }} />
            </tr>
            <tr>
              <td style={{ textAlign: 'left', padding: '3px 4px', fontSize: '11px', fontWeight: 800, color: '#1a1a1a' }}>GRAND TOTAL</td>
              <td style={{ textAlign: 'right', padding: '3px 4px', fontSize: '11px', fontWeight: 800, color: '#8B0000' }}>{formatINR(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px', padding: '0 4px' }}>
        <span style={{ fontWeight: 600 }}>Payment: </span><span>Cash</span>
      </div>

      <div style={{ borderTop: '1px solid #CC0000', paddingTop: '3px', padding: '3px 4px' }}>
        <p style={{ textAlign: 'center', fontSize: '8px', color: '#555', margin: '0 0 2px 0', fontStyle: 'italic' }}>
          Thank you for your purchase! Visit again.
        </p>
        {terms && (
          <p style={{ textAlign: 'center', fontSize: '7px', color: '#888', margin: '0 0 1px 0', whiteSpace: 'pre-line', lineHeight: '1.4' }}>
            {terms.split('\n').slice(0, 2).join(' | ')}
          </p>
        )}
        {regLine && (
          <p style={{ textAlign: 'center', fontSize: '7px', color: '#999', margin: '0' }}>{regLine}</p>
        )}
      </div>
    </div>
  );
}
