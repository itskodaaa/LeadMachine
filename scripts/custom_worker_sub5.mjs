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
    await page.goto('https://jpgconstruction.us/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('Opened https://jpgconstruction.us/');
    
    // Fill Elementor Form
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
      if (successEl) return successEl.innerText;
      if (document.body.innerText.includes('Your submission was successful')) return 'Your submission was successful';
      if (document.body.innerText.includes('thank you')) return 'thank you';
      return null;
    });

    console.log('168 result msg:', msg);
    if (msg) {
      saveLeadResult(168, 'contacted', `Contact form: https://jpgconstruction.us/ (Autofilled & verified: ${msg.trim()})`);
    } else {
      saveLeadResult(168, 'unable_to_reach', 'Contact form: https://jpgconstruction.us/ (No confirmation message returned)');
    }
  } catch (err) {
    console.error('168 error:', err.message);
  } finally {
    try { await page.close(); } catch(e){}
  }
}

async function checkSite(browser, leadId, url) {
  console.log(`\n--- Checking #${leadId}: ${url} ---`);
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    console.log(`Loaded ${url}, Title: ${await page.title()}`);
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]')).map(a => ({
        text: a.innerText.trim(),
        href: a.href
      })).filter(l => l.text.toLowerCase().includes('contact') || l.href.toLowerCase().includes('contact'));
    });
    console.log(`Links for #${leadId}:`, links);
  } catch (err) {
    console.log(`Failed #${leadId}:`, err.message);
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
  await checkSite(browser, 169, 'https://mtconstruction.group');
  await checkSite(browser, 171, 'https://nunezconstruction.co');

  await browser.close();
}

main();
