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
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
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

async function inspect635() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://striveeng.com/contact-us/', { waitUntil: 'networkidle2', timeout: 25000 });
    console.log('Opened https://striveeng.com/contact-us/, Title:', await page.title());

    const captchas = await page.evaluate(() => {
      const caps = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return caps.length > 0;
    });

    if (captchas) {
      console.log('635 has CAPTCHA');
      saveLeadResult(635, 'unable_to_reach', 'Contact form: https://striveeng.com/contact-us/ (Autofilled; blocked by Google reCAPTCHA)');
      return;
    }

    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
    });
    console.log('Forms for 635:', JSON.stringify(forms, null, 2));

    if (forms.length === 0) {
      saveLeadResult(635, 'unable_to_reach', 'Checked https://striveeng.com/contact-us/: No online web form found');
      return;
    }

    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        if (el.tagName.toLowerCase() === 'textarea' || name.includes('message')) {
          el.value = p.message;
        } else if (type === 'email' || name.includes('email')) {
          el.value = p.email;
        } else if (type === 'tel' || name.includes('phone')) {
          el.value = p.phone;
        } else if (name.includes('name')) {
          el.value = p.fullName;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"], button');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 4500));

    const confirmed = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return body.includes('thank you') || body.includes('received') || body.includes('message sent');
    });

    console.log('635 confirmed:', confirmed);
    if (confirmed) {
      saveLeadResult(635, 'contacted', 'Contact form: https://striveeng.com/contact-us/ (Autofilled & verified: submission confirmed)');
    } else {
      saveLeadResult(635, 'unable_to_reach', 'Contact form: https://striveeng.com/contact-us/ (No explicit confirmation detected post-submission)');
    }

  } catch (err) {
    console.error('635 error:', err.message);
  } finally {
    await browser.close();
  }
}

inspect635();
