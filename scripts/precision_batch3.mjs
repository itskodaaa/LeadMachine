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

const batch3Leads = [
  { id: 250, name: 'Lunacon Construction Group', url: 'https://lunaconcorp.com/contact-us/' },
  { id: 252, name: 'Cuesta Construction', url: 'https://cuestaconstruction.com/contact/' },
  { id: 253, name: 'KD Construction Of Florida, LLC.', url: 'https://kdconstruction.us' },
  { id: 256, name: 'Hulse Construction Group', url: 'https://hulseconstructiongroup.com' },
  { id: 257, name: 'H2P Construction Inc', url: 'https://h2pconstruction.com' },
  { id: 258, name: 'Lavi Construction', url: 'https://lavigc.com' },
  { id: 259, name: 'Steel & Stone Construction LLC', url: 'https://steelandstoneconstruction.com' },
  { id: 260, name: 'Exo Construction Group Inc.', url: 'https://exoconstruction.net' }
];

async function runBatch3() {
  for (const lead of batch3Leads) {
    console.log(`\n=================== PROCESSING LEAD #${lead.id}: ${lead.name} ===================`);
    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: CHROME_BIN,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      let loaded = false;
      let targetUrl = lead.url;
      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        loaded = true;
      } catch (e) {
        if (targetUrl.includes('https://')) {
          try {
            await page.goto(targetUrl.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 });
            loaded = true;
          } catch (err) {}
        }
      }

      if (!loaded) {
        console.log(`#${lead.id}: Site Inaccessible`);
        saveLeadResult(lead.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
        await browser.close();
        continue;
      }

      console.log(`#${lead.id}: Successfully loaded ${page.url()}`);
      await new Promise(r => setTimeout(r, 3000));

      // Inspect DOM for forms, contact links, captchas
      const pageData = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => {
          const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select, button')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.getAttribute('type'),
            name: i.getAttribute('name'),
            id: i.getAttribute('id'),
            placeholder: i.getAttribute('placeholder'),
            required: i.required,
            className: i.className
          }));
          return { id: f.id, action: f.action, inputs };
        });

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          className: c.className,
          src: c.getAttribute('src')
        }));

        const contactLinks = Array.from(document.querySelectorAll('a[href]'))
          .map(a => ({ text: a.innerText.trim(), href: a.href }))
          .filter(a => /contact|inquir|quote|touch|estimate/i.test(a.text) || /contact|inquir|quote/i.test(a.href));

        return { forms, captchas, contactLinks: contactLinks.slice(0, 5) };
      });

      console.log(`#${lead.id} Form count:`, pageData.forms.length, 'Captchas:', pageData.captchas.length);

      // If no form on current page and contact links exist, navigate to contact page
      if (pageData.forms.filter(f => f.inputs.length >= 2).length === 0 && pageData.contactLinks.length > 0) {
        const cLink = pageData.contactLinks[0].href;
        if (cLink !== page.url()) {
          console.log(`#${lead.id}: Navigating to contact link: ${cLink}`);
          try {
            await page.goto(cLink, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await new Promise(r => setTimeout(r, 3000));
          } catch (err) {}
        }
      }

      // Check captchas
      const hasCaptcha = await page.evaluate(() => {
        return document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]').length > 0;
      });

      if (hasCaptcha) {
        console.log(`#${lead.id}: Blocked by Captcha Challenge`);
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Autofilled; blocked by Captcha Challenge)`);
        await browser.close();
        continue;
      }

      // Check form fields
      const hasInputs = await page.evaluate(() => {
        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea');
        return inputs.length >= 2;
      });

      if (!hasInputs) {
        console.log(`#${lead.id}: No online contact form found`);
        saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: No online web contact form found`);
        await browser.close();
        continue;
      }

      // Fill form carefully
      console.log(`#${lead.id}: Filling form...`);
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        for (const el of inputs) {
          const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
          const name = (el.getAttribute('name') || '').toLowerCase();
          const id = (el.getAttribute('id') || '').toLowerCase();
          const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
          const combined = `${name} ${id} ${placeholder}`;

          // Avoid honeypots!
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
      console.log(`#${lead.id}: Clicking submit...`);
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
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Submission unconfirmed post-submit: ${verification.alert || 'No response'})`);
      }

      await browser.close();
    } catch (err) {
      console.log(`❌ #${lead.id} Exception: ${err.message}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${err.message}`);
      if (browser) {
        try { await browser.close(); } catch (e) {}
      }
    }
  }
}

runBatch3();
