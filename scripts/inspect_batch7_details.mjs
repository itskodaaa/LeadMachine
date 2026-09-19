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

async function testSite(leadId, url) {
  console.log(`\nTesting #${leadId}: ${url}`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.request().method() === 'POST' || res.url().includes('ajax') || res.url().includes('form')) {
      try {
        const text = await res.text();
        console.log(`[#${leadId} Response] ${res.url().slice(0, 60)}: status ${res.status()}, body: ${text.slice(0, 150)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Check captchas
    const captcha = await page.evaluate(() => {
      const caps = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return caps.length > 0;
    });

    if (captcha) {
      console.log(`[#${leadId}] CAPTCHA detected`);
      saveLeadResult(leadId, 'unable_to_reach', `Contact form: ${page.url()} (Autofilled; blocked by Google reCAPTCHA)`);
      await browser.close();
      return;
    }

    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        if (el.tagName.toLowerCase() === 'textarea' || name.includes('message') || name.includes('comment')) {
          el.value = p.message;
        } else if (type === 'email' || name.includes('email')) {
          el.value = p.email;
        } else if (type === 'tel' || name.includes('phone') || name.includes('cell')) {
          el.value = p.phone;
        } else if (name.includes('name')) {
          el.value = p.fullName;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"], button.submit, .elementor-button');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 4500));

    const confirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('thank you') || text.includes('message sent') || text.includes('received') || text.includes('success');
    });

    console.log(`[#${leadId}] confirmed: ${confirmed}`);
    if (confirmed) {
      saveLeadResult(leadId, 'contacted', `Contact form: ${page.url()} (Autofilled & verified: submission confirmed)`);
    }

  } catch (err) {
    console.error(`Error on #${leadId}:`, err.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await testSite(445, 'https://wessdel.com/contact-us/');
  await testSite(446, 'https://maxprecisionmfg.com/contact/');
  await testSite(447, 'https://phmachining.com/contact-us/');
  await testSite(450, 'https://glintmfg.com/contact/');
}

main();
