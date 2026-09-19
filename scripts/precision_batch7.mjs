import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  phoneClean: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your precision machining and engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

const batch7Leads = [
  { id: 457, name: 'NorCal Engineering Inc.', url: 'https://norcalcnc.com' },
  { id: 458, name: 'N M Machining Inc', url: 'https://nmmachining.com' },
  { id: 459, name: 'NorCal Manufacturing', url: 'https://norcal.co' },
  { id: 460, name: 'Influx Labs CNC Machining', url: 'https://influxxlabs.com' },
  { id: 461, name: 'Yuhas Tooling & Machining', url: 'https://yuhasmachining.com' },
  { id: 463, name: 'Optima Precision', url: 'https://optimaprecision.com' },
  { id: 464, name: 'Delta Machine', url: 'https://deltamachine.com' },
  { id: 466, name: 'Space Machining, inc.', url: 'https://spacemachining.com' },
  { id: 483, name: 'G.I.S Contracting LLC', url: 'https://giscontracting.com' },
  { id: 600, name: 'DCI Engineers', url: 'https://dci-engineers.com' }
];

async function runBatch7() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800', '--disable-dev-shm-usage']
  });

  for (const lead of batch7Leads) {
    console.log(`\n=================== PROCESSING LEAD #${lead.id}: ${lead.name} ===================`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      let loaded = false;
      for (const u of [lead.url, lead.url.replace('https://', 'http://')]) {
        try {
          console.log(`Navigating to ${u}...`);
          await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
          loaded = true;
          break;
        } catch (e) {}
      }

      if (!loaded) {
        console.log(`#${lead.id}: Site Inaccessible`);
        saveLeadResult(lead.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
        try { await page.close(); } catch (e) {}
        continue;
      }

      console.log(`#${lead.id}: Loaded ${page.url()} | Title: ${await page.title()}`);
      await new Promise(r => setTimeout(r, 2500));

      // Check contact link if no inputs on home page
      let hasInputs = await page.evaluate(() => document.querySelectorAll('input:not([type="hidden"]), textarea').length >= 2);
      if (!hasInputs) {
        const cLink = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          const m = links.find(a => /contact|inquir|quote|rfq|touch/i.test(a.innerText) || /contact|inquir|quote|rfq/i.test(a.href));
          return m ? m.href : null;
        });
        if (cLink && cLink !== page.url()) {
          console.log(`#${lead.id}: Navigating to contact link ${cLink}`);
          try {
            await page.goto(cLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2500));
            hasInputs = await page.evaluate(() => document.querySelectorAll('input:not([type="hidden"]), textarea').length >= 2);
          } catch (e) {}
        }
      }

      if (!hasInputs) {
        console.log(`#${lead.id}: No online contact form found`);
        saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: No online web contact form found`);
        try { await page.close(); } catch (e) {}
        continue;
      }

      // Check captchas
      const captcha = await page.evaluate(() => {
        const caps = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
        return caps.length > 0;
      });

      if (captcha) {
        console.log(`#${lead.id}: Captcha challenge detected`);
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Autofilled; blocked by Captcha Challenge)`);
        try { await page.close(); } catch (e) {}
        continue;
      }

      // Fill form
      console.log(`#${lead.id}: Autofilling form...`);
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        for (const el of inputs) {
          const type = (el.type || '').toLowerCase();
          const name = (el.name || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          const placeholder = (el.placeholder || '').toLowerCase();
          const combined = `${name} ${id} ${placeholder}`;

          if (combined.includes('hp') || combined.includes('honeypot') || combined.includes('alt_s') || combined.includes('ak_hp')) continue;

          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('rfq')) {
            el.value = p.message;
          } else if (type === 'email' || combined.includes('email')) {
            el.value = p.email;
          } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell')) {
            el.value = p.phone;
          } else if (combined.includes('first') || combined.includes('fname')) {
            el.value = p.firstName;
          } else if (combined.includes('last') || combined.includes('lname')) {
            el.value = p.lastName;
          } else if (combined.includes('name')) {
            el.value = p.fullName;
          } else if (combined.includes('company') || combined.includes('business')) {
            el.value = p.company;
          } else if (combined.includes('subject')) {
            el.value = p.subject;
          } else if (el.tagName.toLowerCase() === 'select' && el.options.length > 1) {
            el.selectedIndex = 1;
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        const sub = buttons.find(b => {
          const txt = (b.innerText || b.value || '').toLowerCase();
          return b.type === 'submit' || txt.includes('submit') || txt.includes('send') || txt.includes('rfq') || txt.includes('contact');
        });
        if (sub) sub.click();
      }, OUTREACH_PROFILE);

      await new Promise(r => setTimeout(r, 6000));

      const verification = await page.evaluate(() => {
        const body = document.body ? document.body.innerText.toLowerCase() : '';
        const alerts = Array.from(document.querySelectorAll('.alert, .toast, .swal2-title, .elementor-message, .wpcf7-response-output, [role="alert"]')).map(a => a.innerText.toLowerCase()).join(' ');
        const text = `${body} ${alerts}`;

        const successWords = ['thank you', 'thanks for', 'message has been sent', 'we have received', 'will get back to you', 'submission was successful', 'in touch shortly', 'sent successfully', 'we will be in touch'];
        for (const w of successWords) {
          if (text.includes(w)) return { success: true, phrase: w, alert: alerts.substring(0, 150) };
        }
        return { success: false, bodySnippet: body.substring(0, 250), alert: alerts.substring(0, 150) };
      });

      console.log(`#${lead.id} Verification:`, verification);

      if (verification.success) {
        console.log(`✅ #${lead.id} CONFIRMED: "${verification.phrase}"`);
        saveLeadResult(lead.id, 'contacted', `Contact form: ${page.url()} (Verified: ${verification.alert || verification.phrase})`);
      } else {
        console.log(`⚠️ #${lead.id} Unconfirmed`);
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Submission unconfirmed post-submit: ${verification.alert || 'No response message'})`);
      }

    } catch (e) {
      console.log(`Error on #${lead.id}:`, e.message);
      saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${e.message}`);
    }

    try { await page.close(); } catch (e) {}
  }

  await browser.close();
}

runBatch7();
