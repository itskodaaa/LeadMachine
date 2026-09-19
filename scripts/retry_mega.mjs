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
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  message: `Hello, I am reaching out to express interest in your services and discuss potential collaboration opportunities. Please contact us at your earliest convenience.`
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

async function retryMegaWix() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.megaconstructionco.com/contact-us', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Typing into inputs...');

  const fNameInput = await page.$('input[aria-label="First name"]');
  if (fNameInput) { await fNameInput.click(); await fNameInput.type(OUTREACH_PROFILE.firstName, { delay: 50 }); }

  const lNameInput = await page.$('input[aria-label="Last name"]');
  if (lNameInput) { await lNameInput.click(); await lNameInput.type(OUTREACH_PROFILE.lastName, { delay: 50 }); }

  const emailInput = await page.$('input[aria-label="Email"]');
  if (emailInput) { await emailInput.click(); await emailInput.type(OUTREACH_PROFILE.email, { delay: 50 }); }

  const phoneInput = await page.$('input[aria-label="Phone. Phone"]');
  if (phoneInput) { await phoneInput.click(); await phoneInput.type(OUTREACH_PROFILE.phone, { delay: 50 }); }

  const addrInput = await page.$('input[aria-label="Address"]');
  if (addrInput) { await addrInput.click(); await addrInput.type(OUTREACH_PROFILE.address, { delay: 50 }); }

  const detailsInput = await page.$('textarea[aria-label="Give us more details"]');
  if (detailsInput) { await detailsInput.click(); await detailsInput.type(OUTREACH_PROFILE.message, { delay: 30 }); }

  // Select service
  const dropdown = await page.$('button[aria-label="Select a Service"], button#label-for-id_-12');
  if (dropdown) {
    await dropdown.click();
    await new Promise(r => setTimeout(r, 1000));
    const option = await page.$('[role="option"], li');
    if (option) await option.click();
  }

  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => (b.innerText || '').toLowerCase().includes('request a quote') || (b.innerText || '').toLowerCase().includes('request') || (b.innerText || '').toLowerCase().includes('submit'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const verify = await page.evaluate(() => {
    const msg = document.querySelector('.wixui-form__message, [data-testid="form-submitted"]')?.innerText || '';
    const body = document.body?.innerText || '';
    return { msg, bodySnippet: body.substring(0, 400) };
  });

  console.log('#113 Result:', verify.msg, 'Body:', verify.bodySnippet);
  if (verify.msg.toLowerCase().includes('thank') || verify.msg.toLowerCase().includes('submitted') || verify.bodySnippet.toLowerCase().includes('thanks for submitting') || verify.bodySnippet.toLowerCase().includes('received your message')) {
    console.log('SUCCESS for #113!');
    saveLeadResult(113, 'contacted', `Contact form: https://www.megaconstructionco.com/contact-us (Wix Verified: ${verify.msg.trim() || 'Thanks for submitting'})`);
  } else {
    saveLeadResult(113, 'unable_to_reach', `Contact form: https://www.megaconstructionco.com/contact-us (${verify.msg || 'Unconfirmed submission'})`);
  }

  await page.close();
  await browser.close();
}

retryMegaWix();
