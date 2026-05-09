/**
 * Medicine Import Script
 * Reads 'upload/Medical products and data.xlsx' and inserts into Upharma database
 */

const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

// ==================== PKG PARSER ====================

function parsePkg(pkgStr) {
  if (!pkgStr) return { unitsPerStrip: 10, baseUnit: 'Tablet' };
  
  const pkg = String(pkgStr).trim().toUpperCase();
  
  // Pattern: X*Y (e.g., "1*10" = 10 per strip)
  let m = pkg.match(/^(\d+)\*(\d+)$/);
  if (m) return { unitsPerStrip: parseInt(m[2]), baseUnit: 'Tablet' };
  
  // Pattern: X*S or XS (e.g., "10 S", "6S" = strips)
  m = pkg.match(/^(\d+)\s*S/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  m = pkg.match(/^(\d+)S$/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  
  // Pattern: X*T, XTAB, XTA, X TAB, X TA (e.g., "15TAB", "10 T" = tablets)
  m = pkg.match(/^(\d+)\s*T(?:AB|A)?/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  m = pkg.match(/^(\d+)\s*T(?:AB)?\(?1\)?$/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  
  // Pattern: X*C (e.g., "15C" = capsules)
  m = pkg.match(/^(\d+)\s*C(?!A)/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Capsule' };
  
  // Pattern: X*M, XML (e.g., "100M", "10 ML", "100ML" = ml liquid)
  m = pkg.match(/^(\d+)\.?\d*\s*ML/);
  if (m) return { unitsPerStrip: parseInt(parseFloat(m[1])), baseUnit: 'Bottle' };
  m = pkg.match(/^(\d+)\s*M(?!E|L)/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Bottle' };
  m = pkg.match(/^(\d+)\*(\d+)ML$/);
  if (m) return { unitsPerStrip: parseInt(m[2]), baseUnit: 'Bottle' };
  m = pkg.match(/^(\d+)\*\d+M$/);
  if (m) return { unitsPerStrip: 10, baseUnit: 'Bottle' };
  
  // Pattern: XG, X GM, XGMS (e.g., "15GM", "30G" = grams)
  m = pkg.match(/^(\d+\.?\d*)\s*G(?:M|MS)?$/);
  if (m) return { unitsPerStrip: Math.round(parseFloat(m[1])), baseUnit: 'Tube' };
  
  // VIA, VIAL
  if (pkg.includes('VIA') || pkg.includes('VIAL')) return { unitsPerStrip: 1, baseUnit: 'Vial' };
  // PIECE
  if (pkg.includes('PIECE')) return { unitsPerStrip: 1, baseUnit: 'Tablet' };
  // MEU
  if (pkg.includes('MEU')) return { unitsPerStrip: 1, baseUnit: 'Tablet' };
  // VAIL
  if (pkg.includes('VAIL')) return { unitsPerStrip: 1, baseUnit: 'Sachet' };
  
  // 1X10, 1X15 (same as X*Y)
  m = pkg.match(/^1[X*](\d+)$/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  
  // 10* (trailing star)
  m = pkg.match(/^(\d+)\*$/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  
  // Just a number
  m = pkg.match(/^(\d+)$/);
  if (m) return { unitsPerStrip: parseInt(m[1]), baseUnit: 'Tablet' };
  
  return { unitsPerStrip: 10, baseUnit: 'Tablet' };
}

// ==================== CATEGORY ====================

function determineCategory(name, baseUnit) {
  const n = name.toUpperCase();
  if (baseUnit === 'Bottle' || baseUnit === 'Vial') return 'Liquid';
  if (baseUnit === 'Tube') return 'Topical';
  if (baseUnit === 'Sachet') return 'Sachet';
  if (n.includes('SYRUP') || n.includes('SUSP') || n.includes('DROPS')) return 'Liquid';
  if (n.includes('CREAM') || n.includes('OINT') || n.includes('LOTION') || n.includes('SOAP')) return 'Topical';
  if (n.includes('INJECTION') || n.includes('INJ ') || n.includes(' IV')) return 'Injectable';
  return 'General';
}

// ==================== MAIN ====================

async function main() {
  console.log('Starting medicine import...\n');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('./upload/Medical products and data.xlsx');
  const ws = workbook.getWorksheet('Inventory_Master');
  
  if (!ws) {
    console.error('Sheet "Inventory_Master" not found!');
    process.exit(1);
  }
  
  console.log(`Total rows in sheet: ${ws.rowCount - 1}`);
  
  const existingCount = await prisma.medicine.count();
  console.log(`Existing medicines in DB: ${existingCount}\n`);
  
  // Parse all rows
  const medicineMap = new Map();
  let skipped = 0;
  let totalRows = 0;
  
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    totalRows++;
    
    const manufacturer = row.getCell(5).value;
    const name = row.getCell(6).value;
    const pkg = row.getCell(7).value;
    const batchNo = row.getCell(8).value;
    const expDate = row.getCell(9).value;
    const mrp = row.getCell(10).value;
    const qty = row.getCell(11).value;
    const free = row.getCell(12).value;
    const rate = row.getCell(13).value;
    const hsnCode = row.getCell(4).value;
    const gstPct = row.getCell(15).value;
    const date = row.getCell(2).value;
    
    if (!name || String(name).trim() === '') {
      skipped++;
      return;
    }
    
    const nameStr = String(name).trim();
    const nameUpper = nameStr.toUpperCase();
    const { unitsPerStrip, baseUnit } = parsePkg(pkg);
    
    const qtyNum = Number(qty) || 0;
    const freeNum = Number(free) || 0;
    const totalStrips = qtyNum + freeNum;
    const stockQty = totalStrips * unitsPerStrip;
    
    const mrpNum = Number(mrp) || 0;
    const rateNum = Number(rate) || 0;
    
    const purchaseRatePerUnit = unitsPerStrip > 0
      ? Math.round((rateNum / unitsPerStrip) * 100) / 100
      : rateNum;
    const mrpPerUnit = unitsPerStrip > 0
      ? Math.round((mrpNum / unitsPerStrip) * 100) / 100
      : mrpNum;
    const saleRatePerUnit = purchaseRatePerUnit;
    
    const batchStr = (batchNo && String(batchNo).trim().toUpperCase() !== 'N/A')
      ? String(batchNo).trim()
      : null;
    
    let expiryDate = null;
    if (expDate) {
      try {
        const d = new Date(expDate);
        if (!isNaN(d.getTime())) expiryDate = d;
      } catch {}
    }
    
    let purchaseDate = null;
    if (date) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) purchaseDate = d;
      } catch {}
    }
    
    const gstPercent = Number(gstPct) || 12;
    const category = determineCategory(nameStr, baseUnit);
    
    if (!medicineMap.has(nameUpper)) {
      medicineMap.set(nameUpper, {
        data: {
          name: nameStr,
          genericName: '',
          manufacturer: manufacturer ? String(manufacturer).trim() : '',
          category,
          drugSchedule: 'OTC',
          hsnCode: hsnCode ? String(hsnCode).trim() : '',
          gstPercent,
          barcode: null,
          alternateBarcodes: null,
          baseUnit,
          unitsPerStrip,
          stripsPerBox: 10,
          allowLooseSale: true,
          purchaseRate: purchaseRatePerUnit,
          saleRate: saleRatePerUnit,
          mrp: mrpPerUnit,
          reorderLevel: 20,
          active: true,
        },
        batches: [],
      });
    } else {
      const existing = medicineMap.get(nameUpper);
      if (!existing.data.manufacturer && manufacturer) {
        existing.data.manufacturer = String(manufacturer).trim();
      }
      if (!existing.data.hsnCode && hsnCode) {
        existing.data.hsnCode = String(hsnCode).trim();
      }
    }
    
    medicineMap.get(nameUpper).batches.push({
      batchNo: batchStr,
      expiryDate,
      purchaseRate: purchaseRatePerUnit,
      saleRate: saleRatePerUnit,
      mrp: mrpPerUnit,
      stockQty,
      initialStock: stockQty,
      purchaseDate,
      active: true,
    });
  });
  
  console.log(`Parsed ${totalRows} rows, skipped ${skipped}`);
  console.log(`Unique medicines: ${medicineMap.size}`);
  
  let totalBatches = 0;
  for (const [, med] of medicineMap) totalBatches += med.batches.length;
  console.log(`Total batches: ${totalBatches}\n`);
  
  // Import
  console.log('Importing into database...');
  let created = 0;
  let updated = 0;
  let batchesCreated = 0;
  let errors = 0;
  
  for (const [nameUpper, med] of medicineMap) {
    try {
      const existing = await prisma.medicine.findFirst({
        where: { name: { equals: med.data.name } },
      });
      
      let medicineId;
      
      if (existing) {
        medicineId = existing.id;
        await prisma.medicine.update({
          where: { id: existing.id },
          data: {
            manufacturer: existing.manufacturer || med.data.manufacturer,
            hsnCode: existing.hsnCode || med.data.hsnCode,
            gstPercent: med.data.gstPercent,
            baseUnit: med.data.baseUnit,
            unitsPerStrip: med.data.unitsPerStrip,
            purchaseRate: med.data.purchaseRate,
            saleRate: med.data.saleRate,
            mrp: med.data.mrp,
            category: existing.category || med.data.category,
            active: true,
          },
        });
        updated++;
      } else {
        const newMed = await prisma.medicine.create({ data: med.data });
        medicineId = newMed.id;
        created++;
      }
      
      // Create batches
      for (const batch of med.batches) {
        if (!batch.batchNo) continue;
        
        const existingBatch = await prisma.medicineBatch.findFirst({
          where: { medicineId, batchNo: batch.batchNo },
        });
        
        if (!existingBatch) {
          await prisma.medicineBatch.create({
            data: {
              medicineId,
              batchNo: batch.batchNo,
              expiryDate: batch.expiryDate,
              purchaseRate: batch.purchaseRate,
              saleRate: batch.saleRate,
              mrp: batch.mrp,
              stockQty: batch.stockQty,
              initialStock: batch.initialStock,
              purchaseDate: batch.purchaseDate,
              active: true,
            },
          });
          batchesCreated++;
        } else if (batch.stockQty > existingBatch.stockQty) {
          await prisma.medicineBatch.update({
            where: { id: existingBatch.id },
            data: {
              stockQty: batch.stockQty,
              purchaseRate: batch.purchaseRate,
              saleRate: batch.saleRate,
              mrp: batch.mrp,
              expiryDate: batch.expiryDate || existingBatch.expiryDate,
              active: true,
            },
          });
          batchesCreated++;
        }
      }
      
      // Create DEFAULT batch for medicines with no valid batch numbers
      const validBatches = med.batches.filter(b => b.batchNo);
      if (validBatches.length === 0) {
        const totalStock = med.batches.reduce((sum, b) => sum + b.stockQty, 0);
        if (totalStock > 0) {
          const existingDefault = await prisma.medicineBatch.findFirst({
            where: { medicineId, batchNo: 'DEFAULT' },
          });
          if (!existingDefault) {
            await prisma.medicineBatch.create({
              data: {
                medicineId,
                batchNo: 'DEFAULT',
                purchaseRate: med.data.purchaseRate,
                saleRate: med.data.saleRate,
                mrp: med.data.mrp,
                stockQty: totalStock,
                initialStock: totalStock,
                active: true,
              },
            });
            batchesCreated++;
          }
        }
      }
      
      // Progress every 50
      if ((created + updated) % 50 === 0) {
        process.stdout.write(`  Processed ${created + updated}/${medicineMap.size}...\r`);
      }
      
    } catch (err) {
      errors++;
      console.error(`Error importing "${med.data.name}": ${err.message}`);
    }
  }
  
  console.log('\n\n========== IMPORT COMPLETE ==========');
  console.log(`Medicines created: ${created}`);
  console.log(`Medicines updated: ${updated}`);
  console.log(`Batches created/updated: ${batchesCreated}`);
  console.log(`Errors: ${errors}`);
  
  const finalCount = await prisma.medicine.count();
  const finalBatches = await prisma.medicineBatch.count();
  console.log(`\nFinal DB state:`);
  console.log(`  Total medicines: ${finalCount}`);
  console.log(`  Total batches: ${finalBatches}`);
  
  await prisma.$disconnect();
  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
