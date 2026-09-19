import db from './db.mjs';

const updates = [
  {
    id: 1596,
    status: 'unable_to_reach',
    notes: 'Tool store. Address: 9515 Seymour Ave, Schiller Park, IL 60176. | Contact form on https://itpco.com/contact/ is protected by Google reCAPTCHA.',
    log: 'Inspected form on https://itpco.com/contact/ - blocked by Google reCAPTCHA.'
  },
  {
    id: 1597,
    status: 'unable_to_reach',
    notes: 'Manufacturer. 5 stars. Address: 9370 Byron St, Schiller Park, IL 60176. | Contact form on https://www.soldy.com/contact-us is protected by visual icon CAPTCHA (kc_captcha).',
    log: 'Inspected form on https://www.soldy.com/contact-us - blocked by visual icon CAPTCHA (kc_captcha).'
  },
  {
    id: 1598,
    status: 'unable_to_reach',
    notes: 'Machinery parts manufacturer. Address: 4200 Grace St, Schiller Park, IL 60176. | Checked https://ilbroach.com/ - no online web contact form found (phone: 888-427-6224 / 847-678-3666).',
    log: 'Checked https://ilbroach.com/ - no online web contact form found.'
  },
  {
    id: 1600,
    status: 'unable_to_reach',
    notes: 'Industrial equipment supplier. Address: 9301 Bernice Ave, Schiller Park, IL 60176. | Contact form on https://www.braner.com/contact blocked by CleanTalk Anti-Spam (IP restriction).',
    log: 'Attempted submission on https://www.braner.com/contact - rejected by CleanTalk Anti-Spam.'
  },
  {
    id: 1603,
    status: 'contacted',
    notes: 'Machine shop. Address: 4520 W Addison St, Chicago, IL 60641. | Successfully submitted Wix contact form on https://www.slidematicproducts.com/. Backend confirmed HTTP 200 (submissionId: cb9f7d90-b01b-46cb-843c-81bb5d5a074a).',
    log: 'Successfully submitted Wix contact form on https://www.slidematicproducts.com/ (submissionId: cb9f7d90-b01b-46cb-843c-81bb5d5a074a).'
  },
  {
    id: 1605,
    status: 'unable_to_reach',
    notes: 'Industrial equipment supplier. Address: 10512 United Pkwy, Schiller Park, IL 60176. | Checked https://www.azsupply.com/cms/contact-us - no online web contact form found (phone: 800-323-4511).',
    log: 'Checked https://www.azsupply.com/ - no online web contact form found.'
  },
  {
    id: 1606,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: 3900 W Palmer St, Chicago, IL 60647. | Contact page https://www.laystrom.com/contact/ timed out and protected by Google reCAPTCHA.',
    log: 'Contact page https://www.laystrom.com/contact/ timed out / reCAPTCHA protected.'
  },
  {
    id: 1607,
    status: 'unable_to_reach',
    notes: 'Coin operated laundry equipment supplier. Address: 5519 W Montrose Ave, Chicago, IL 60641. | Ninja form on https://dteci.com/equipment-inquiries/ blocked by Google reCAPTCHA.',
    log: 'Inspected https://dteci.com/equipment-inquiries/ - blocked by Google reCAPTCHA.'
  },
  {
    id: 1608,
    status: 'unable_to_reach',
    notes: 'Machine shop. Address: Chicago, IL. | Contact form on https://advanceprintersmachine.com/ protected by Google reCAPTCHA v3.',
    log: 'Contact form on https://advanceprintersmachine.com/ protected by Google reCAPTCHA v3.'
  },
  {
    id: 1609,
    status: 'unable_to_reach',
    notes: 'Corporate office. Address: 6655 W Diversey Ave, Chicago, IL 60707. | Checked https://www.trianglepackage.com/contact - no active contact form found (phone: 800-621-4170).',
    log: 'Checked https://www.trianglepackage.com/contact - no active contact form found.'
  }
];

const updateStmt = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)');

for (const item of updates) {
  updateStmt.run(item.status, item.notes, item.id);
  logStmt.run(item.id, item.status === 'contacted' ? 'form_submission' : 'form_inspection', item.log);
  console.log(`Updated Lead #${item.id} -> ${item.status}`);
}

console.log('All Batch 5 leads successfully updated in DB.');
