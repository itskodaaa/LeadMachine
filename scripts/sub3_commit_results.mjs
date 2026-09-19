import db from './db.mjs';

const results = [
  {
    id: 1814,
    status: 'unable_to_reach',
    note: 'Contact form at https://www.protechmachinetool.com/contact-us: Autofilled; submission POST request blocked with HTTP 403 Forbidden by hosting Security WAF.'
  },
  {
    id: 1815,
    status: 'unable_to_reach',
    note: 'Contact form at https://calmachine.com/contact-us/: Autofilled; submission blocked by mandatory Google reCAPTCHA v2 checkbox challenge.'
  },
  {
    id: 1816,
    status: 'unable_to_reach',
    note: 'Checked https://cnczarmachine.com/: Site is an empty "Coming Soon" placeholder; no online web contact form found.'
  },
  {
    id: 1817,
    status: 'unable_to_reach',
    note: 'Checked https://anaheimmachining.com/: Site inaccessible; origin web server connection timed out behind Cloudflare.'
  },
  {
    id: 1818,
    status: 'unable_to_reach',
    note: 'Checked https://cavmachine.com/contact-us: No online web form found; page explicitly directs visitors to direct email or phone.'
  },
  {
    id: 1819,
    status: 'contacted',
    note: 'Contact form at https://biltmachining.com/: Autofilled and verified submission confirmation: "thank you for your message. it has been sent."'
  },
  {
    id: 1820,
    status: 'contacted',
    note: 'Contact form at https://hhmachining.com/: Autofilled and verified submission confirmation: "thanks for contacting us! we will get in touch with you shortly."'
  },
  {
    id: 1821,
    status: 'contacted',
    note: 'Contact form at https://toomacengineering.com/contact: Autofilled and verified submission confirmation: "Thank you for your message! We will be in touch shortly."'
  },
  {
    id: 1829,
    status: 'unable_to_reach',
    note: 'Contact form at https://southernmanufacturing.com/contact-us/: Autofilled; submission blocked by mandatory Google reCAPTCHA v2 challenge.'
  },
  {
    id: 1835,
    status: 'contacted',
    note: 'Contact form at https://metalworkscorp.com/contact: Autofilled and verified submission confirmation (redirected to /form-confirmation/contact-confirmation): "Thank you! Your form was submitted successfully. We will be in touch with you shortly."'
  }
];

const updateStmt = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

const commitTransaction = db.transaction(() => {
  for (const r of results) {
    updateStmt.run(r.status, r.note, r.id);
    const action = r.status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(r.id, action, r.note);
  }
});

commitTransaction();

console.log('Successfully committed all 10 leads to data/leads.db.');

// Print verification
const leadIds = results.map(r => r.id);
const rows = db.prepare(`SELECT id, company_name, status, notes FROM leads WHERE id IN (${leadIds.join(',')})`).all();
console.table(rows);
