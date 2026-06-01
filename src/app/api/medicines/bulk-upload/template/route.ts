import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

// Column definitions for the sample template
const COLUMNS = [
  { header: 'Name *', key: 'name', width: 25, example: 'Dolo 650mg Tablet' },
  { header: 'Generic Name', key: 'genericName', width: 20, example: 'Paracetamol' },
  { header: 'Manufacturer', key: 'manufacturer', width: 18, example: 'Micro Labs Ltd' },
  { header: 'Category', key: 'category', width: 15, example: 'General' },
  { header: 'Drug Schedule', key: 'drugSchedule', width: 14, example: 'OTC' },
  { header: 'HSN Code', key: 'hsnCode', width: 14, example: '30049099' },
  { header: 'GST %', key: 'gstPercent', width: 10, example: 12 },
  { header: 'Barcode', key: 'barcode', width: 16, example: '8901234567890' },
  { header: 'Base Unit', key: 'baseUnit', width: 12, example: 'Tablet' },
  { header: 'Units/Strip', key: 'unitsPerStrip', width: 12, example: 10 },
  { header: 'Strips/Box', key: 'stripsPerBox', width: 12, example: 10 },
  { header: 'Allow Loose Sale', key: 'allowLooseSale', width: 15, example: 'Yes' },
  { header: 'Purchase Rate', key: 'purchaseRate', width: 14, example: 8.5 },
  { header: 'Sale Rate', key: 'saleRate', width: 12, example: 12.0 },
  { header: 'MRP', key: 'mrp', width: 10, example: 15.0 },
  { header: 'Reorder Level', key: 'reorderLevel', width: 14, example: 20 },
  { header: 'Batch No', key: 'batchNo', width: 16, example: 'B2024-001' },
  { header: 'Expiry Date', key: 'expiryDate', width: 14, example: '2026-06-01' },
  { header: 'Stock Qty (units)', key: 'stockQty', width: 16, example: 500 },
];

