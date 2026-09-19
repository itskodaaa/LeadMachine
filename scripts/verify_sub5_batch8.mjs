import db from './db.mjs';

const leads = [626, 627, 628, 629, 630, 631, 632, 633, 634, 635];

const placeholders = leads.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, company_name, website, status, notes, updated_at FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leads);

console.log(JSON.stringify(rows, null, 2));
