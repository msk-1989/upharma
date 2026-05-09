import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding database...');

  // === USERS ===
  const password = await hash('admin123', 10);
  const users = await Promise.all([
    db.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: { username: 'admin', name: 'Dr. Rajesh Mehta', password, pin: '1234', role: 'Admin', email: 'admin@upharma.com', active: true },
    }),
    db.user.upsert({
      where: { username: 'sneha' },
      update: {},
      create: { username: 'sneha', name: 'Sneha Patil', password, pin: '5678', role: 'Pharmacist', email: 'sneha@upharma.com', active: true },
    }),
    db.user.upsert({
      where: { username: 'amit' },
      update: {},
      create: { username: 'amit', name: 'Amit Joshi', password, pin: '9012', role: 'Cashier', active: true },
    }),
    db.user.upsert({
      where: { username: 'kavita' },
      update: {},
      create: { username: 'kavita', name: 'Kavita Sharma', password, pin: '3456', role: 'Manager', active: true },
    }),
    db.user.upsert({
      where: { username: 'vikram' },
      update: {},
      create: { username: 'vikram', name: 'Vikram Singh', password, pin: '7890', role: 'Cashier', active: false },
    }),
  ]);
  console.log(`✅ Created ${users.length} users`);

  // === SUPPLIERS ===
  const suppliers = await Promise.all([
    db.supplier.create({ data: { name: 'MediCorp India', contactPerson: 'Rahul Verma', phone: '9876543201', email: 'orders@medicorp.in', address: 'Mumbai, Maharashtra', gstNumber: '27AABCM1234R1ZM', drugLicense: 'DL/2024/MH/MUM/111111', balance: 15000 } }),
    db.supplier.create({ data: { name: 'PharmaWholesale Ltd', contactPerson: 'Priya Nair', phone: '9876543202', email: 'sales@pharmawholesale.in', address: 'Delhi, NCR', gstNumber: '07AABCP5678R1ZM', drugLicense: 'DL/2024/DL/DEL/222222', balance: 8500 } }),
    db.supplier.create({ data: { name: 'Sunrise Drug Distributors', contactPerson: 'Anil Kumar', phone: '9876543203', email: 'info@sunrisedrugs.in', address: 'Bangalore, Karnataka', gstNumber: '29AABCS9012R1ZM', balance: 22000 } }),
    db.supplier.create({ data: { name: 'Generic Pharma Traders', contactPerson: 'Meena Devi', phone: '9876543204', email: 'contact@genericpharma.in', address: 'Hyderabad, Telangana', balance: 0 } }),
    db.supplier.create({ data: { name: 'HealthCare Supply Chain', contactPerson: 'Suresh Menon', phone: '9876543205', email: 'supply@healthcarechain.in', address: 'Chennai, Tamil Nadu', gstNumber: '33AABCH3456R1ZM', balance: 5000 } }),
  ]);
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // === CUSTOMERS ===
  const customers = await Promise.all([
    db.customer.create({ data: { name: 'Dr. Anita Deshmukh', phone: '9876543001', address: '12, MG Road, Pune', doctorName: 'Dr. Anita Deshmukh', balance: 2500, totalPurchases: 45000 } }),
    db.customer.create({ data: { name: 'Ramesh Kulkarni', phone: '9876543002', address: '45, Shivaji Nagar, Mumbai', balance: 0, totalPurchases: 12000 } }),
    db.customer.create({ data: { name: 'Sunita Pawar', phone: '9876543003', address: '78, Laxmi Road, Pune', doctorName: 'Dr. Patil', balance: 800, totalPurchases: 28000 } }),
    db.customer.create({ data: { name: 'Ashok Jadhav', phone: '9876543004', address: '23, Aundh, Pune', balance: 1500, totalPurchases: 35000 } }),
    db.customer.create({ data: { name: 'Prakash Shinde', phone: '9876543005', address: '56, Kothrud, Pune', balance: 0, totalPurchases: 8500 } }),
    db.customer.create({ data: { name: 'Meera Joshi', phone: '9876543006', address: '89, Hadapsar, Pune', doctorName: 'Dr. Sharma', balance: 3200, totalPurchases: 52000 } }),
    db.customer.create({ data: { name: 'Sanjay More', phone: '9876543007', address: '34, Baner, Pune', balance: 0, totalPurchases: 6700 } }),
    db.customer.create({ data: { name: 'Walk-in Customer', phone: null, address: null, balance: 0, totalPurchases: 125000 } }),
  ]);
  console.log(`✅ Created ${customers.length} customers`);

  // === MEDICINES ===
  const medicines = [
    { name: 'Dolo 650', genericName: 'Paracetamol', manufacturer: 'Micro Labs', category: 'Analgesic', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001001', baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 10, allowLooseSale: true, purchaseRate: 0.40, saleRate: 0.55, mrp: 0.62, reorderLevel: 150 },
    { name: 'Augmentin 625 Duo', genericName: 'Amoxicillin + Clavulanic Acid', manufacturer: 'GSK', category: 'Antibiotic', hsnCode: '30041099', gstPercent: 12, barcode: '8901234001002', baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 1, allowLooseSale: true, purchaseRate: 18.50, saleRate: 24.00, mrp: 27.50, reorderLevel: 30 },
    { name: 'Pan 40', genericName: 'Pantoprazole', manufacturer: 'Alkem', category: 'Antacid', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001003', baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 10, allowLooseSale: true, purchaseRate: 2.80, saleRate: 4.00, mrp: 4.50, reorderLevel: 100 },
    { name: 'Cetzine 10mg', genericName: 'Cetirizine', manufacturer: 'Dr Reddys', category: 'Antihistamine', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001004', baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, allowLooseSale: true, purchaseRate: 0.90, saleRate: 1.50, mrp: 1.75, reorderLevel: 80 },
    { name: 'Glycomet 500', genericName: 'Metformin', manufacturer: 'USV', category: 'Antidiabetic', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001005', baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, allowLooseSale: true, purchaseRate: 1.20, saleRate: 2.00, mrp: 2.30, reorderLevel: 200 },
    { name: 'Azithral 500', genericName: 'Azithromycin', manufacturer: 'Alembic', category: 'Antibiotic', hsnCode: '30041099', gstPercent: 12, barcode: '8901234001006', baseUnit: 'Tablet', unitsPerStrip: 3, stripsPerBox: 1, allowLooseSale: true, purchaseRate: 22.00, saleRate: 30.00, mrp: 34.50, reorderLevel: 20 },
    { name: 'Ecosprin 75', genericName: 'Aspirin', manufacturer: 'USV', category: 'Cardiac', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001007', baseUnit: 'Tablet', unitsPerStrip: 14, stripsPerBox: 10, allowLooseSale: true, purchaseRate: 0.15, saleRate: 0.25, mrp: 0.30, reorderLevel: 300 },
    { name: 'Shelcal 500', genericName: 'Calcium + Vitamin D3', manufacturer: 'Torrent', category: 'Supplement', hsnCode: '21069099', gstPercent: 5, barcode: '8901234001008', baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 4, allowLooseSale: true, purchaseRate: 3.50, saleRate: 5.00, mrp: 5.80, reorderLevel: 60 },
    { name: 'Volini Spray', genericName: 'Diclofenac Diethylamine', manufacturer: 'Sun Pharma', category: 'Topical', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001009', baseUnit: 'Bottle', unitsPerStrip: 1, stripsPerBox: 1, allowLooseSale: false, purchaseRate: 65.00, saleRate: 90.00, mrp: 102.00, reorderLevel: 10 },
    { name: 'ORS Powder', genericName: 'Oral Rehydration Salts', manufacturer: 'Electral', category: 'Electrolyte', hsnCode: '21069099', gstPercent: 5, barcode: '8901234001010', baseUnit: 'Sachet', unitsPerStrip: 1, stripsPerBox: 30, allowLooseSale: false, purchaseRate: 10.00, saleRate: 15.00, mrp: 18.40, reorderLevel: 50 },
    { name: 'Combiflam', genericName: 'Ibuprofen + Paracetamol', manufacturer: 'Sanofi', category: 'Analgesic', hsnCode: '30049099', gstPercent: 12, barcode: '8901234001011', baseUnit: 'Tablet', unitsPerStrip: 20, stripsPerBox: 5, allowLooseSale: true, purchaseRate: 0.60, saleRate: 0.90, mrp: 1.05, reorderLevel: 200 },
    { name: 'Amoxyclav 625', genericName: 'Amoxicillin + Clavulanic Acid', manufacturer: 'Cipla', category: 'Antibiotic', hsnCode: '30041099', gstPercent: 12, barcode: '8901234001012', baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 1, allowLooseSale: true, purchaseRate: 16.00, saleRate: 21.50, mrp: 24.50, reorderLevel: 25 },
  ];

  const createdMedicines = [];
  for (const m of medicines) {
    const med = await db.medicine.create({ data: m });
    createdMedicines.push(med);
  }
  console.log(`✅ Created ${createdMedicines.length} medicines`);

  // === BATCHES ===
  let batchCount = 0;
  for (let i = 0; i < createdMedicines.length; i++) {
    const med = createdMedicines[i];
    const batchSize = med.unitsPerStrip * med.stripsPerBox * 2; // 2 boxes worth
    const expiryMonths = i < 3 ? 3 : (i < 8 ? 12 : 24); // some near expiry
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

    await db.medicineBatch.create({
      data: {
        medicineId: med.id,
        batchNo: `BATCH-${String(i + 1).padStart(4, '0')}`,
        expiryDate,
        purchaseRate: med.purchaseRate,
        saleRate: med.saleRate,
        mrp: med.mrp,
        stockQty: batchSize,
        initialStock: batchSize,
        supplierId: suppliers[i % suppliers.length].id,
        purchaseDate: new Date(),
        active: true,
      },
    });
    batchCount++;
  }
  console.log(`✅ Created ${batchCount} batches`);

  // === SALES ===
  const saleStatuses = ['Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Completed', 'Processing', 'Pending'];
  const paymentModes = ['Cash', 'Card', 'UPI', 'Cash', 'Cash', 'UPI', 'Cash', 'Credit'];
  let saleTotal = 0;

  for (let i = 0; i < 8; i++) {
    const medIdx = i % createdMedicines.length;
    const med = createdMedicines[medIdx];
    const qty = (i + 1) * 5; // 5,10,15,20,25,30,35,40 tablets
    const subtotal = qty * med.saleRate;
    const cgst = subtotal * (med.gstPercent / 2) / 100;
    const sgst = cgst;
    const grandTotal = subtotal + cgst + sgst;
    saleTotal += grandTotal;

    const sale = await db.sale.create({
      data: {
        invoiceNo: `INV-${String(1043 - i).padStart(5, '0')}`,
        customerId: customers[i % customers.length].id,
        subtotal,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: 0,
        totalGst: Math.round((cgst + sgst) * 100) / 100,
        grandTotal: Math.round(grandTotal * 100) / 100,
        paidAmount: Math.round(grandTotal * 100) / 100,
        balanceDue: 0,
        paymentMode: paymentModes[i],
        userId: users[i % users.length].id,
        status: saleStatuses[i],
      },
    });

    await db.saleItem.create({
      data: {
        saleId: sale.id,
        medicineId: med.id,
        medicineName: med.name,
        quantity: qty,
        unitType: 'tablet',
        saleRate: med.saleRate,
        mrp: med.mrp,
        gstPercent: med.gstPercent,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        igst: 0,
        total: Math.round(grandTotal * 100) / 100,
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Created 8 sample sales (Total: ₹${Math.round(saleTotal)})`);

  // === PURCHASES ===
  for (let i = 0; i < 3; i++) {
    const supplier = suppliers[i];
    const med = createdMedicines[i];
    const boxQty = 5;
    const totalUnits = boxQty * med.stripsPerBox * med.unitsPerStrip;
    const subtotal = totalUnits * med.purchaseRate;
    const cgst = subtotal * (med.gstPercent / 2) / 100;
    const sgst = cgst;

    const purchase = await db.purchase.create({
      data: {
        invoiceNo: `PUR-${String(200 - i).padStart(5, '0')}`,
        supplierId: supplier.id,
        subtotal: Math.round(subtotal * 100) / 100,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        totalGst: Math.round((cgst + sgst) * 100) / 100,
        grandTotal: Math.round((subtotal + cgst + sgst) * 100) / 100,
        paidAmount: Math.round((subtotal + cgst + sgst) * 100) / 100,
        balanceDue: 0,
        userId: users[0].id,
        status: 'Completed',
      },
    });

    await db.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        medicineId: med.id,
        medicineName: med.name,
        quantity: boxQty,
        unitType: 'box',
        purchaseRate: med.purchaseRate,
        gstPercent: med.gstPercent,
        cgst: Math.round(cgst * 100) / 100,
        sgst: Math.round(sgst * 100) / 100,
        total: Math.round(subtotal * 100) / 100,
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ Created 3 sample purchases`);

  // === SETTINGS ===
  const settings = [
    { key: 'store_name', value: 'Upharma Medical Store' },
    { key: 'store_address', value: '123, Main Street, Gandhi Nagar' },
    { key: 'store_phone', value: '9876543210' },
    { key: 'store_email', value: 'info@upharma.com' },
    { key: 'store_pincode', value: '400001' },
    { key: 'store_gst_number', value: '27AABCU9603R1ZM' },
    { key: 'store_drug_license', value: 'DL/2024/MH/MUM/123456' },
    { key: 'invoice_prefix', value: 'INV-' },
    { key: 'invoice_next_number', value: '1051' },
    { key: 'gst_enabled', value: 'true' },
    { key: 'cgst_rate', value: '6' },
    { key: 'sgst_rate', value: '6' },
    { key: 'igst_rate', value: '12' },
    { key: 'paper_size', value: 'A4' },
    { key: 'print_copies', value: '2' },
  ];
  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log(`✅ Created ${settings.length} settings`);

  console.log('\n🎉 Seeding complete!');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
