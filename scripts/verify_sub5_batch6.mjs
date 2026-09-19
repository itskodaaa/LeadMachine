import db from './db.mjs';

const leads = [392, 394, 395, 398, 399, 400, 401, 402, 404, 405];

const placeholders = leads.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, company_name, website, status, notes, updated_at FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leads);

console.log(JSON.stringify(rows, null, 2));
