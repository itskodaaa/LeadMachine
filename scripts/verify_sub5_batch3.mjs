import db from './db.mjs';

const leads = [238, 239, 240, 241, 242, 243, 244, 246, 248, 249];

const placeholders = leads.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, company_name, website, status, notes, updated_at FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leads);

console.log(JSON.stringify(rows, null, 2));