// Sample medicines data
const SAMPLE_DATA = [
  { name: 'Dolo 650mg Tablet', genericName: 'Paracetamol', manufacturer: 'Micro Labs Ltd', category: 'General', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001001', baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, allowLooseSale: 'Yes', purchaseRate: 8.5, saleRate: 12, mrp: 15, reorderLevel: 100, batchNo: 'B2026-001', expiryDate: '2026-11-30', stockQty: 500 },
  { name: 'Crocin Advance 500mg', genericName: 'Paracetamol', manufacturer: 'GSK', category: 'General', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001002', baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, allowLooseSale: 'Yes', purchaseRate: 6, saleRate: 9.5, mrp: 12, reorderLevel: 80, batchNo: 'B2026-002', expiryDate: '2027-03-15', stockQty: 300 },
  { name: 'Augmentin 625mg Tablet', genericName: 'Amoxicillin+Clavulanic Acid', manufacturer: 'GSK', category: 'Antibiotics', drugSchedule: 'H', hsnCode: '30041099', gstPercent: 12, barcode: '8901234001003', baseUnit: 'Tablet', unitsPerStrip: 6, stripsPerBox: 10, allowLooseSale: 'No', purchaseRate: 25, saleRate: 38, mrp: 45.5, reorderLevel: 50, batchNo: 'B2026-003', expiryDate: '2026-09-30', stockQty: 180 },
  { name: 'Pan 40mg Capsule', genericName: 'Pantoprazole', manufacturer: 'Alkem', category: 'Gastro', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001004', baseUnit: 'Capsule', unitsPerStrip: 10, stripsPerBox: 10, allowLooseSale: 'Yes', purchaseRate: 15, saleRate: 22, mrp: 28, reorderLevel: 60, batchNo: 'B2026-004', expiryDate: '2027-06-30', stockQty: 400 },
  { name: 'Azithral 500mg Tablet', genericName: 'Azithromycin', manufacturer: 'Alembic Pharma', category: 'Antibiotics', drugSchedule: 'H', hsnCode: '30041099', gstPercent: 12, barcode: '8901234001005', baseUnit: 'Tablet', unitsPerStrip: 3, stripsPerBox: 10, allowLooseSale: 'No', purchaseRate: 28, saleRate: 42, mrp: 52, reorderLevel: 40, batchNo: 'B2026-005', expiryDate: '2026-12-31', stockQty: 150 },
];

export async function GET() {
  try {
    const wb = XLSX.utils.book_new();

    // ─── Sheet 1: Sample Data ───
    const headers = COLUMNS.map(c => c.header);
    const keys = COLUMNS.map(c => c.key);

    const sampleRows = SAMPLE_DATA.map(row => keys.map(k => row[k as keyof typeof row]));
    const wsData = [headers, ...sampleRows];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = COLUMNS.map(c => ({ wch: c.width }));

    // Style the header row
    const range = XLSX.utils.decode_range('A1:' + String.fromCharCode(64 + headers.length) + '1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, sz: 11 },
          fill: { fgColor: { rgb: '1a365d' } },
          alignment: { horizontal: 'center' },
        };
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Medicines Data');

    // ─── Sheet 2: Instructions ───
    const instructions = [
      ['UPharma — Bulk Upload Instructions'],
      [''],
      ['HOW TO USE THIS TEMPLATE:'],
      [''],
      ['1. Open "Medicines Data" sheet — it has sample records as examples.'],
      ['2. You can add new medicines, or update existing ones.'],
      ['3. Keep the column headers exactly as they are — do NOT rename them.'],
      ['4. Fields marked with * are REQUIRED (at minimum: Name).'],
      ['5. Delete the sample rows and add your own data.'],
      ['6. Save the file and upload it in the uPharma Bulk Upload page.'],
      [''],
      ['COLUMN DESCRIPTIONS:'],
      [''],
      ['Name * (Required): Medicine name. If a medicine with this name already exists, it will be UPDATED.'],
      ['Generic Name: Salt/composition name (e.g., Paracetamol, Azithromycin)'],
      ['Manufacturer: Company name (e.g., Micro Labs Ltd, GSK, Sun Pharma)'],
      ['Category: Medicine category — e.g., General, Antibiotics, Gastro, Cardiac, OTC, Skin'],
      ['Drug Schedule: Indian drug schedule — OTC, H, H1, X, G, K, C, C1, N, P'],
      ['HSN Code: HSN code for GST filing (optional, 8-10 digit number)'],
      ['GST %: GST percentage — 5, 12, or 18 (default: 12)'],
      ['Barcode: EAN/UPC barcode number (optional, for scanning at POS)'],
      ['Base Unit: Unit type — Tablet, Capsule, Bottle, Tube, Sachet, Syrup, Cream, Injection, Vial'],
      ['Units/Strip: Number of tablets/capsules in one strip (default: 10)'],
      ['Strips/Box: Number of strips in one box (default: 10)'],
      ['Allow Loose Sale: Yes or No — whether to sell individual tablets (default: Yes)'],
      ['Purchase Rate: Cost price per smallest unit (tablet/capsule), NOT per strip/box'],
      ['Sale Rate: Selling price per smallest unit (tablet/capsule), NOT per strip/box'],
      ['MRP: Maximum Retail Price per smallest unit (tablet/capsule)'],
      ['Reorder Level: Min stock qty to trigger low stock alert (default: 20)'],
      ['Batch No: Batch/lot number for initial inventory (optional but recommended)'],
      ['Expiry Date: Expiry date in YYYY-MM-DD format (optional but recommended)'],
      ['Stock Qty (units): Opening stock in smallest units — e.g., if 50 strips of 10 tablets = 500 units'],
      [''],
      ['IMPORTANT NOTES:'],
      [''],
      ['- Purchase Rate, Sale Rate, and MRP should be PER UNIT (per tablet/capsule), not per strip/box'],
      ['- Stock Qty should be in smallest units. Example: 5 strips x 10 tablets/strip = 50 units'],
      ['- If a medicine name already exists, its details will be UPDATED (not duplicated)'],
      ['- If a batch number already exists for that medicine, stock will be ADDED to existing batch'],
      ['- Maximum 2000 medicines can be uploaded in a single file'],
      ['- Drug Schedule values: OTC (no Rx), H (prescription), H1 (strict Rx), X (narcotic)'],
      ['- Only .xlsx and .xls files are accepted (not .csv)'],
    ];

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
    wsInstructions['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    // ─── Sheet 3: Valid Values ───
    const validValues = [
      ['VALID VALUES REFERENCE'],
      [''],
      ['Drug Schedule Options:'],
      ['OTC', 'Over the Counter — No prescription needed'],
      ['H', 'Schedule H — Prescription required'],
      ['H1', 'Schedule H1 — Strict prescription (Narcotics/Psychotropic)'],
      ['X', 'Schedule X — Restricted narcotic'],
      ['G', 'Schedule G — Caution label required'],
      ['K', 'Schedule K — Exempt from certain provisions'],
      ['C / C1', 'Schedule C/C1 — Biological products'],
      ['N', 'Schedule N — Minerals'],
      ['P', 'Schedule P — Vaccines, Sera'],
      [''],
      ['Category Examples:'],
      ['General', 'Antibiotics', 'Gastro', 'Cardiac', 'Diabetic', 'Skin', 'Eye/Ear', 'Pediatric', 'Vitamins', 'Pain Relief', 'Cough & Cold', 'Allergy', 'Mental Health'],
      [''],
      ['Base Unit Options:'],
      ['Tablet', 'Capsule', 'Bottle', 'Tube', 'Sachet', 'Syrup', 'Cream', 'Injection', 'Vial', 'Ampoule', 'Drops', 'Inhaler', 'Patch', 'Suppository', 'Powder'],
      [''],
      ['GST Rate Options:'],
      ['5', '12 (default)', '18'],
      [''],
      ['Allow Loose Sale:'],
      ['Yes (default)', 'No'],
    ];

    const wsValues = XLSX.utils.aoa_to_sheet(validValues);
    wsValues['!cols'] = [{ wch: 25 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsValues, 'Valid Values');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="uPharma_Bulk_Upload_Template.xlsx"',
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
