import db from './db.mjs';

const leads = [288, 289, 290, 291, 292, 293, 294, 295, 296, 298];

// Update 289
const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

db.transaction(() => {
  updateStmt.run('Checked https://diazgroupconstruction.com/lander: No online web form found', 'unable_to_reach', 289);
  logStmt.run(289, 'bounced', 'Checked https://diazgroupconstruction.com/lander: No online web form found');
})();

const placeholders = leads.map(() => '?').join(',');
const rows = db.prepare(`SELECT id, company_name, website, status, notes, updated_at FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leads);

console.log(JSON.stringify(rows, null, 2));
