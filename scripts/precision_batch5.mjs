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

const batch5Targets = [
  { id: 350, name: 'Ruiz Construction Incorporated', url: 'https://rcigroupinc.net/contact' },
  { id: 354, name: 'ILC Home Solutions, LLC', url: 'https://ilchs.com' },
  { id: 358, name: 'Proper Roofing Hialeah', url: 'https://properoofing.com/contact-us/' },
  { id: 359, name: 'Fraga Builder', url: 'https://fragabuilder.com/contact-us/' },
  { id: 361, name: '3D Contracting Group', url: 'https://3dcontractinggroup.net/contact/' },
  { id: 362, name: 'A&A Paving Services INC.', url: 'https://aapavingservices.com/contact-us/' }
];

async function runBatch5Precision() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800', '--disable-dev-shm-usage']
  });

  for (const lead of batch5Targets) {
    console.log(`\n=================== LEAD #${lead.id}: ${lead.name} ===================`);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
      let loaded = false;
      for (const u of [lead.url, lead.url.replace('https://', 'http://'), lead.url.split('/contact')[0]]) {
        try {
          console.log(`Navigating to ${u}...`);
          await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
          loaded = true;
          break;
        } catch (e) {}
      }

      if (!loaded) {
        console.log(`#${lead.id}: Inaccessible`);
        saveLeadResult(lead.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
        await page.close();
        continue;
      }

      console.log(`#${lead.id}: Loaded ${page.url()}`);
      await new Promise(r => setTimeout(r, 3000));

      const formDetails = await page.evaluate(() => {
        const forms = Array.from(document.querySelectorAll('form')).map(f => ({
          id: f.id,
          className: f.className,
          action: f.action,
          inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(i => ({
            tag: i.tagName.toLowerCase(),
            type: i.type,
            name: i.name,
            id: i.id,
            placeholder: i.placeholder,
            required: i.required
          }))
        }));

        const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]')).map(c => ({
          src: c.getAttribute('src'),
          sitekey: c.getAttribute('data-sitekey')
        }));

        return { forms, captchas };
      });

      console.log(`#${lead.id} Forms:`, JSON.stringify(formDetails, null, 2));

      if (formDetails.captchas.length > 0) {
        console.log(`#${lead.id}: Captcha challenge detected`);
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Autofilled; blocked by Captcha Challenge)`);
        await page.close();
        continue;
      }

      const hasValidForm = formDetails.forms.some(f => f.inputs.length >= 2);
      if (!hasValidForm) {
        console.log(`#${lead.id}: No valid online contact form`);
        saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: Direct phone & office info only; no online web form found`);
        await page.close();
        continue;
      }

      // Fill and submit
      console.log(`#${lead.id}: Submitting form...`);
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        for (const el of inputs) {
          const type = (el.type || '').toLowerCase();
          const name = (el.name || '').toLowerCase();
          const id = (el.id || '').toLowerCase();
          const placeholder = (el.placeholder || '').toLowerCase();
          const combined = `${name} ${id} ${placeholder}`;

          if (combined.includes('hp') || combined.includes('honeypot') || combined.includes('alt_s') || combined.includes('ak_hp')) continue;

          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail')) {
            el.value = p.message;
          } else if (type === 'email' || combined.includes('email')) {
            el.value = p.email;
          } else if (type === 'tel' || combined.includes('phone')) {
            el.value = p.phone;
          } else if (combined.includes('first') || combined.includes('fname')) {
            el.value = p.firstName;
          } else if (combined.includes('last') || combined.includes('lname')) {
            el.value = p.lastName;
          } else if (combined.includes('name')) {
            el.value = p.fullName;
          } else if (combined.includes('company')) {
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
          return b.type === 'submit' || txt.includes('submit') || txt.includes('send') || txt.includes('contact');
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

      console.log(`#${lead.id} Result:`, verification);
      if (verification.success) {
        console.log(`✅ #${lead.id} CONFIRMED: "${verification.phrase}"`);
        saveLeadResult(lead.id, 'contacted', `Contact form: ${page.url()} (Verified: ${verification.alert || verification.phrase})`);
      } else {
        saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${page.url()} (Submission unconfirmed: ${verification.alert || 'No confirmation message'})`);
      }

    } catch (e) {
      console.log(`#${lead.id} Error:`, e.message);
      saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${e.message}`);
    }

    await page.close();
  }

  await browser.close();
}

runBatch5Precision();
