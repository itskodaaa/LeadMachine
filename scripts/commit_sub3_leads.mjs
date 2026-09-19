import db from './db.mjs';

const updates = [
  {
    id: 3514,
    status: 'unable_to_reach',
    note: 'Checked https://precisionbuildatx.com/contact/: No online web form found; direct contact via email (precisiondbuild@gmail.com) and phone (737-276-1832)'
  },
  {
    id: 3515,
    status: 'contacted',
    note: "Contact form: https://stegerbizzell.com/contact/ (Autofilled & verified: 'Thanks for contacting us! We will get in touch with you shortly.')"
  },
  {
    id: 3516,
    status: 'unable_to_reach',
    note: 'Checked https://spradlingengineering.com/contact-us/: No online web form found; direct contact via email (shannonrenee@spradlingengineering.com) and phone (512-843-4192)'
  },
  {
    id: 3517,
    status: 'unable_to_reach',
    note: 'Contact form: https://www.mclellanengineering.com/contact_us/ (Autofilled; blocked by Google reCAPTCHA v3 / anti-spam verification: "There was an error trying to send your message.")'
  },
  {
    id: 3518,
    status: 'unable_to_reach',
    note: 'Checked https://www.txie.org/: No online web form found; direct contact via email (info@txie.org)'
  },
  {
    id: 3519,
    status: 'contacted',
    note: 'Contact form: https://www.ssoe.com/about-us/contact/ (Autofilled & verified: Redirected to confirmation page https://www.ssoe.com/general-contact-success/)'
  },
  {
    id: 3520,
    status: 'unable_to_reach',
    note: 'Checked https://www.dmq-us.com/: Domain returns 404 Not Found and SSL certificate mismatch'
  },
  {
    id: 3521,
    status: 'contacted',
    note: "Contact form: https://hanesgeo.com/contact (Autofilled & verified: Redirected to https://hanesgeo.com/thank-you: 'Thank You We have recieved your email. We will contact you shortly.')"
  },
  {
    id: 3522,
    status: 'unable_to_reach',
    note: 'Checked https://www.clandestinepd.com/contact/: No online web form found; direct contact via email (discover@clandestinepd.com) and phone (512-440-0600)'
  },
  {
    id: 3524,
    status: 'unable_to_reach',
    note: 'Contact form: https://www.norbac3.com/contact-us (Wix form autofilled; no confirmation message received post-submission; direct email: sales@norbac3.com)'
  }
];

const updateLead = db.prepare(`
  UPDATE leads 
  SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP 
  WHERE id = ?
`);

const insertLog = db.prepare(`
  INSERT INTO contact_logs (lead_id, action, notes, created_at)
  VALUES (?, ?, ?, CURRENT_TIMESTAMP)
`);

const getLead = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

const commitAll = db.transaction(() => {
  for (const item of updates) {
    const current = getLead.get(item.id);
    let originalPrefix = '';
    if (current?.notes) {
      // Keep original extraction note if present
      const parts = current.notes.split(' | ');
      originalPrefix = parts[0] + ' | ';
    }
    const combinedNotes = originalPrefix + item.note;
    updateLead.run(item.status, combinedNotes, item.id);
    const action = item.status === 'contacted' ? 'sent' : 'bounced';
    insertLog.run(item.id, action, item.note);
    console.log(`Updated lead #${item.id} -> ${item.status}`);
  }
});

commitAll();
console.log('All 10 leads successfully committed to data/leads.db');
