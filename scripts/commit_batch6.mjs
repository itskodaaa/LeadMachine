import db from './db.mjs';

const updates = [
  {
    id: 1768,
    status: 'unable_to_reach',
    notes: 'Machine shop. 5 stars. Address: 6733 Suva St B, Bell Gardens, CA 90201. | Form on https://sonomaind.com/ is protected by Google reCAPTCHA.',
    log: 'Contact form on https://sonomaind.com/ blocked by Google reCAPTCHA.'
  },
  {
    id: 1771,
    status: 'unable_to_reach',
    notes: 'Machine shop. 5 stars. Address: 2808 Supply Ave, Commerce, CA 90040. | Checked https://alloymachiningservices.com/contact.html - direct phone (323-726-8248) and email (info@alloymachiningservices.com) only, no online form.',
    log: 'Checked https://alloymachiningservices.com/contact.html - no online form found.'
  },
  {
    id: 1772,
    status: 'unable_to_reach',
    notes: 'Machine shop. 5 stars. Address: 7500 Deering Ave, Canoga Park, CA 91303. | Checked https://delgapro.com/ - direct phone link (818-887-0512) only, no online web form.',
    log: 'Checked https://delgapro.com/ - direct phone only, no web form.'
  },
  {
    id: 1773,
    status: 'unable_to_reach',
    notes: 'Machine shop. Address: 2605 Homestead Pl, Compton, CA 90220. | CF7 form on https://www.avalon.aero/contact/ blocked by Google reCAPTCHA (flagged as spam).',
    log: 'CF7 form on https://www.avalon.aero/contact/ blocked by Google reCAPTCHA.'
  },
  {
    id: 1774,
    status: 'contacted',
    notes: 'Machine shop. 5 stars. Address: 11814 Sheldon St, Sun Valley, CA 91352. | Contact form on https://agrazmachineshop.com/contact.html successfully submitted with Pamela Jameson profile. DOM confirmed: "thank you".',
    log: 'Form submitted on https://agrazmachineshop.com/contact.html - confirmed: "thank you".'
  },
  {
    id: 1777,
    status: 'contacted',
    notes: 'Machine shop. 3 stars. Address: 11950 Vose St, North Hollywood, CA 91605. | WPForms on https://ghprecision.com/contact-us/ successfully submitted with Pamela Jameson profile. Verified via HTTP 200 on admin-ajax.php and DOM confirmation: "Thanks for contacting us! We will be in touch with you shortly."',
    log: 'WPForms submitted on https://ghprecision.com/contact-us/ - confirmed via AJAX HTTP 200 & "Thanks for contacting us! We will be in touch with you shortly."'
  },
  {
    id: 1778,
    status: 'unable_to_reach',
    notes: 'Machine shop. Address: 7350 Greenbush Ave, North Hollywood, CA 91605. | https://marengineering.com/ hosts empty cPanel placeholder page (/cgi-sys/defaultwebpage.cgi), no active website or contact form.',
    log: 'https://marengineering.com/ is an empty placeholder page, no contact form.'
  },
  {
    id: 1779,
    status: 'unable_to_reach',
    notes: 'Machine shop. Address: 11152 Fleetwood St #10, Sun Valley, CA 91352. | GoDaddy contact form on https://avcnc.net/ protected by Google reCAPTCHA v3.',
    log: 'GoDaddy contact form on https://avcnc.net/ protected by Google reCAPTCHA v3.'
  },
  {
    id: 1781,
    status: 'unable_to_reach',
    notes: 'Machine shop. 5 stars. Address: 9550 Owensmouth Ave, Chatsworth, CA 91311. | Site connection dropped by Sucuri Cloudproxy WAF (navigation timeout).',
    log: 'Site connection dropped by Sucuri Cloudproxy WAF (navigation timeout).'
  },
  {
    id: 1783,
    status: 'unable_to_reach',
    notes: 'Machine shop. Address: Chatsworth, CA. | Checked https://lightsoutcnc.com/ - contact link points to mailto:info@lightsoutcnc.com, no web form.',
    log: 'Checked https://lightsoutcnc.com/ - mailto only, no online form.'
  }
];

const updateStmt = db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes) VALUES (?, ?, ?)');

for (const item of updates) {
  updateStmt.run(item.status, item.notes, item.id);
  logStmt.run(item.id, item.status === 'contacted' ? 'form_submission' : 'form_inspection', item.log);
  console.log(`Committed Lead #${item.id} -> ${item.status}`);
}

console.log('All Batch 6 leads committed successfully.');
