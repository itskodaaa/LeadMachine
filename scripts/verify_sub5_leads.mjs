import db from './db.mjs';

const leads = [152, 153, 154, 168, 169, 170, 171, 172, 173, 175];

// Update 168
const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

db.transaction(() => {
  updateStmt.run('Contact form: https://jpgconstruction.us/ (Autofilled & verified: The form was sent successfully.)', 'contacted', 168);
  logStmt.run(168, 'sent', 'Contact form: https://jpgconstruction.us/ (Autofilled & verified: The form was sent successfully.)');
})();

const placeholders = leads.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, company_name, website, status, notes, updated_at FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leads);

console.log(JSON.stringify(rows, null, 2));
