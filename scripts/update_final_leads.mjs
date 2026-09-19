import db from './db.mjs';

const leadsData = [
  {
    id: 4072,
    status: 'unable_to_reach',
    note: 'Checked https://mephsa.us: Site inaccessible / connection timeout',
    action: 'bounced'
  },
  {
    id: 4073,
    status: 'unable_to_reach',
    note: 'Checked https://anceengineering.com: Online store catalog only, no general contact inquiry form found',
    action: 'bounced'
  },
  {
    id: 4074,
    status: 'unable_to_reach',
    note: 'Checked https://onestopinventing.com: Gravity Forms submission requires invention disclosure agreement / validation error on submission',
    action: 'bounced'
  },
  {
    id: 4075,
    status: 'contacted',
    note: 'Contact form https://getinc.org/contact-us/ (Autofilled & verified confirmation: "Thank you for your message. It has been sent.")',
    action: 'sent'
  },
  {
    id: 4076,
    status: 'unable_to_reach',
    note: 'Checked https://castilloeng.com: Wix contact form filled and submitted; no confirmation message returned post-submission',
    action: 'bounced'
  },
  {
    id: 4077,
    status: 'unable_to_reach',
    note: 'Checked https://www.jd-miami.com/: Duda contact form filled and submitted; no confirmation message returned post-submission',
    action: 'bounced'
  },
  {
    id: 4078,
    status: 'unable_to_reach',
    note: 'Checked https://restekc.com/: Contact form found and autofilled; blocked by Google reCAPTCHA challenge',
    action: 'bounced'
  },
  {
    id: 4079,
    status: 'unable_to_reach',
    note: 'Checked https://protek.engineering: GoDaddy contact form filled and submitted; no confirmation message returned post-submission',
    action: 'bounced'
  },
  {
    id: 4080,
    status: 'unable_to_reach',
    note: 'Checked https://egscfl.com: GoDaddy contact form filled and submitted; no confirmation message returned post-submission',
    action: 'bounced'
  },
  {
    id: 4081,
    status: 'unable_to_reach',
    note: 'Checked https://ethosengineering.square.site: Square site storefront with no contact or inquiry form',
    action: 'bounced'
  }
];

const getLeadStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');
const updateLeadStmt = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const insertLogStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

for (const lead of leadsData) {
  const current = getLeadStmt.get(lead.id);
  // Keep original description if present, append cleanly
  const baseNotes = current?.notes ? current.notes.split(' | ')[0] : '';
  const finalNote = baseNotes ? `${baseNotes} | ${lead.note}` : lead.note;

  db.transaction(() => {
    updateLeadStmt.run(lead.status, finalNote, lead.id);
    insertLogStmt.run(lead.id, lead.action, lead.note);
  })();
  console.log(`Updated lead #${lead.id} -> ${lead.status}`);
}

console.log('Database updated successfully.');
