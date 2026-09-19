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

async function test446() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('contact-form-7') && res.request().method() === 'POST') {
      try {
        const text = await res.text();
        console.log(`[#446 CF7 Response] status ${res.status()}, body: ${text}`);
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://maxprecisionmfg.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Type into inputs directly
    const inputs = await page.$$('input[name="your-name"], input[name="your-email"], input[name="your-tel"], input[name="your-subject"], textarea[name="your-message"]');
    console.log('Found inputs:', inputs.length);
    
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="your-tel"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="your-subject"]', 'Exploring Collaboration Opportunities');
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    console.log('Submitting #446...');
    await page.click('input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const confirmed = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output');
      return resp ? resp.innerText : null;
    });

    console.log('[#446 Result]:', confirmed);
    if (confirmed && (confirmed.toLowerCase().includes('thank') || confirmed.toLowerCase().includes('sent'))) {
      saveLeadResult(446, 'contacted', `Contact form: https://maxprecisionmfg.com/contact/ (Autofilled & verified: ${confirmed.trim()})`);
    }

  } catch (err) {
    console.error('446 error:', err.message);
  } finally {
    await browser.close();
  }
}

test446();
