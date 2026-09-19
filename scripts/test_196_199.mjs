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
  phone: '7085683708',
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

async function test196(browser) {
  console.log('\n--- Testing #196: Skyscraper Construction ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://skyscrapercm.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Type into fields directly
    await page.waitForSelector('input[name="name"]', { timeout: 5000 });
    await page.type('input[name="name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="phone"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="message"]', OUTREACH_PROFILE.message);

    console.log('Submitting 196...');
    await page.click('button[type="submit"]');

    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return {
        textSlice: text.slice(0, 500),
        isSuccess: text.toLowerCase().includes('thank') || text.toLowerCase().includes('received') || text.toLowerCase().includes('success') || text.toLowerCase().includes('sent')
      };
    });

    console.log('196 result:', result);
    if (result.isSuccess) {
      saveLeadResult(196, 'contacted', 'Contact form: https://skyscrapercm.com/contact/ (Autofilled & verified: submission successful)');
    }
  } catch (err) {
    console.error('196 error:', err.message);
  } finally {
    await page.close();
  }
}

async function test199(browser) {
  console.log('\n--- Testing #199: Sierra Commercial Construction, Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://sierracc.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('Opened https://sierracc.com/contact/');
    const info = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({ name: i.name, type: i.type, placeholder: i.placeholder }))
      }));
      return forms;
    });
    console.log('Forms for 199:', JSON.stringify(info, null, 2));
  } catch (err) {
    console.error('199 error:', err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await test196(browser);
  await test199(browser);

  await browser.close();
}

main();
