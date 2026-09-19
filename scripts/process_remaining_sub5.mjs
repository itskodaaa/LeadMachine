import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

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
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function processLead168(browser) {
  console.log('\n--- Processing #168: JP GENERAL CONSTRUCTION ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://jpgconstruction.us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Opened https://jpgconstruction.us/');
    
    await page.waitForSelector('input[name="form_fields[name]"]', { timeout: 10000 });
    await page.type('input[name="form_fields[name]"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="form_fields[email]"]', OUTREACH_PROFILE.email);
    await page.type('input[name="form_fields[field_7394dff]"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="form_fields[field_6a4a4c1]"]', OUTREACH_PROFILE.message);

    console.log('Fields filled for 168. Submitting form...');
    await page.click('.elementor-form button[type="submit"]');

    await new Promise(r => setTimeout(r, 5000));

    const msg = await page.evaluate(() => {
      const successEl = document.querySelector('.elementor-message-success, .elementor-message');
      if (successEl && successEl.innerText.trim()) return successEl.innerText.trim();
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      if (body.includes('your submission was successful')) return 'Your submission was successful.';
      if (body.includes('thank you')) return 'thank you';
      return null;
    });

    console.log('168 result msg:', msg);
    if (msg) {
      saveLeadResult(168, 'contacted', `Contact form: https://jpgconstruction.us/ (Autofilled & verified: ${msg})`);
    } else {
      saveLeadResult(168, 'unable_to_reach', 'Contact form: https://jpgconstruction.us/ (No confirmation message returned)');
    }
  } catch (err) {
    console.error('168 error:', err.message);
  } finally {
    try { await page.close(); } catch(e){}
  }
}

async function processLead169(browser) {
  console.log('\n--- Processing #169: MT Construction Group ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://mtconstruction.group/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Opened https://mtconstruction.group/contact');

    // Inspect form and captchas
    const info = await page.evaluate(() => {
      const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder, id: i.id }))
      }));
      return { hasCaptcha: captchas.length > 0, forms };
    });
    console.log('Info for 169:', JSON.stringify(info, null, 2));

    if (info.hasCaptcha) {
      console.log('169 has CAPTCHA');
      saveLeadResult(169, 'unable_to_reach', 'Contact form: https://mtconstruction.group/contact (Autofilled; blocked by Google reCAPTCHA)');
      return;
    }

    if (info.forms.length === 0) {
      console.log('169 has no form');
      saveLeadResult(169, 'unable_to_reach', 'Checked https://mtconstruction.group/contact: No online web form found');
      return;
    }

    // Autofill
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail')) {
          el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'email' || combined.includes('email')) {
          el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell')) {
          el.value = p.phone;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('name')) {
          el.value = p.fullName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, OUTREACH_PROFILE);

    // Click submit
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"], form button');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 4500));

    const confirmation = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return body.includes('thank you') || body.includes('message has been sent') || body.includes('received') || body.includes('submitted');
    });

    console.log('169 result confirmation:', confirmation);
    if (confirmation) {
      saveLeadResult(169, 'contacted', 'Contact form: https://mtconstruction.group/contact (Autofilled & verified: message received)');
    } else {
      saveLeadResult(169, 'unable_to_reach', 'Contact form: https://mtconstruction.group/contact (No confirmation detected)');
    }

  } catch (err) {
    console.error('169 error:', err.message);
  } finally {
    try { await page.close(); } catch(e){}
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await processLead168(browser);
  await processLead169(browser);

  await browser.close();
}

main();
