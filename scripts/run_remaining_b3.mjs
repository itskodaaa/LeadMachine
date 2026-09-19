import puppeteer from 'puppeteer';
import fs from 'fs';
import db from './db.mjs';

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

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

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

const remainingLeads = [
  { id: 253, name: 'KD Construction Of Florida, LLC.', url: 'https://kdconstruction.us' },
  { id: 256, name: 'Hulse Construction Group', url: 'https://hulseconstructiongroup.com' },
  { id: 257, name: 'H2P Construction Inc', url: 'https://h2pconstruction.com' },
  { id: 258, name: 'Lavi Construction', url: 'https://lavigc.com' },
  { id: 259, name: 'Steel & Stone Construction LLC', url: 'https://steelandstoneconstruction.com' },
  { id: 260, name: 'Exo Construction Group Inc.', url: 'https://exoconstruction.net' }
];

async function runRemaining() {
  console.log('Launching single Chromium browser instance...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800', '--disable-dev-shm-usage']
  });

  for (const lead of remainingLeads) {
    console.log(`\n=================== PROCESSING LEAD #${lead.id}: ${lead.name} ===================`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      let loaded = false;
      for (const u of [lead.url, lead.url.replace('https://', 'http://'), lead.url + '/contact', lead.url + '/contact-us']) {
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
        await page.close();
        continue;
      }

      console.log(`#${lead.id}: Loaded ${page.url()}`);
      await new Promise(r => setTimeout(r, 2500));

      // Inspect forms and contact links
      let hasForm = await page.evaluate(() => {
        return document.querySelectorAll('input:not([type="hidden"]), textarea').length >= 2;
      });

      if (!hasForm) {
        const contactLink = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          const found = links.find(a => /contact|inquir|quote|touch|estimate/i.test(a.innerText) || /contact|inquir|quote/i.test(a.href));
          return found ? found.href : null;
        });

        if (contactLink && contactLink !== page.url()) {
          console.log(`#${lead.id}: Navigating to contact page: ${contactLink}`);
          try {
            await page.goto(contactLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2500));
            hasForm = await page.evaluate(() => document.querySelectorAll('input:not([type="hidden"]), textarea').length >= 2);
          } catch (e) {}
        }
      }

      if (!hasForm) {
        console.log(`#${lead.id}: No online contact form found`);
        saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: No online web contact form found`);
        await page.close();
        continue;
      }

      // Check captchas
      const captchaDetected = await page.evaluate(() => {
        const caps = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
        return caps.length > 0;
      });

      if (captchaDetected) {
        console.log(`#${lead.id}: Captcha challenge detected`);
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Autofilled; blocked by Captcha Challenge)`);
        await page.close();
        continue;
      }

      // Fill form
      console.log(`#${lead.id}: Autofilling form...`);
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        for (const el of inputs) {
          const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
          const name = (el.getAttribute('name') || '').toLowerCase();
          const id = (el.getAttribute('id') || '').toLowerCase();
          const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
          const combined = `${name} ${id} ${placeholder}`;

          if (combined.includes('hp') || combined.includes('honeypot') || combined.includes('alt_s') || combined.includes('ak_hp')) continue;

          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail')) {
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
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, OUTREACH_PROFILE);

      await new Promise(r => setTimeout(r, 1000));

      // Click submit
      console.log(`#${lead.id}: Submitting form...`);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a.button'));
        const sub = buttons.find(b => {
          const txt = (b.innerText || b.value || '').toLowerCase();
          const type = (b.getAttribute('type') || '').toLowerCase();
          return type === 'submit' || txt.includes('submit') || txt.includes('send') || txt.includes('get in touch') || txt.includes('contact');
        });
        if (sub) {
          sub.click();
        } else {
          const f = document.querySelector('form');
          if (f) f.requestSubmit ? f.requestSubmit() : f.submit();
        }
      });

      await new Promise(r => setTimeout(r, 6000));

      const verification = await page.evaluate(() => {
        const body = document.body ? document.body.innerText.toLowerCase() : '';
        const alerts = Array.from(document.querySelectorAll('.alert, .toast, .swal2-title, .elementor-message, .wpcf7-response-output, [role="alert"]')).map(a => a.innerText.toLowerCase()).join(' ');
        const text = `${body} ${alerts}`;

        const successWords = ['thank you', 'thanks for', 'message has been sent', 'we have received', 'will get back to you', 'submission was successful', 'in touch shortly', 'sent successfully', 'we will be in touch'];
        for (const w of successWords) {
          if (text.includes(w)) return { success: true, phrase: w, alert: alerts.substring(0, 150) };
        }
        return { success: false, bodySnippet: body.substring(0, 300), alert: alerts.substring(0, 150) };
      });

      console.log(`#${lead.id} Verification:`, verification);

      if (verification.success) {
        console.log(`✅ #${lead.id} CONFIRMED: "${verification.phrase}"`);
        saveLeadResult(lead.id, 'contacted', `Contact form: ${page.url()} (Verified: ${verification.alert || verification.phrase})`);
      } else {
        console.log(`⚠️ #${lead.id} Unconfirmed`);
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Submission unconfirmed post-submit)`);
      }

    } catch (e) {
      console.log(`Error on #${lead.id}:`, e.message);
      saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${e.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log('\nAll remaining leads processed!');
}

runRemaining();
