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

async function process398() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('admin-ajax.php') || res.request().method() === 'POST') {
      try {
        const text = await res.text();
        console.log(`[#398 AJAX Response] status: ${res.status()} body: ${text.slice(0, 300)}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://nikkahomeusa.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    // Fill fields
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        if (el.tagName.toLowerCase() === 'textarea' || name.includes('message') || name.includes('048b344')) {
          el.value = p.message;
        } else if (type === 'email' || name.includes('email') || name.includes('dbbed03')) {
          el.value = p.email;
        } else if (type === 'tel' || name.includes('phone') || name.includes('aac5898')) {
          el.value = p.phone;
        } else if (name.includes('name')) {
          el.value = p.fullName;
        } else if (name.includes('b678a9e')) {
          el.value = p.subject;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    console.log('Submitting #398...');
    await page.click('.elementor-form button[type="submit"]');

    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('.elementor-message-success, .elementor-message');
      if (successEl) return successEl.innerText;
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      if (body.includes('sent') || body.includes('thank you') || body.includes('successful')) return 'Submission success detected in body';
      return null;
    });

    console.log('[#398 Result]:', result);
    if (result) {
      saveLeadResult(398, 'contacted', `Contact form: https://nikkahomeusa.com/ (Autofilled & verified: ${result.trim()})`);
    } else {
      saveLeadResult(398, 'unable_to_reach', 'Contact form: https://nikkahomeusa.com/ (No explicit confirmation detected post-submission)');
    }
  } catch (err) {
    console.error('398 error:', err.message);
  } finally {
    await browser.close();
  }
}

process398();
