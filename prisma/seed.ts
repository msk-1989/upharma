import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const db = new PrismaClient();

async function seed() {
  console.log('Seeding database...');

  // === ADMIN USER (required for login) ===
  const password = await hash('admin123', 10);
  await db.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', name: 'Admin', password, role: 'Admin', active: true },
  });
  console.log('Admin user created (admin / admin123)');

  // === DEFAULT SETTINGS ===
  const settings = [
    { key: 'store_name', value: 'Upharma Medical Store' },
    { key: 'store_address', value: '' },
    { key: 'store_phone', value: '' },
    { key: 'store_email', value: '' },
    { key: 'store_pincode', value: '' },
    { key: 'store_gst_number', value: '' },
    { key: 'store_drug_license', value: '' },
    { key: 'invoice_prefix', value: 'INV-' },
    { key: 'invoice_next_number', value: '1001' },
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
  console.log(`Default settings created (${settings.length} keys)`);

  console.log('Seeding complete!');
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => process.exit(0));
