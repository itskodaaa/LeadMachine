import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

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
  console.log('[DB SAVED] Lead #' + id + ' -> status=' + status + ' | note=' + note);
}

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function run() {
  console.log('Testing Blackline with headed mode and 60s timeout...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  
  await page.setRequestInterception(true);
  page.on('request', req => {
    const rt = req.resourceType();
    if (['image', 'media', 'font'].includes(rt)) req.abort();
    else req.continue();
  });

  const t0 = Date.now();
  try {
    await page.goto('https://blackline-eng.com/contact/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Loaded in ' + ((Date.now() - t0) / 1000) + 's');
    console.log('Title:', await page.title());

    await page.waitForSelector('#input_1_1_3', { timeout: 15000 });
    await page.type('#input_1_1_3', PROFILE.firstName, { delay: 20 });
    await page.type('#input_1_1_6', PROFILE.lastName, { delay: 20 });
    await page.type('#input_1_4', PROFILE.email, { delay: 20 });
    await page.type('#input_1_3', PROFILE.phone, { delay: 20 });
    await page.type('#input_1_5', PROFILE.message, { delay: 10 });

    console.log('Submitting Gravity Form on Blackline...');
    await page.click('#gform_submit_button_1');

    let confirmed = false;
    let confText = '';
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 500));
      const res = await page.evaluate(() => {
        const conf = document.querySelector('.gform_confirmation_message, [id*="gform_confirmation_message"]');
        if (conf && conf.innerText.trim().length > 0) {
          return { ok: true, text: conf.innerText.trim() };
        }
        const body = document.body.innerText.toLowerCase();
        if (body.includes('thanks for contacting us') || body.includes('thank you')) {
          return { ok: true, text: 'DOM confirmation detected' };
        }
        return { ok: false };
      });
      if (res.ok) {
        confirmed = true;
        confText = res.text;
        break;
      }
    }

    if (confirmed) {
      console.log('SUCCESS for Blackline:', confText);
      saveLeadResult(4128, 'contacted', `Confirmed via Gravity Form: ${confText}`);
    } else {
      console.log('No confirmation detected post-submit.');
      const err = await page.evaluate(() => {
        const val = document.querySelector('.gform_validation_errors, .validation_message');
        return val ? val.innerText : 'none';
      });
      console.log('Validation error:', err);
      saveLeadResult(4128, 'unable_to_reach', `Submission unconfirmed. Validation: ${err}`);
    }
  } catch (e) {
    console.log('Failed:', e.message);
    saveLeadResult(4128, 'unable_to_reach', `Submission error: ${e.message}`);
  } finally {
    await browser.close();
  }
}

run();
