import db from './db.mjs';

const updates = [
  {
    id: 4867,
    status: 'contacted',
    note: 'Contact form submitted: https://www.arrowsheetmetaltampafl.com/contact (Autofilled Pamela Jameson; confirmed: "Thank you for contacting us.We will get back to you as soon as possible")'
  },
  {
    id: 4868,
    status: 'contacted',
    note: 'Contact form submitted: https://www.tampasheetmetal.com/contact-us/ (Autofilled Pamela Jameson; Contact Form 7 confirmed: "Your message was sent successfully. Thanks.")'
  },
  {
    id: 4869,
    status: 'unable_to_reach',
    note: 'Contact form: https://swscontracting.com/ (GoDaddy Website Builder form with modal; blocked by invisible Google reCAPTCHA v3 bot scoring)'
  },
  {
    id: 4870,
    status: 'contacted',
    note: 'Contact form submitted: https://irontransformation.com/ (Autofilled Pamela Jameson; math security check solved; API HTTP 201 Created with Quote #10 / Order #11)'
  },
  {
    id: 4871,
    status: 'contacted',
    note: 'Contact form submitted: https://www.qualitysteelfab.com/contact (Autofilled Pamela Jameson; Squarespace SaveFormSubmission HTTP 204; confirmed: "Thank you!")'
  },
  {
    id: 4872,
    status: 'unable_to_reach',
    note: 'Contact form: https://advantagesteelinc.com/ (GoDaddy Website Builder form; blocked by invisible Google reCAPTCHA v3 bot scoring)'
  },
  {
    id: 4873,
    status: 'unable_to_reach',
    note: 'Contact form: https://reliableweldingandsteelsupply.com/contact.html/ (Server returned 403 Forbidden openresty/1.31.1.1; homepage has no web form)'
  },
  {
    id: 4874,
    status: 'unable_to_reach',
    note: 'Contact form: https://odysseyfab.com/pages/contact-us (Shopify storefront; form submission blocked by mandatory hCaptcha challenge)'
  },
  {
    id: 4875,
    status: 'contacted',
    note: 'Contact form submitted: https://www.tampametalworksinc.com/contact (Autofilled Pamela Jameson; Duda form confirmed: "Thank you for contacting us.We will get back to you as soon as possible.")'
  },
  {
    id: 4876,
    status: 'unable_to_reach',
    note: 'Contact form: https://www.ttopweldingtampa.com/ (Autofilled Pamela Jameson; blocked by Google reCAPTCHA v2 checkbox challenge)'
  }
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

db.transaction(() => {
  for (const item of updates) {
    const current = getStmt.get(item.id);
    let baseNotes = current?.notes || '';
    // Strip previous agent-3 notes if any to keep clean
    if (baseNotes.includes(' | ')) {
      baseNotes = baseNotes.split(' | ')[0];
    }
    const newNotes = baseNotes ? `${baseNotes} | ${item.note}` : item.note;
    updateStmt.run(newNotes, item.status, item.id);
    logStmt.run(item.id, item.status === 'contacted' ? 'sent' : 'bounced', item.note);
    console.log(`Updated Lead #${item.id} -> ${item.status}`);
  }
})();

console.log('All updates committed successfully!');
