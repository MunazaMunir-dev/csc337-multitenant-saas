import 'dotenv/config';
import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function main() {
  const schema = await fs.readFile(new URL('../../../../database/schema.sql', import.meta.url), 'utf8').catch(async () =>
    fs.readFile(new URL('../../../database/schema.sql', import.meta.url), 'utf8')
  );
  await pool.query(schema);
  const tenants = [
    { name: 'ABC Electronics', slug: 'abc-electronics', email: 'admin@abc.test', user: 'ABC Admin', products: [
      ['Wireless Mouse', 'ABC-MOUSE', 1200, 50], ['Keyboard', 'ABC-KEY', 2500, 30]
    ]},
    { name: 'XYZ Fashion', slug: 'xyz-fashion', email: 'admin@xyz.test', user: 'XYZ Admin', products: [
      ['Cotton Shirt', 'XYZ-SHIRT', 1800, 40], ['Denim Jeans', 'XYZ-JEANS', 3200, 25]
    ]}
  ];
  for (const t of tenants) {
    const tr = await pool.query(
      'INSERT INTO tenants (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id',
      [t.name, t.slug]
    );
    const tenantId = tr.rows[0].id;
    const hash = await bcrypt.hash('DemoPass123!', 10);
    await pool.query(
      `INSERT INTO users (tenant_id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'admin')
       ON CONFLICT (tenant_id,email) DO UPDATE SET password_hash=EXCLUDED.password_hash`,
      [tenantId, t.user, t.email, hash]
    );
    for (const p of t.products) {
      await pool.query(
        `INSERT INTO products (tenant_id,name,sku,unit_price,inventory_quantity)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (tenant_id,sku) DO NOTHING`,
        [tenantId, ...p]
      );
    }
  }
  console.log('Database initialized. Demo users use password DemoPass123!');
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => pool.end());
