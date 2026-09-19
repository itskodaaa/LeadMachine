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
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
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
  console.log(`[DB] Saved Lead #${id} as ${status}: ${note}`);
}

async function testOneStop(browser) {
  console.log('\n--- Retrying Lead #4074: One Stop Inventing ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://onestopinventing.com', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForSelector('input[name="input_1.3"]', { timeout: 10000 });
  await page.type('input[name="input_1.3"]', OUTREACH_PROFILE.firstName, { delay: 20 });
  await page.type('input[name="input_1.6"]', OUTREACH_PROFILE.lastName, { delay: 20 });
  await page.type('input[name="input_2"]', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('input[name="input_3"]', OUTREACH_PROFILE.phone, { delay: 20 });

  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb) {
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Submit and wait for navigation or confirmation
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(e => console.log('Navigation wait catch:', e.message)),
    page.click('#gform_submit_button_1')
  ]);

  await new Promise(r => setTimeout(r, 3000));

  const text = await page.evaluate(() => {
    const conf = document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1');
    if (conf) return conf.innerText.trim();
    const valErr = document.querySelector('.gform_validation_errors');
    if (valErr) return 'Validation error: ' + valErr.innerText.trim();
    return document.body.innerText;
  });

  console.log('One Stop Result:', text.slice(0, 300));
  if (/thank you|thanks for contacting|received your/i.test(text)) {
    saveLeadResult(4074, 'contacted', `Contact form: https://onestopinventing.com (Autofilled with consent & verified: ${text.slice(0, 100).trim()})`);
  } else {
    saveLeadResult(4074, 'unable_to_reach', `Contact form: https://onestopinventing.com (${text.slice(0, 100).trim()})`);
  }
  await page.close();
}

async function testJdMiami(browser) {
  console.log('\n--- Retrying Lead #4077: JD-MIAMI ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.jd-miami.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });

  await page.waitForSelector('form.dmRespDesignRow', { timeout: 15000 });

  await page.type('form.dmRespDesignRow input[type="email"]', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('form.dmRespDesignRow textarea', OUTREACH_PROFILE.message, { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));
  await page.click('form.dmRespDesignRow input[type="submit"]');

  await new Promise(r => setTimeout(r, 6000));

  const resp = await page.evaluate(() => {
    const alertBox = document.querySelector('.dmform-response, [role="alert"], .alert');
    if (alertBox) return alertBox.innerText.trim();
    return document.body.innerText;
  });

  console.log('JD-Miami Result:', resp.slice(0, 200));
  if (/thank you|received your message|in touch shortly|sent/i.test(resp)) {
    saveLeadResult(4077, 'contacted', `Contact form: https://www.jd-miami.com/ (Autofilled & verified: ${resp.slice(0, 100).trim()})`);
  } else {
    saveLeadResult(4077, 'unable_to_reach', `Contact form: https://www.jd-miami.com/ (${resp.slice(0, 100).trim()})`);
  }
  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await testOneStop(browser);
    await testJdMiami(browser);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
