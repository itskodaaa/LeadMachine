import db from './db.mjs';

const updates = [
  {
    id: 836,
    status: 'unable_to_reach',
    note: 'Contact form at https://www.vhb.com/contact-us/ protected by invisible Google reCAPTCHA. Direct contact: EEO@vhb.com.'
  },
  {
    id: 837,
    status: 'contacted',
    note: 'Contact inquiry successfully submitted via GoDaddy form API (messageId: ba55b0aa-2bef-4550-ba6d-94c746e9fbaf). Confirmation: "Thank you for your inquiry! We will get back to you within 48 hours." Direct email: info@qnspc.com.'
  },
  {
    id: 838,
    status: 'unable_to_reach',
    note: 'Checked https://www.hatfieldgrp.com/contact-us: No general contact inquiry form found (only email newsletter signup). Website requests direct email: Info@HatfieldGrp.com.'
  },
  {
    id: 839,
    status: 'unable_to_reach',
    note: 'Checked https://alma-pc.com/Contact-Us: No online contact inquiry form found (only DNN search bar). Website requests direct email: Info@Alma-pc.com, 646-547-1263.'
  },
  {
    id: 840,
    status: 'unable_to_reach',
    note: 'Checked https://www.sh-structures.com/: Portfolio-only website with no contact form.'
  },
  {
    id: 841,
    status: 'unable_to_reach',
    note: 'Domain redirects to TYLin parent portal (https://www.tylin.com/samschwartz) which blocked automated access via Cloudflare WAF challenge (HTTP 403).'
  },
  {
    id: 842,
    status: 'unable_to_reach',
    note: 'Checked https://www.set-ny.com/contact: No web contact form found (only site search input). Website directs inquiries to: info@set-ny.com, (718) 706-7196.'
  },
  {
    id: 843,
    status: 'unable_to_reach',
    note: 'Contact form at https://mcstructural.com/contact.html is blocked by Google reCAPTCHA. Direct email: info@MCstructural.com.'
  },
  {
    id: 844,
    status: 'contacted',
    note: 'Contact inquiry successfully submitted via Wix Studio Forms Platform on https://www.lera.com/offices. Form fields validated, processed, and reset without error. Direct marketing contact: carrie.villani@lera.com.'
  },
  {
    id: 845,
    status: 'unable_to_reach',
    note: 'Contact form at https://yorktower.com/contact/ is protected by Google reCAPTCHA v2 iframe. Direct email: info@yorktower.com.'
  }
];

const updateLead = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const insertLog = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getLead = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

db.transaction(() => {
  for (const u of updates) {
    const current = getLead.get(u.id);
    const existing = current?.notes ? current.notes.split(' | ')[0] : '';
    const mergedNotes = existing ? `${existing} | ${u.note}` : u.note;
    updateLead.run(u.status, mergedNotes, u.id);
    const action = u.status === 'contacted' ? 'sent' : 'bounced';
    insertLog.run(u.id, action, u.note);
  }
})();

console.log('Successfully updated leads 836-845 in database.');
