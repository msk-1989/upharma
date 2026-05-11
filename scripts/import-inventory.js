/**
 * Upharma Inventory Import Script
 * Reads Medical products and data.xlsx and imports into:
 *   1. Supplier table (27 unique suppliers from PARTY NAME)
 *   2. Medicine table (639 unique products)
 *   3. MedicineBatch table (all batches with supplier linking)
 *
 * Excel columns -> Database mapping:
 *   PARTY NAME     -> Supplier.name
 *   HSN NO.        -> Medicine.hsnCode
 *   MFG            -> Medicine.manufacturer
 *   NAME OF PRODUCT-> Medicine.name
 *   PKG            -> Medicine.baseUnit, unitsPerStrip, stripsPerBox
 *   BATCH          -> MedicineBatch.batchNo
 *   EXP            -> MedicineBatch.expiryDate
 *   MRP            -> Medicine.mrp, MedicineBatch.mrp
 *   RATE           -> MedicineBatch.purchaseRate (per strip level)
 *   QTY            -> MedicineBatch.stockQty (converted to smallest units)
 *   GST%           -> Medicine.gstPercent
 *   DATE           -> MedicineBatch.purchaseDate
 *   FREE           -> stored in notes
 *   DISC%          -> stored in notes
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const XLSX = require('xlsx');
const path = require('path');

// ==================== PKG PARSER ====================

function parsePkg(pkg, medicineName) {
  const name = (medicineName || '').toUpperCase();

  let baseUnit = 'Tablet';
  let unitsPerStrip = 10;
  let stripsPerBox = 1;
  let pkgSize = 1;

  if (!pkg || pkg.trim() === '' || pkg === '0') {
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  const p = pkg.trim().toUpperCase().replace(/\s+/g, '');

  // Liquid/external forms - ML based
  if (p.includes('ML') || p.includes('M.L')) {
    baseUnit = 'Bottle';
    const mlMatch = p.match(/(\d+)\s*ML/);
    if (mlMatch) {
      unitsPerStrip = parseInt(mlMatch[1]);
    } else {
      unitsPerStrip = 1;
    }
    stripsPerBox = 1;
    pkgSize = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Gram-based (creams, powders)
  if (/^\d+(\.\d+)?G/.test(p) || p.includes('GM') || p.includes('G.')) {
    baseUnit = 'Tube';
    const gmMatch = p.match(/([\d.]+)\s*(?:GM|G\.?)/);
    if (gmMatch) {
      const gm = parseFloat(gmMatch[1]);
      if (gm >= 50) baseUnit = 'Bottle';
      unitsPerStrip = Math.round(gm) || 1;
    } else {
      unitsPerStrip = 1;
    }
    stripsPerBox = 1;
    pkgSize = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // VIAL / VIA
  if (p.includes('VIAL') || p.includes('VIA')) {
    baseUnit = 'Vial';
    unitsPerStrip = 1;
    stripsPerBox = 1;
    pkgSize = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // PIECE
  if (p.includes('PIECE')) {
    baseUnit = 'Piece';
    unitsPerStrip = 1;
    stripsPerBox = 1;
    pkgSize = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Format: "1*10", "1*12", "10*10", "1X10" etc.
  const starMatch = p.match(/^(\d+)[*X](\d+)/);
  if (starMatch) {
    const a = parseInt(starMatch[1]);
    const b = parseInt(starMatch[2]);
    if (a <= 3) {
      unitsPerStrip = b;
      stripsPerBox = a;
      pkgSize = a;
    } else {
      pkgSize = a;
      unitsPerStrip = b;
      stripsPerBox = 1;
    }
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Format: "6S", "8S", "10S", "100S" -> strips per purchase unit
  const stripMatch = p.match(/^(\d+)S$/);
  if (stripMatch) {
    const num = parseInt(stripMatch[1]);
    pkgSize = num;
    stripsPerBox = num <= 30 ? num : 1;
    unitsPerStrip = 10;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Format: "10 S", "15 S" -> strips
  const stripSpaceMatch = p.match(/^(\d+)S$/);
  if (stripSpaceMatch) {
    const num = parseInt(stripSpaceMatch[1]);
    pkgSize = num;
    stripsPerBox = num <= 30 ? num : 1;
    unitsPerStrip = 10;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Format: "15T", "10TA", "15TAB", "10TAB(1)", "4TAB", "30TAB" -> tablets per strip
  if (/^\d+T/.test(p)) {
    const numMatch = p.match(/^(\d+)/);
    if (numMatch) unitsPerStrip = parseInt(numMatch[1]);
    pkgSize = 1;
    stripsPerBox = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Format: "10CA", "15CA", "15C", "30CAP" -> capsules per strip
  if (/^\d+(CA|C$|CAP)/.test(p)) {
    baseUnit = 'Capsule';
    const numMatch = p.match(/^(\d+)/);
    if (numMatch) unitsPerStrip = parseInt(numMatch[1]);
    pkgSize = 1;
    stripsPerBox = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Format: "10 G", "15 G" -> grams
  if (/^\d+G/.test(p)) {
    const gmMatch = p.match(/^(\d+)/);
    if (gmMatch) {
      const gm = parseInt(gmMatch[1]);
      baseUnit = gm >= 50 ? 'Bottle' : 'Tube';
      unitsPerStrip = gm;
    }
    stripsPerBox = 1;
    pkgSize = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  // Plain number: "10", "15", "30" etc -> units per strip
  const plainMatch = p.match(/^(\d+)$/);
  if (plainMatch) {
    unitsPerStrip = parseInt(plainMatch[1]);
    pkgSize = 1;
    stripsPerBox = 1;
    return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
  }

  return { baseUnit, unitsPerStrip, stripsPerBox, pkgSize };
}

// ==================== BASE UNIT FROM NAME ====================

function inferBaseUnitFromName(medicineName) {
  const name = (medicineName || '').toUpperCase();
  if (name.includes('SYP') || name.includes('SYRUP')) return 'Bottle';
  if (name.includes('SUSP')) return 'Bottle';
  if (name.includes('DROP')) return 'Bottle';
  if (name.includes('LOTION')) return 'Bottle';
  if (name.includes('LINIMENT')) return 'Bottle';
  if (name.includes('CREAM')) return 'Tube';
  if (name.includes('GEL')) return 'Tube';
  if (name.includes('OINT')) return 'Tube';
  if (name.includes('POWDER')) return 'Bottle';
  if (name.includes('KADHA')) return 'Bottle';
  if (name.includes('LIQ')) return 'Bottle';
  if (name.includes('INJ') || name.includes('INJECTION')) return 'Vial';
  if (name.includes('CAP') || name.includes('CAPSULE')) return 'Capsule';
  if (name.includes('TAB') || name.includes('TABLET')) return 'Tablet';
  return 'Tablet';
}

// ==================== MAIN IMPORT ====================

async function main() {
  console.log('=== Upharma Inventory Import ===\n');

  const workbook = XLSX.readFile(path.join(__dirname, '../upload/Medical products and data.xlsx'));
  const sheet = workbook.Sheets['Inventory_Master'];
  const rows = XLSX.utils.sheet_to_json(sheet);
  console.log(`Total rows in Excel: ${rows.length}`);

  // --- Step 0: Clear existing data (medicines, batches) to re-import fresh ---
  console.log('\n--- Clearing existing medicines & batches ---');

  // Delete in correct order due to foreign keys
  await prisma.returnItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.prescriptionItem.deleteMany({});
  await prisma.saleItem.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.payment.deleteMany({});

  const deleteBatches = await prisma.medicineBatch.deleteMany({});
  console.log(`  Deleted ${deleteBatches.count} existing batches`);
  const deleteMedicines = await prisma.medicine.deleteMany({});
  console.log(`  Deleted ${deleteMedicines.count} existing medicines`);
  const deleteSuppliers = await prisma.supplier.deleteMany({});
  console.log(`  Deleted ${deleteSuppliers.count} existing suppliers`);

  // Also clear orphaned sales/purchases
  await prisma.sale.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.return.deleteMany({});
  console.log('  Cleared orphaned sales/purchases/returns');

  // --- Step 1: Create suppliers ---
  console.log('\n--- Creating Suppliers ---');
  const supplierMap = new Map();
  const supplierNames = [...new Set(
    rows.map(r => String(r['PARTY NAME'] || '').trim()).filter(Boolean)
  )];
  console.log(`Unique suppliers: ${supplierNames.length}`);

  for (const name of supplierNames) {
    const safeId = 'sup_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
    const supplier = await prisma.supplier.create({
      data: {
        id: safeId,
        name: name,
        active: true,
      },
    });
    supplierMap.set(name, supplier.id);
    console.log(`  [OK] ${name} -> ${supplier.id}`);
  }

  // --- Step 2: Import medicines and batches ---
  console.log('\n--- Importing Medicines & Batches ---');

  const medicineMap = new Map();
  let medicineCount = 0;
  let batchCount = 0;
  let naBatchCounter = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    const productName = String(row['NAME OF PRODUCT'] || '').trim();
    if (!productName) continue;

    const partyName = String(row['PARTY NAME'] || '').trim();
    const hsnCode = String(row['HSN NO.'] || '').trim();
    const mfg = String(row['MFG'] || '').trim();
    const pkg = String(row['PKG'] || '').trim();
    const batchNoRaw = String(row['BATCH'] || '').trim();
    const exp = row['EXP'];
    const mrp = parseFloat(row['MRP']) || 0;
    const qty = parseInt(row['QTY']) || 0;
    const free = parseInt(row['FREE']) || 0;
    const rate = parseFloat(row['RATE']) || 0;
    const amount = parseFloat(row['AMOUNT']) || 0;
    const discPct = parseFloat(row['DISC%']) || 0;
    const gstPct = parseFloat(row['GST%']) || 12;
    const date = row['DATE'];

    const supplierId = supplierMap.get(partyName) || null;

    // Parse packaging
    const parsedPkg = parsePkg(pkg, productName);
    const nameBaseUnit = inferBaseUnitFromName(productName);
    // Use name-inferred base unit for non-tablet forms
    if (nameBaseUnit !== 'Tablet') {
      parsedPkg.baseUnit = nameBaseUnit;
    }

    const ups = parsedPkg.unitsPerStrip || 1;
    const pkgUnits = parsedPkg.pkgSize || 1;
    const totalUnitsPerPkg = ups * pkgUnits;

    // Create or get medicine (deduplicate by name)
    let medicine;
    if (medicineMap.has(productName)) {
      medicine = medicineMap.get(productName);
    } else {
      // Per-unit rate: RATE is per strip/pack, MRP is per strip/pack
      const perUnitMRP = totalUnitsPerPkg > 0 ? Math.round((mrp / totalUnitsPerPkg) * 1000) / 1000 : mrp;
      const perUnitPurchaseRate = totalUnitsPerPkg > 0 ? Math.round((rate / totalUnitsPerPkg) * 1000) / 1000 : rate;

      medicine = await prisma.medicine.create({
        data: {
          name: productName,
          manufacturer: mfg || null,
          category: 'General',
          drugSchedule: 'OTC',
          hsnCode: hsnCode || null,
          gstPercent: gstPct,
          baseUnit: parsedPkg.baseUnit,
          unitsPerStrip: parsedPkg.unitsPerStrip,
          stripsPerBox: parsedPkg.stripsPerBox,
          allowLooseSale: true,
          purchaseRate: perUnitPurchaseRate,
          saleRate: perUnitMRP,
          mrp: perUnitMRP,
          reorderLevel: 20,
          active: true,
        },
      });
      medicineMap.set(productName, medicine);
      medicineCount++;

      if (medicineCount % 100 === 0) {
        console.log(`  ...created ${medicineCount} medicines`);
      }
    }

    // Generate batch number for N/A
    let batchNo = batchNoRaw;
    if (batchNo === 'N/A' || !batchNo) {
      naBatchCounter++;
      batchNo = `NA-${String(naBatchCounter).padStart(4, '0')}`;
    }

    // Parse expiry date
    let expiryDate = null;
    if (exp) {
      try {
        if (typeof exp === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          expiryDate = new Date(excelEpoch.getTime() + exp * 86400000);
        } else {
          const d = new Date(exp);
          if (!isNaN(d.getTime())) expiryDate = d;
        }
      } catch (e) {
        // skip
      }
    }

    // Parse purchase date
    let purchaseDate = null;
    if (date) {
      try {
        if (typeof date === 'number') {
          const excelEpoch = new Date(1899, 11, 30);
          purchaseDate = new Date(excelEpoch.getTime() + date * 86400000);
        } else {
          const d = new Date(date);
          if (!isNaN(d.getTime())) purchaseDate = d;
        }
      } catch (e) {
        // skip
      }
    }

    // Calculate stock in smallest units
    const totalStock = qty * totalUnitsPerPkg;

    // Per-unit rates for batch
    const perUnitMRP = totalUnitsPerPkg > 0 ? Math.round((mrp / totalUnitsPerPkg) * 1000) / 1000 : mrp;
    const perUnitPurchaseRate = totalUnitsPerPkg > 0 ? Math.round((rate / totalUnitsPerPkg) * 1000) / 1000 : rate;

    try {
      await prisma.medicineBatch.create({
        data: {
          medicineId: medicine.id,
          batchNo: batchNo,
          expiryDate: expiryDate,
          purchaseRate: perUnitPurchaseRate,
          saleRate: perUnitMRP,
          mrp: perUnitMRP,
          stockQty: totalStock,
          initialStock: totalStock,
          supplierId: supplierId,
          purchaseDate: purchaseDate,
          active: true,
        },
      });
      batchCount++;
    } catch (err) {
      errors.push(`Row ${i + 2}: ${err.message?.substring(0, 80)}`);
    }

    if (batchCount % 100 === 0) {
      console.log(`  ...created ${batchCount} batches (row ${i + 1}/${rows.length})`);
    }
  }

  // --- Step 3: Summary ---
  console.log('\n=== Import Summary ===');
  console.log(`Total Excel rows processed: ${rows.length}`);
  console.log(`New medicines created: ${medicineCount}`);
  console.log(`New batches created: ${batchCount}`);
  console.log(`N/A batches (auto-numbered): ${naBatchCounter}`);
  console.log(`Suppliers created: ${supplierMap.size}`);
  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    errors.slice(0, 10).forEach(e => console.log(`  ${e}`));
  }

  // --- Step 4: Verify ---
  const totalMedicines = await prisma.medicine.count();
  const totalBatches = await prisma.medicineBatch.count();
  const totalSuppliers = await prisma.supplier.count();
  const totalStock = await prisma.medicineBatch.aggregate({ _sum: { stockQty: true } });
  const linkedBatches = await prisma.medicineBatch.count({ where: { supplierId: { not: null } } });

  console.log('\n=== Database Verification ===');
  console.log(`Total Medicines: ${totalMedicines}`);
  console.log(`Total Batches: ${totalBatches}`);
  console.log(`Total Suppliers: ${totalSuppliers}`);
  console.log(`Batches with supplier linked: ${linkedBatches}`);
  console.log(`Batches without supplier: ${totalBatches - linkedBatches}`);
  console.log(`Total stock (smallest units): ${totalStock._sum.stockQty || 0}`);

  // GST distribution
  const gstGroups = await prisma.medicine.groupBy({
    by: ['gstPercent'],
    _count: { id: true },
    orderBy: { gstPercent: 'asc' },
  });
  console.log(`\nGST Distribution:`);
  for (const g of gstGroups) {
    console.log(`  ${g.gstPercent}%: ${g._count.id} medicines`);
  }

  // Base unit distribution
  const unitGroups = await prisma.medicine.groupBy({
    by: ['baseUnit'],
    _count: { id: true },
  });
  console.log(`\nBase Unit Distribution:`);
  for (const u of unitGroups) {
    console.log(`  ${u.baseUnit}: ${u._count.id} medicines`);
  }

  // Sample medicines
  console.log('\n=== Sample Medicines ===');
  const samples = await prisma.medicine.findMany({
    take: 5,
    include: {
      batches: { take: 1, include: { supplier: { select: { name: true } } } },
    },
  });
  for (const med of samples) {
    const b = med.batches[0];
    console.log(`  ${med.name} | ${med.manufacturer} | GST ${med.gstPercent}% | ${med.baseUnit} | MRP ${med.mrp} | Stock ${b?.stockQty || 0} | Supplier ${b?.supplier?.name || 'N/A'}`);
  }

  console.log('\n=== Import Complete ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
