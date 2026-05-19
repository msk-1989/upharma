import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

// ─── Realistic Indian Pharmacy Data ────────────────────────────────────────────

const medicines = [
  { name: 'Dolo 650mg Tab', genericName: 'Paracetamol', manufacturer: 'Micro Labs Ltd', category: 'Analgesic', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 10, saleRate: 1.85, mrp: 2.00, purchaseRate: 1.20, reorderLevel: 200 },
  { name: 'Augmentin 625 Duo Tab', genericName: 'Amoxycillin + Clavulanic Acid', manufacturer: 'GlaxoSmithKline', category: 'Antibiotic', drugSchedule: 'H', hsnCode: '30041099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 1, saleRate: 23.50, mrp: 25.72, purchaseRate: 18.00, reorderLevel: 50 },
  { name: 'Pan 40mg Tab', genericName: 'Pantoprazole', manufacturer: 'Alkem Labs', category: 'Antacid', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 10, saleRate: 4.50, mrp: 5.10, purchaseRate: 3.20, reorderLevel: 150 },
  { name: 'Azithral 500mg Tab', genericName: 'Azithromycin', manufacturer: 'Alembic Pharma', category: 'Antibiotic', drugSchedule: 'H', hsnCode: '30041099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 3, stripsPerBox: 10, saleRate: 32.00, mrp: 35.50, purchaseRate: 24.00, reorderLevel: 60 },
  { name: 'Cetzine 10mg Tab', genericName: 'Cetirizine', manufacturer: 'Dr Reddys', category: 'Antihistamine', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, saleRate: 1.20, mrp: 1.50, purchaseRate: 0.65, reorderLevel: 100 },
  { name: 'Metformin 500mg Tab', genericName: 'Metformin', manufacturer: 'USV Pvt Ltd', category: 'Antidiabetic', drugSchedule: 'H', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 20, stripsPerBox: 10, saleRate: 2.80, mrp: 3.50, purchaseRate: 1.50, reorderLevel: 200 },
  { name: 'Amlip 5mg Tab', genericName: 'Amlodipine', manufacturer: 'Cipla Ltd', category: 'Antihypertensive', drugSchedule: 'H', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 14, stripsPerBox: 10, saleRate: 3.50, mrp: 4.00, purchaseRate: 2.20, reorderLevel: 100 },
  { name: 'Shelcal 500mg Tab', genericName: 'Calcium + Vitamin D3', manufacturer: 'Torrent Pharma', category: 'Supplement', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 10, saleRate: 10.50, mrp: 11.80, purchaseRate: 7.50, reorderLevel: 80 },
  { name: 'Limcee 500mg Tab', genericName: 'Vitamin C', manufacturer: 'Abbott', category: 'Vitamin', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 100, saleRate: 0.80, mrp: 1.00, purchaseRate: 0.40, reorderLevel: 300 },
  { name: 'Combiflam Tab', genericName: 'Ibuprofen + Paracetamol', manufacturer: 'Sanofi India', category: 'Analgesic', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 20, stripsPerBox: 10, saleRate: 1.60, mrp: 1.85, purchaseRate: 1.00, reorderLevel: 200 },
  { name: 'Allegra 120mg Tab', genericName: 'Fexofenadine', manufacturer: 'Sanofi India', category: 'Antihistamine', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, saleRate: 8.50, mrp: 9.90, purchaseRate: 6.00, reorderLevel: 80 },
  { name: 'Volini Spray 60g', genericName: 'Diclofenac Diethylamine', manufacturer: 'Sun Pharma', category: 'Topical', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tube', unitsPerStrip: 1, stripsPerBox: 24, saleRate: 115.00, mrp: 125.00, purchaseRate: 85.00, reorderLevel: 30 },
  { name: 'ORS Electral Powder', genericName: 'Oral Rehydration Salts', manufacturer: 'FDC Ltd', category: 'Electrolyte', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 5, baseUnit: 'Sachet', unitsPerStrip: 1, stripsPerBox: 30, saleRate: 2.50, mrp: 3.00, purchaseRate: 1.50, reorderLevel: 100 },
  { name: 'Crocin Advance 500mg', genericName: 'Paracetamol', manufacturer: 'GSK Consumer', category: 'Analgesic', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 15, stripsPerBox: 10, saleRate: 1.50, mrp: 1.80, purchaseRate: 0.90, reorderLevel: 250 },
  { name: 'Becosules Capsule', genericName: 'Vitamin B Complex', manufacturer: 'Pfizer Ltd', category: 'Vitamin', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Capsule', unitsPerStrip: 20, stripsPerBox: 10, saleRate: 5.80, mrp: 6.50, purchaseRate: 4.00, reorderLevel: 100 },
  { name: 'Glycomet GP 2 Tab', genericName: 'Metformin + Glimepiride', manufacturer: 'USV Pvt Ltd', category: 'Antidiabetic', drugSchedule: 'H', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, saleRate: 12.50, mrp: 14.00, purchaseRate: 8.50, reorderLevel: 80 },
  { name: 'Telmisartan 40mg Tab', genericName: 'Telmisartan', manufacturer: 'Intas Pharma', category: 'Antihypertensive', drugSchedule: 'H', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, saleRate: 5.20, mrp: 6.00, purchaseRate: 3.50, reorderLevel: 100 },
  { name: 'Amoxyclav 625 Tab', genericName: 'Amoxycillin + Clavulanic Acid', manufacturer: 'Cipla Ltd', category: 'Antibiotic', drugSchedule: 'H', hsnCode: '30041099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 1, saleRate: 18.50, mrp: 20.50, purchaseRate: 14.00, reorderLevel: 50 },
  { name: 'Montek LC Tab', genericName: 'Montelukast + Levocetirizine', manufacturer: 'Sun Pharma', category: 'Respiratory', drugSchedule: 'H', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 10, saleRate: 7.50, mrp: 8.50, purchaseRate: 5.00, reorderLevel: 80 },
  { name: 'Digene Gel 200ml', genericName: 'Dried Aluminium Hydroxide', manufacturer: 'Abbott', category: 'Antacid', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Bottle', unitsPerStrip: 1, stripsPerBox: 12, saleRate: 52.00, mrp: 58.00, purchaseRate: 38.00, reorderLevel: 25 },
  { name: 'Betadine Ointment 15g', genericName: 'Povidone Iodine', manufacturer: 'Win Medicare', category: 'Antiseptic', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tube', unitsPerStrip: 1, stripsPerBox: 24, saleRate: 38.00, mrp: 42.00, purchaseRate: 28.00, reorderLevel: 30 },
  { name: 'Vicks Action 500 Tab', genericName: 'Paracetamol + Phenylephrine + Caffeine', manufacturer: 'P&G Health', category: 'Cold & Cough', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 4, stripsPerBox: 30, saleRate: 4.80, mrp: 5.50, purchaseRate: 3.20, reorderLevel: 100 },
  { name: 'Omez 20mg Capsule', genericName: 'Omeprazole', manufacturer: 'Dr Reddys', category: 'Antacid', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Capsule', unitsPerStrip: 15, stripsPerBox: 10, saleRate: 3.80, mrp: 4.50, purchaseRate: 2.50, reorderLevel: 150 },
  { name: 'Clavam 625 Tab', genericName: 'Amoxycillin + Clavulanic Acid', manufacturer: 'Alkem Labs', category: 'Antibiotic', drugSchedule: 'H', hsnCode: '30041099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 10, stripsPerBox: 1, saleRate: 20.00, mrp: 22.50, purchaseRate: 15.00, reorderLevel: 50 },
  { name: 'Ecosprin 75mg Tab', genericName: 'Aspirin', manufacturer: 'USV Pvt Ltd', category: 'Cardiac', drugSchedule: 'H', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Tablet', unitsPerStrip: 14, stripsPerBox: 10, saleRate: 1.00, mrp: 1.20, purchaseRate: 0.50, reorderLevel: 200 },
  { name: 'Shampoo Clinic Plus 175ml', genericName: 'Ketoconazole', manufacturer: 'Reckitt', category: 'Dermatology', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Bottle', unitsPerStrip: 1, stripsPerBox: 24, saleRate: 95.00, mrp: 105.00, purchaseRate: 70.00, reorderLevel: 20 },
  { name: 'Dabur Honitus Syrup 100ml', genericName: 'Honey + Tulsi', manufacturer: 'Dabur India', category: 'Cough Syrup', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Bottle', unitsPerStrip: 1, stripsPerBox: 24, saleRate: 48.00, mrp: 55.00, purchaseRate: 35.00, reorderLevel: 25 },
  { name: 'Polybion LC Syrup 200ml', genericName: 'Vitamin B Complex + Lysine', manufacturer: 'Merck Ltd', category: 'Vitamin', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Bottle', unitsPerStrip: 1, stripsPerBox: 12, saleRate: 68.00, mrp: 75.00, purchaseRate: 50.00, reorderLevel: 20 },
  { name: 'Syrup Gelusil MPS 170ml', genericName: 'Magaldrate + Simethicone', manufacturer: 'Pfizer Ltd', category: 'Antacid', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Bottle', unitsPerStrip: 1, stripsPerBox: 12, saleRate: 55.00, mrp: 62.00, purchaseRate: 40.00, reorderLevel: 20 },
  { name: 'Strepsils Lozenges Honey', genericName: 'Amylmetacresol + Dichlorobenzyl Alcohol', manufacturer: 'Reckitt', category: 'Throat Lozenge', drugSchedule: 'OTC', hsnCode: '30049099', gstPercent: 12, baseUnit: 'Strip', unitsPerStrip: 8, stripsPerBox: 30, saleRate: 12.00, mrp: 14.00, purchaseRate: 8.50, reorderLevel: 50 },
];

const suppliers = [
  { name: 'MediCorp Distributors', contactPerson: 'Rajesh Kumar', phone: '9876543210', email: 'rajesh@medicorp.in', address: 'Plot 45, Sector 12, Industrial Area, Chandigarh 160012', gstNumber: '04AABCM1234A1ZK', drugLicense: 'CH-PH-2024-0045' },
  { name: 'PharmaWholesale India', contactPerson: 'Amit Sharma', phone: '9898123456', email: 'amit@pharmawholesale.in', address: 'Warehouse No. 7, Kandla SEZ, Gandhidham, Gujarat 370201', gstNumber: '24AABCP5678B2ZL', drugLicense: 'GJ-PH-2024-0112' },
  { name: 'HealthLine Supply Chain', contactPerson: 'Priya Patel', phone: '9723456789', email: 'priya@healthline.co.in', address: '203, Trade Tower, Ashram Road, Ahmedabad, Gujarat 380009', gstNumber: '24AABCH9012C3ZM', drugLicense: 'GJ-PH-2024-0089' },
  { name: 'Swastik Medical Agency', contactPerson: 'Vikram Singh', phone: '9812345678', email: 'vikram@swastikmed.in', address: '15, Nehru Place, Near District Court, Lucknow, UP 226001', gstNumber: '09AABCS3456D4ZN', drugLicense: 'UP-PH-2024-0234' },
  { name: 'Apollo Pharmacy Distributors', contactPerson: 'Suresh Reddy', phone: '9845678901', email: 'suresh@apollodist.in', address: 'Block B, Jubilee Hills, Hyderabad, Telangana 500033', gstNumber: '36AABCA7890E5ZP', drugLicense: 'TS-PH-2024-0156' },
  { name: 'Zeenat Medical Stores', contactPerson: 'Mohammed Iqbal', phone: '9765432109', email: 'iqbal@zeenatmed.in', address: 'MG Road, Crawford Market, Mumbai, Maharashtra 400001', gstNumber: '27AABCZ1234F6ZQ', drugLicense: 'MH-PH-2024-0067' },
  { name: 'GoodHealth Pharma', contactPerson: 'Deepak Joshi', phone: '9834567890', email: 'deepak@goodhealth.in', address: '45, Industrial Estate, Baddi, Himachal Pradesh 173205', gstNumber: '02AABCG5678G7ZR', drugLicense: 'HP-PH-2024-0321' },
  { name: 'Reliance Medi-Supply', contactPerson: 'Anand Gupta', phone: '9987654321', email: 'anand@reliancemedi.in', address: '12, DLF Industrial Area, Phase II, Gurgaon, Haryana 122002', gstNumber: '06AABCR9012H8ZS', drugLicense: 'HR-PH-2024-0078' },
];

const customers = [
  { name: 'Ramesh Agarwal', phone: '9810234567', address: '23, Rajendra Nagar, Jaipur, Rajasthan 302004', doctorName: 'Dr. Suresh Gupta' },
  { name: 'Sunita Devi', phone: '9821345678', address: '56, Shanti Path, Civil Lines, Delhi 110054', doctorName: 'Dr. Anita Sharma' },
  { name: 'Mohammed Farooq', phone: '9832456789', address: '12, T Nagar, Chennai, Tamil Nadu 600017', doctorName: 'Dr. K. Rajan' },
  { name: 'Priyanka Mehta', phone: '9843567890', address: '78, Banjara Hills, Hyderabad, Telangana 500034', doctorName: 'Dr. Reddy' },
  { name: 'Ashok Kumar', phone: '9854678901', address: '34, MG Road, Pune, Maharashtra 411001', doctorName: 'Dr. Patil' },
  { name: 'Lakshmi Iyer', phone: '9865789012', address: '90, Anna Nagar, Chennai, Tamil Nadu 600040', doctorName: 'Dr. Krishnan' },
  { name: 'Deepak Verma', phone: '9876890123', address: '45, Arera Colony, Bhopal, MP 462011', doctorName: 'Dr. Verma' },
  { name: 'Rekha Singh', phone: '9887901234', address: '67, Hazratganj, Lucknow, UP 226001', doctorName: 'Dr. Mishra' },
  { name: 'Sanjay Patel', phone: '9898012345', address: '89, Satellite Road, Ahmedabad, Gujarat 380015', doctorName: 'Dr. Shah' },
  { name: 'Kavita Nair', phone: '9709123456', address: '23, Koregaon Park, Pune, Maharashtra 411001', doctorName: 'Dr. Deshmukh' },
  { name: 'Rahul Sharma', phone: '9710234567', address: '12, Sector 15, Chandigarh 160015', doctorName: '' },
  { name: 'Geeta Devi', phone: '9721345678', address: '56, Lal Darwaza, Jaipur, Rajasthan 302006', doctorName: 'Dr. Jain' },
  { name: 'Venkat Rao', phone: '9732456789', address: '34, Begumpet, Hyderabad, Telangana 500016', doctorName: 'Dr. Rao' },
  { name: 'Anjali Mishra', phone: '9743567890', address: '78, Gomti Nagar, Lucknow, UP 226010', doctorName: '' },
  { name: 'Suresh Menon', phone: '9754678901', address: '90, Edappally, Kochi, Kerala 682024', doctorName: 'Dr. Menon' },
];

const doctors = [
  { name: 'Dr. Suresh Gupta', qualification: 'MBBS, MD', specialty: 'General Medicine', phone: '9811001234', registrationNo: 'DMC/RJ/12345' },
  { name: 'Dr. Anita Sharma', qualification: 'MBBS, DCH', specialty: 'Pediatrics', phone: '9811002345', registrationNo: 'DMC/DL/23456' },
  { name: 'Dr. K. Rajan', qualification: 'MBBS, MS', specialty: 'General Surgery', phone: '9811003456', registrationNo: 'TMMC/34567' },
  { name: 'Dr. P. Reddy', qualification: 'MBBS, MD', specialty: 'Cardiology', phone: '9811004567', registrationNo: 'TSMMC/45678' },
  { name: 'Dr. A. Patil', qualification: 'BHMS', specialty: 'Homeopathy', phone: '9811005678', registrationNo: 'MMC/MH/56789' },
  { name: 'Dr. Krishnan', qualification: 'MBBS, MD', specialty: 'ENT', phone: '9811006789', registrationNo: 'TMMC/67890' },
  { name: 'Dr. Verma', qualification: 'MBBS', specialty: 'General Medicine', phone: '9811007890', registrationNo: 'MPMC/78901' },
  { name: 'Dr. R. Mishra', qualification: 'BAMS', specialty: 'Ayurveda', phone: '9811008901', registrationNo: 'UPMC/89012' },
  { name: 'Dr. H. Shah', qualification: 'MBBS, MD', specialty: 'Dermatology', phone: '9811009012', registrationNo: 'GMC/GJ/90123' },
  { name: 'Dr. R. Deshmukh', qualification: 'MBBS, DGO', specialty: 'Gynecology', phone: '9811010123', registrationNo: 'MMC/MH/01234' },
  { name: 'Dr. Jain', qualification: 'MBBS, MD', specialty: 'Orthopedics', phone: '9811011234', registrationNo: 'RMC/RJ/11223' },
  { name: 'Dr. M. Rao', qualification: 'MBBS, MS', specialty: 'Ophthalmology', phone: '9811012345', registrationNo: 'TSMMC/22334' },
  { name: 'Dr. Menon', qualification: 'MBBS, MD', specialty: 'General Medicine', phone: '9811013456', registrationNo: 'KMC/KL/33445' },
];

const racks = [
  { name: 'A1', aisle: 'A', section: 'Antibiotics', description: 'Top shelf - Antibiotics section' },
  { name: 'A2', aisle: 'A', section: 'Antibiotics', description: 'Bottom shelf - Antibiotics section' },
  { name: 'B1', aisle: 'B', section: 'Analgesics & Vitamins', description: 'Pain relief and supplements' },
  { name: 'B2', aisle: 'B', section: 'Gastro & Antacids', description: 'Stomach and digestion' },
  { name: 'C1', aisle: 'C', section: 'Cardiac & Diabetes', description: 'Heart and sugar care' },
  { name: 'C2', aisle: 'C', section: 'Respiratory & Cold', description: 'Cough, cold and breathing' },
  { name: 'D1', aisle: 'D', section: 'Dermatology & Topicals', description: 'Skin care and ointments' },
  { name: 'D2', aisle: 'D', section: 'OTC General', description: 'General OTC products' },
  { name: 'E1', aisle: 'E', section: 'Syrups & Liquids', description: 'Liquid formulations' },
  { name: 'E2', aisle: 'E', section: 'Lozenges & Sprays', description: 'Throat care' },
];

async function seed() {
  console.log('Clearing existing data...');

  // Delete in reverse dependency order
  await db.payment.deleteMany();
  await db.saleItem.deleteMany();
  await db.sale.deleteMany();
  await db.returnItem.deleteMany();
  await db.return.deleteMany();
  await db.purchaseItem.deleteMany();
  await db.purchase.deleteMany();
  await db.purchaseOrderItem.deleteMany();
  await db.purchaseOrder.deleteMany();
  await db.prescriptionItem.deleteMany();
  await db.prescription.deleteMany();
  await db.stockMovement.deleteMany();
  await db.medicineBatch.deleteMany();
  await db.medicine.deleteMany();
  await db.customer.deleteMany();
  await db.supplier.deleteMany();
  await db.doctor.deleteMany();
  await db.rack.deleteMany();
  await db.auditLog.deleteMany();
  await db.dayClose.deleteMany();
  await db.setting.deleteMany();
  await db.user.deleteMany();

  console.log('Database cleared.');

  // ─── 1. Admin User ──────────────────────────────────────────────────────────
  const adminPwd = await hash('admin123', 10);
  const cashierPwd = await hash('cashier123', 10);
  const pharmacistPwd = await hash('pharm123', 10);

  const admin = await db.user.create({
    data: { username: 'admin', name: 'Dr. Rajesh Mehta', email: 'admin@upharma.in', password: adminPwd, role: 'Admin', pin: '1234', active: true },
  });
  await db.user.create({
    data: { username: 'cashier1', name: 'Anita Kumari', email: 'anita@upharma.in', password: cashierPwd, role: 'Cashier', pin: '1111', active: true },
  });
  await db.user.create({
    data: { username: 'pharmacist1', name: 'Vikas Pandey', email: 'vikas@upharma.in', password: pharmacistPwd, role: 'Pharmacist', pin: '2222', active: true },
  });
  console.log('Users created: admin, cashier1, pharmacist1');

  // ─── 2. Settings ────────────────────────────────────────────────────────────
  const settings = [
    { key: 'store_name', value: 'Upharma Medical Store' },
    { key: 'store_address', value: '15, Main Market, Near SBI Bank, Sector 14, Gurgaon, Haryana 122001' },
    { key: 'store_phone', value: '0124-4567890' },
    { key: 'store_email', value: 'info@upharma.in' },
    { key: 'store_pincode', value: '122001' },
    { key: 'store_gst_number', value: '06AABCU1234A1ZW' },
    { key: 'store_drug_license', value: 'HR-PH-2024-00456' },
    { key: 'store_fssai_number', value: '12224000123456' },
    { key: 'invoice_prefix', value: 'INV-' },
    { key: 'invoice_next_number', value: '1001' },
    { key: 'gst_enabled', value: 'true' },
    { key: 'cgst_rate', value: '6' },
    { key: 'sgst_rate', value: '6' },
    { key: 'igst_rate', value: '12' },
    { key: 'paper_size', value: 'A4' },
    { key: 'print_copies', value: '2' },
    { key: 'upi_id', value: 'upharma@ybl' },
  ];
  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: { value: s.value }, create: s });
  }
  console.log(`Settings created (${settings.length} keys)`);

  // ─── 3. Racks ───────────────────────────────────────────────────────────────
  for (const rack of racks) {
    await db.rack.create({ data: rack });
  }
  console.log(`Racks created: ${racks.length}`);

  // ─── 4. Suppliers ───────────────────────────────────────────────────────────
  const supplierRecords = [];
  for (const sup of suppliers) {
    supplierRecords.push(await db.supplier.create({ data: sup }));
  }
  console.log(`Suppliers created: ${supplierRecords.length}`);

  // ─── 5. Doctors ─────────────────────────────────────────────────────────────
  const doctorRecords = [];
  for (const doc of doctors) {
    doctorRecords.push(await db.doctor.create({ data: doc }));
  }
  console.log(`Doctors created: ${doctorRecords.length}`);

  // ─── 6. Customers ───────────────────────────────────────────────────────────
  const customerRecords = [];
  for (const cust of customers) {
    customerRecords.push(await db.customer.create({
      data: { ...cust, totalPurchases: Math.floor(Math.random() * 5000) + 500, loyaltyPoints: Math.floor(Math.random() * 200) },
    }));
  }
  console.log(`Customers created: ${customerRecords.length}`);

  // ─── 7. Medicines + Batches ─────────────────────────────────────────────────
  const medicineRecords = [];
  const allRacks = await db.rack.findMany();
  const batchDate = new Date();
  const saleDate = new Date();

  for (let i = 0; i < medicines.length; i++) {
    const med = medicines[i];
    const rack = allRacks[i % allRacks.length];
    const medRec = await db.medicine.create({ data: med });
    medicineRecords.push(medRec);

    // Create 2 batches per medicine with realistic batch numbers
    for (let b = 0; b < 2; b++) {
      const batchNo = `MFG${String(Math.floor(Math.random() * 900000) + 100000)}`;
      const expiryMonths = 8 + Math.floor(Math.random() * 24); // 8-32 months from now
      const expiryDate = new Date(batchDate);
      expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);
      const stockQty = 20 + Math.floor(Math.random() * 180); // 20-200 units

      await db.medicineBatch.create({
        data: {
          medicineId: medRec.id,
          batchNo,
          expiryDate,
          purchaseRate: med.purchaseRate,
          saleRate: med.saleRate,
          mrp: med.mrp,
          stockQty,
          initialStock: stockQty + Math.floor(Math.random() * 50),
          supplierId: supplierRecords[Math.floor(Math.random() * supplierRecords.length)].id,
          purchaseDate: new Date(batchDate.getTime() - Math.floor(Math.random() * 90) * 86400000),
          rackId: rack.id,
          active: true,
        },
      });
    }
  }
  console.log(`Medicines created: ${medicineRecords.length} with batches`);

  // ─── 8. Sales (past 30 days) ────────────────────────────────────────────────
  let invoiceCounter = 1001;
  const numSales = 47;

  for (let s = 0; s < numSales; s++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDateStr = new Date(saleDate.getTime() - daysAgo * 86400000);
    saleDateStr.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));

    // Pick 1-5 random medicines
    const numItems = 1 + Math.floor(Math.random() * 5);
    const saleMedicines: typeof medicineRecords[] = [];
    const usedIndices = new Set<number>();
    for (let it = 0; it < Math.min(numItems, medicineRecords.length); it++) {
      let idx: number;
      do { idx = Math.floor(Math.random() * medicineRecords.length); } while (usedIndices.has(idx));
      usedIndices.add(idx);
      saleMedicines.push(medicineRecords[idx]);
    }

    const saleItemsData: any[] = [];
    let subtotal = 0;

    for (const med of saleMedicines) {
      const batches = await db.medicineBatch.findMany({ where: { medicineId: med.id, active: true, stockQty: { gt: 0 } } });
      if (batches.length === 0) continue;
      const batch = batches[0];
      const qty = 1 + Math.floor(Math.random() * 10);
      const itemTotal = qty * med.saleRate;
      const cgstAmt = Math.round((itemTotal * 0.06) * 100) / 100;
      const sgstAmt = Math.round((itemTotal * 0.06) * 100) / 100;

      saleItemsData.push({
        medicineId: med.id,
        batchId: batch.id,
        medicineName: med.name,
        manufacturer: med.manufacturer,
        batchNo: batch.batchNo,
        quantity: qty,
        unitType: 'strip',
        saleRate: med.saleRate,
        mrp: med.mrp,
        gstPercent: med.gstPercent,
        cgst: cgstAmt,
        sgst: sgstAmt,
        total: itemTotal,
        expiryDate: batch.expiryDate,
      });
      subtotal += itemTotal;
    }

    if (saleItemsData.length === 0) continue;

    const totalCgst = saleItemsData.reduce((s: number, i: any) => s + i.cgst, 0);
    const totalSgst = saleItemsData.reduce((s: number, i: any) => s + i.sgst, 0);
    const totalGst = totalCgst + totalSgst;
    const grandTotal = Math.round((subtotal + totalGst) * 100) / 100;
    const discount = Math.random() > 0.7 ? Math.round(grandTotal * 0.02 * 100) / 100 : 0;
    const finalTotal = grandTotal - discount;

    const cust = customerRecords[Math.floor(Math.random() * customerRecords.length)];
    const doc = doctorRecords[Math.floor(Math.random() * doctorRecords.length)];
    const modes = ['Cash', 'UPI', 'Card', 'Cash'];
    const paymentMode = modes[Math.floor(Math.random() * modes.length)];
    const invoiceNo = `INV-0${invoiceCounter++}`;

    await db.sale.create({
      data: {
        invoiceNo,
        customerId: cust.id,
        customerName: cust.name,
        doctorId: doc.id,
        date: saleDateStr,
        subtotal: Math.round(subtotal * 100) / 100,
        totalDiscount: discount,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        igst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal: Math.round(finalTotal * 100) / 100,
        paidAmount: Math.round(finalTotal * 100) / 100,
        balanceDue: 0,
        paymentMode,
        userId: admin.id,
        status: 'Completed',
        items: { create: saleItemsData },
      },
    });
  }
  console.log(`Sales created: ${numSales}`);

  // ─── 9. Purchases (past 60 days) ────────────────────────────────────────────
  let purchaseCounter = 2001;
  const numPurchases = 18;

  for (let p = 0; p < numPurchases; p++) {
    const daysAgo = 5 + Math.floor(Math.random() * 55);
    const purchaseDate = new Date(saleDate.getTime() - daysAgo * 86400000);
    const supplier = supplierRecords[Math.floor(Math.random() * supplierRecords.length)];

    const numItems = 2 + Math.floor(Math.random() * 6);
    const purchaseItemsData: any[] = [];
    let purchaseSubtotal = 0;

    for (let it = 0; it < Math.min(numItems, medicineRecords.length); it++) {
      const med = medicineRecords[Math.floor(Math.random() * medicineRecords.length)];
      const qty = 5 + Math.floor(Math.random() * 20);
      const itemTotal = qty * med.purchaseRate;
      const cgstAmt = Math.round((itemTotal * 0.06) * 100) / 100;
      const sgstAmt = Math.round((itemTotal * 0.06) * 100) / 100;

      purchaseItemsData.push({
        medicineId: med.id,
        medicineName: med.name,
        quantity: qty,
        unitType: 'strip',
        purchaseRate: med.purchaseRate,
        gstPercent: med.gstPercent,
        cgst: cgstAmt,
        sgst: sgstAmt,
        total: Math.round(itemTotal * 100) / 100,
      });
      purchaseSubtotal += itemTotal;
    }

    const totalCgst = purchaseItemsData.reduce((s: number, i: any) => s + i.cgst, 0);
    const totalSgst = purchaseItemsData.reduce((s: number, i: any) => s + i.sgst, 0);
    const totalGst = totalCgst + totalSgst;
    const grandTotal = Math.round((purchaseSubtotal + totalGst) * 100) / 100;

    await db.purchase.create({
      data: {
        invoiceNo: `PUR-${purchaseCounter++}`,
        supplierId: supplier.id,
        date: purchaseDate,
        subtotal: Math.round(purchaseSubtotal * 100) / 100,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        igst: 0,
        totalGst: Math.round(totalGst * 100) / 100,
        grandTotal,
        paidAmount: Math.round(grandTotal * 100) / 100,
        balanceDue: 0,
        status: 'Completed',
        userId: admin.id,
        items: { create: purchaseItemsData },
      },
    });
  }
  console.log(`Purchases created: ${numPurchases}`);

  // ─── 10. Returns ────────────────────────────────────────────────────────────
  await db.return.create({
    data: {
      returnNo: 'RET-3001',
      type: 'SALE_RETURN',
      referenceId: 'sale-return-1',
      customerId: customerRecords[0].id,
      totalAmount: 45.00,
      reason: 'Wrong medicine dispensed',
      userId: admin.id,
      status: 'Completed',
    },
  });
  await db.return.create({
    data: {
      returnNo: 'RET-3002',
      type: 'PURCHASE_RETURN',
      referenceId: 'purchase-return-1',
      supplierId: supplierRecords[0].id,
      totalAmount: 520.00,
      reason: 'Short expiry batch received',
      userId: admin.id,
      status: 'Completed',
    },
  });
  console.log('Returns created: 2');

  // ─── Summary ─────────────────────────────────────────────────────────────────
  const medCount = await db.medicine.count();
  const batchCount = await db.medicineBatch.count();
  const custCount = await db.customer.count();
  const suppCount = await db.supplier.count();
  const saleCount = await db.sale.count();
  const purchaseCount = await db.purchase.count();
  const doctorCount = await db.doctor.count();
  const userCount = await db.user.count();

  console.log('\n========== SEED COMPLETE ==========');
  console.log(`Users:       ${userCount}`);
  console.log(`Doctors:     ${doctorCount}`);
  console.log(`Medicines:   ${medCount}`);
  console.log(`Batches:     ${batchCount}`);
  console.log(`Customers:   ${custCount}`);
  console.log(`Suppliers:   ${suppCount}`);
  console.log(`Sales:       ${saleCount}`);
  console.log(`Purchases:   ${purchaseCount}`);
  console.log(`Returns:     2`);
  console.log('===================================\n');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
