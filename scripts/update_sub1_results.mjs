import db from './db.mjs';

const updates = [
  {
    id: 4169,
    status: 'contacted',
    note: 'Contact form: https://criterium-yancy.com/contact/ (Autofilled & verified: Gravity Form submitted, redirected to https://criterium-yancy.com/thank-you-learn-more/)'
  },
  {
    id: 4170,
    status: 'unable_to_reach',
    note: 'Contact form: https://momentumtx.com/contact.php (Checked: Static legacy CF7 HTML form without active backend mail handler; phone 281-741-1998, email momentum@momentumtx.com)'
  },
  {
    id: 4174,
    status: 'unable_to_reach',
    note: 'Checked http://structural.nu/#contact: Form is commented out in page HTML source; invalid SSL cert on HTTPS; direct contact info@structural.nu / 713-956-2094'
  },
  {
    id: 4175,
    status: 'contacted',
    note: 'Contact form: https://www.fifengineering.com/contact-us (Autofilled & verified: Duda form submitted, confirmation: "Thank you for contacting us.We will get back to you as soon as possible.")'
  },
  {
    id: 4176,
    status: 'contacted',
    note: 'Contact form: https://www.imaginationeering.com/contact (Autofilled & verified: Bypassed bot honeypots, submitted to https://www.imaginationeering.com/thank-you with "Thanks For Reaching Out. Thank You")'
  },
  {
    id: 4177,
    status: 'unable_to_reach',
    note: 'Contact form: https://www.walkertx.com/contact/ (Autofilled; blocked by Google reCAPTCHA v2 challenge)'
  }
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT notes FROM leads WHERE id = ?');

db.transaction(() => {
  for (const u of updates) {
    const row = getStmt.get(u.id);
    let newNotes = row?.notes || '';
    // Append or replace the last note segment
    newNotes += ' | ' + u.note;
    updateStmt.run(newNotes, u.status, u.id);
    logStmt.run(u.id, u.status === 'contacted' ? 'sent' : 'bounced', u.note);
  }
})();

console.log('Successfully committed updates to data/leads.db');

const rows = db.prepare(`SELECT id, company_name, website, status, notes FROM leads WHERE id IN (4169, 4170, 4172, 4173, 4174, 4175, 4176, 4177, 4178, 4179) ORDER BY id ASC`).all();
console.table(rows.map(r => ({ id: r.id, company: r.company_name, status: r.status, noteSnippet: r.notes.slice(-85) })));
