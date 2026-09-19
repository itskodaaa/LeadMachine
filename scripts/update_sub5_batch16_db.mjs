import db from './db.mjs';

const updates = [
  {
    id: 4827,
    status: 'unable_to_reach',
    note: 'Checked https://eelectricsf.com/contact.html: Form is a WhatsApp redirect (id="whatsapp-estimate-form") that executes wa.me link to WhatsApp chat, not an online web submission form. Direct email: anibal@eelectricllc.com, phone: 305-870-3238.'
  },
  {
    id: 4828,
    status: 'unable_to_reach',
    note: 'Checked https://jalrw.com/: Static website with no online web contact form. Direct phone: (305) 594-0660, fax: (305) 594-0907.'
  },
  {
    id: 4829,
    status: 'unable_to_reach',
    note: 'Checked https://bdelectriccorp.com: Domain SSL error (ERR_CERT_COMMON_NAME_INVALID) and redirects to linknowmedia.work signup page (expired hosting). No web form found.'
  },
  {
    id: 4830,
    status: 'unable_to_reach',
    note: 'Checked https://agelectricalengineer.com/: Single-page site with no web contact form. Contact buttons link to empty anchor. Direct phone: 305-905-2741, email: info@agelectricalengineer.com.'
  },
  {
    id: 4831,
    status: 'unable_to_reach',
    note: 'Checked https://switchgearflorida.com/contact: Form found and submitted with outreach profile, but server returned HTTP 403 Forbidden (WAF/firewall blocking automated POST).'
  },
  {
    id: 4832,
    status: 'unable_to_reach',
    note: 'Checked https://electrumengineering.com: Site inaccessible due to net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH (SSL configuration broken).'
  },
  {
    id: 4834,
    status: 'unable_to_reach',
    note: 'Checked https://labraservices.com: Site inaccessible due to net::ERR_SSL_PROTOCOL_ERROR (SSL handshake failed).'
  },
  {
    id: 4835,
    status: 'unable_to_reach',
    note: 'Checked https://www.becaielectric.com/: Form submitted with all required fields and consent checkbox, but form is misconfigured with client GET action reloading homepage with query parameters; no backend message confirmation. Direct phone: 305-251-8788, email: info@becaielectric.com.'
  },
  {
    id: 4837,
    status: 'unable_to_reach',
    note: 'Checked https://piece-makers.com/: Contact Form 7 submitted with profile; rejected by server with status: "spam" / reCAPTCHA v3 automated submission block.'
  },
  {
    id: 4838,
    status: 'unable_to_reach',
    note: 'Checked https://toolplacecorp.com/contact.html: No online web contact form found; static contact page with sales@toolplacecorp.com and phone +1 (305) 591 5650.'
  }
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT notes FROM leads WHERE id = ?');

db.transaction(() => {
  for (const item of updates) {
    const current = getStmt.get(item.id);
    const updatedNotes = current?.notes ? `${current.notes} | ${item.note}` : item.note;
    updateStmt.run(updatedNotes, item.status, item.id);
    logStmt.run(item.id, 'bounced', item.note);
  }
})();

console.log('Successfully committed updates for all 10 leads.');
