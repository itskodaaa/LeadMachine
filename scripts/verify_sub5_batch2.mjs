import db from './db.mjs';

const leads = [188, 189, 192, 193, 194, 195, 196, 197, 198, 199];

const placeholders = leads.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, company_name, website, status, notes, updated_at FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leads);

console.log(JSON.stringify(rows, null, 2));
