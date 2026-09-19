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
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  zip: '33101',
  message: `Hello, I am reaching out to express interest in your services and discuss potential collaboration opportunities. Kindly contact us at your convenience.`
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

async function submitNinja257() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://h2pconstruction.com', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling Ninja Form on #257...');
  await page.evaluate((p) => {
    const zip = document.querySelector('#nf-field-5');
    const cb = document.querySelector('#nf-field-6-0');
    const name = document.querySelector('#nf-field-7');
    const phone = document.querySelector('#nf-field-8');
    const email = document.querySelector('#nf-field-9');
    const msg = document.querySelector('#nf-field-10');

    if (zip) { zip.value = p.zip; zip.dispatchEvent(new Event('change', { bubbles: true })); }
    if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    if (name) { name.value = p.fullName; name.dispatchEvent(new Event('change', { bubbles: true })); }
    if (phone) { phone.value = p.phone; phone.dispatchEvent(new Event('change', { bubbles: true })); }
    if (email) { email.value = p.email; email.dispatchEvent(new Event('change', { bubbles: true })); }
    if (msg) { msg.value = p.message; msg.dispatchEvent(new Event('change', { bubbles: true })); }

    const submit = document.querySelector('#nf-field-11');
    if (submit) submit.click();
  }, OUTREACH_PROFILE);

  await new Promise(r => setTimeout(r, 6000));

  const verify = await page.evaluate(() => {
    const nfMsg = document.querySelector('.nf-response-msg')?.innerText || '';
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    return { nfMsg, bodySnippet: body.substring(0, 300) };
  });

  console.log('#257 Ninja Result:', verify.nfMsg, 'Body:', verify.bodySnippet);
  if (verify.nfMsg.toLowerCase().includes('thank') || verify.nfMsg.toLowerCase().includes('success') || verify.bodySnippet.includes('form submitted successfully') || verify.bodySnippet.includes('thank you')) {
    console.log('SUCCESS for #257!');
    saveLeadResult(257, 'contacted', `Contact form: https://h2pconstruction.com (Ninja Forms Verified: ${verify.nfMsg.trim() || 'Thank you'})`);
  } else {
    saveLeadResult(257, 'unable_to_reach', `Contact form: https://h2pconstruction.com (${verify.nfMsg || 'Ninja Form unconfirmed'})`);
  }

  await page.close();
  await browser.close();
}

submitNinja257();
