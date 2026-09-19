import db from './db.mjs';

const updates = [
  {
    id: 1903,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: Miami, FL. | Duda form on https://griffithsmetal.com/contact-us dynamically invokes Google reCAPTCHA.',
    log: 'Duda form on https://griffithsmetal.com/contact-us dynamically invokes Google reCAPTCHA.'
  },
  {
    id: 1914,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: Miami, FL. | Duda form on https://jybaluminumworks.com/ dynamically invokes Google reCAPTCHA.',
    log: 'Duda form on https://jybaluminumworks.com/ dynamically invokes Google reCAPTCHA.'
  },
  {
    id: 1919,
    status: 'unable_to_reach',
    notes: 'Welder. Address: Miami, FL. | Checked https://productive-weldingworkshop.com/ - no online web form found.',
    log: 'Checked https://productive-weldingworkshop.com/ - no online web form found.'
  },
  {
    id: 1935,
    status: 'unable_to_reach',
    notes: 'Steel fabricator. Address: 3274 NW 38th St, Miami, FL. | Framer form on https://unitedamw.com/contact-us returns HTTP 400 "Form config not found" (unconfigured backend).',
    log: 'Framer form on https://unitedamw.com/contact-us returns HTTP 400 "Form config not found".'
  },
  {
    id: 1936,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: Miami, FL. | Checked https://majorsmetal.com/ - no online contact form found.',
    log: 'Checked https://majorsmetal.com/ - no online contact form found.'
  },
  {
    id: 1937,
    status: 'unable_to_reach',
    notes: 'Roofing contractor. Address: Miami, FL. | Protected by Cloudflare Turnstile.',
    log: 'Protected by Cloudflare Turnstile.'
  },
  {
    id: 1946,
    status: 'contacted',
    notes: 'Metal fabricator. Address: Miami, FL. | Wix form on https://metal-florida.com/ successfully submitted with Pamela Jameson profile. Wix backend confirmed HTTP 200 (submissionId: a6969383-4b95-44d9-b62e-b44d54aac379).',
    log: 'Wix form on https://metal-florida.com/ submitted successfully (submissionId: a6969383-4b95-44d9-b62e-b44d54aac379).'
  },
  {
    id: 1951,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: Miami, FL. | Site https://jjartmetalcorp.com/ timed out / inaccessible.',
    log: 'Site https://jjartmetalcorp.com/ timed out / inaccessible.'
  },
  {
    id: 1966,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: Miami, FL. | GoDaddy form on https://madcaprailsandcontainers.godaddysites.com/ protected by Google reCAPTCHA v3.',
    log: 'GoDaddy form on https://madcaprailsandcontainers.godaddysites.com/ protected by Google reCAPTCHA v3.'
  },
  {
    id: 1969,
    status: 'unable_to_reach',
    notes: 'Metal fabricator. Address: Miami, FL. | Zyro form on https://mrbaezmetal.com/ is a dummy unconfigured form (method="get" reloading page).',
    log: 'Zyro form on https://mrbaezmetal.com/ is a dummy unconfigured GET form.'
  }
];

const updateStmt = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)');

for (const item of updates) {
  updateStmt.run(item.status, item.notes, item.id);
  logStmt.run(item.id, item.status === 'contacted' ? 'form_submission' : 'form_inspection', item.log);
  console.log(`Committed Lead #${item.id} -> ${item.status}`);
}

console.log('Batch 7 committed.');
