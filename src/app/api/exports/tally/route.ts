import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ==================== HELPERS ====================

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatTallyDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function amt(value: number): string {
  return value.toFixed(2);
}

// ==================== SALES TALLY XML ====================

async function generateSalesTallyXml(from: Date, to: Date) {
  const sales = await db.sale.findMany({
    where: {
      date: { gte: from, lte: to },
      status: 'Completed',
    },
    include: {
      customer: { select: { name: true } },
      items: {
        select: {
          cgst: true,
          sgst: true,
          gstPercent: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  const vouchers = sales.map((sale) => {
    const customerName = sale.customer?.name || sale.customerName || 'Walk-in Customer';
    const totalCgst = sale.cgst || sale.items.reduce((s, i) => s + i.cgst, 0);
    const totalSgst = sale.sgst || sale.items.reduce((s, i) => s + i.sgst, 0);

    return `
          <VOUCHER VCHTYPE="Sales" ACTION="Create">
            <DATE>${formatTallyDate(sale.date)}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <NARRATION>Sale against Invoice ${escapeXml(sale.invoiceNo)}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(customerName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(-sale.grandTotal)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(sale.subtotal)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(totalCgst)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>SGST</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(totalSgst)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>Upharma Medical Store</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==================== PURCHASES TALLY XML ====================

async function generatePurchasesTallyXml(from: Date, to: Date) {
  const purchases = await db.purchase.findMany({
    where: {
      date: { gte: from, lte: to },
      status: 'Completed',
    },
    include: {
      supplier: { select: { name: true, address: true } },
      items: {
        select: {
          cgst: true,
          sgst: true,
        },
      },
    },
    orderBy: { date: 'asc' },
  });

  const vouchers = purchases.map((purchase) => {
    const supplierName = purchase.supplier?.name || 'Unknown Supplier';
    const totalCgst = purchase.cgst || purchase.items.reduce((s, i) => s + i.cgst, 0);
    const totalSgst = purchase.sgst || purchase.items.reduce((s, i) => s + i.sgst, 0);

    return `
          <VOUCHER VCHTYPE="Purchase" ACTION="Create">
            <DATE>${formatTallyDate(purchase.date)}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <NARRATION>Purchase against Invoice ${escapeXml(purchase.invoiceNo)}</NARRATION>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(supplierName)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(purchase.grandTotal)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Purchase Account</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(-purchase.subtotal)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>CGST Input</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(-totalCgst)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>SGST Input</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${amt(-totalSgst)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>Upharma Medical Store</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          ${vouchers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==================== MASTERS TALLY XML ====================

async function generateMastersTallyXml() {
  const [customers, suppliers] = await Promise.all([
    db.customer.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    db.supplier.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  const customerLedgers = customers.map((c) => `
          <LEDGER NAME="${escapeXml(c.name)}" ACTION="Create">
            <NAME.LIST><NAME>${escapeXml(c.name)}</NAME></NAME.LIST>
            <PARENT>Sundry Debtors</PARENT>
            <LEDGERBALANCE>
              <CLOSINGBALANCE>${amt(-c.balance)}</CLOSINGBALANCE>
            </LEDGERBALANCE>
          </LEDGER>`).join('');

  const supplierLedgers = suppliers.map((s) => `
          <LEDGER NAME="${escapeXml(s.name)}" ACTION="Create">
            <NAME.LIST><NAME>${escapeXml(s.name)}</NAME></NAME.LIST>
            <PARENT>Sundry Creditors</PARENT>
            <LEDGERBALANCE>
              <CLOSINGBALANCE>${amt(s.balance)}</CLOSINGBALANCE>
            </LEDGERBALANCE>
          </LEDGER>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC><REPORTNAME>Masters</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>Upharma Medical Store</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <!-- Customer Ledger Masters -->
          ${customerLedgers}
          <!-- Supplier Ledger Masters -->
          ${supplierLedgers}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ==================== GET HANDLER ====================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'sales';

    let xml: string;
    let filename: string;

    if (type === 'sales') {
      const fromStr = searchParams.get('from');
      const toStr = searchParams.get('to');
      if (!fromStr || !toStr) {
        return NextResponse.json(
          { error: 'Missing required parameters: from and to dates are required for sales export' },
          { status: 400 }
        );
      }
      const from = new Date(fromStr);
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);

      xml = await generateSalesTallyXml(from, to);
      filename = `tally_sales_${fromStr.replace(/-/g, '')}_to_${toStr.replace(/-/g, '')}.xml`;
    } else if (type === 'purchases') {
      const fromStr = searchParams.get('from');
      const toStr = searchParams.get('to');
      if (!fromStr || !toStr) {
        return NextResponse.json(
          { error: 'Missing required parameters: from and to dates are required for purchases export' },
          { status: 400 }
        );
      }
      const from = new Date(fromStr);
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);

      xml = await generatePurchasesTallyXml(from, to);
      filename = `tally_purchases_${fromStr.replace(/-/g, '')}_to_${toStr.replace(/-/g, '')}.xml`;
    } else if (type === 'masters') {
      xml = await generateMastersTallyXml();
      filename = 'tally_ledger_masters.xml';
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Supported types: sales, purchases, masters' },
        { status: 400 }
      );
    }

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Tally export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate Tally export' },
      { status: 500 }
    );
  }
}
