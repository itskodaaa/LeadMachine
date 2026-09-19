import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  page.on('response', async res => {
    if (res.request().method() === 'POST') {
      console.log('NET Response:', res.status(), res.url());
    }
  });

  await page.goto('https://www.dbsterlin.com/contact/', { waitUntil: 'networkidle2' });
  
  await page.focus('#input_1_1_3');
  await page.keyboard.type('Pamela', { delay: 30 });

  await page.focus('#input_1_1_6');
  await page.keyboard.type('Jameson', { delay: 30 });

  await page.focus('#input_1_3');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 30 });

  await page.focus('#input_1_4');
  await page.keyboard.type('708-568-3708', { delay: 30 });

  await page.focus('#input_1_5');
  await page.keyboard.type('Exploring Collaboration Opportunities', { delay: 20 });

  await page.focus('#input_1_6');
  await page.keyboard.type('Hello, I am reaching out to express our interest in your engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson, Northeast Precision Machinery, Inc.', { delay: 10 });

  console.log('Submitting DB Sterlin Gravity Form (honeypot untouched)...');
  await page.click('#gform_submit_button_1');

  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});

  const postSubmit = await page.evaluate(() => {
    const confirmation = document.querySelector('.gform_confirmation_message, #gform_confirmation_message_1, .validation_error');
    return {
      confirmationText: confirmation ? confirmation.innerText.trim() : null,
      body: document.body.innerText.slice(0, 800)
    };
  });

  console.log('Post Submit Result:', postSubmit);

  const combined = (postSubmit.confirmationText || '') + ' ' + (postSubmit.body || '');
  if (combined.toLowerCase().includes('thanks for contacting us') || combined.toLowerCase().includes('thank you') || combined.toLowerCase().includes('we have received') || combined.toLowerCase().includes('we will be in touch')) {
    console.log('SUCCESS! Updating database for #1036...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://www.dbsterlin.com/contact/ (Autofilled Gravity Forms & verified: "${postSubmit.confirmationText || 'Thank you message displayed'}")`;
    updateStmt.run(note, 'contacted', 1036);
    logStmt.run(1036, 'sent', note);
    console.log('Lead 1036 marked contacted!');
  } else {
    console.log('Not confirmed.');
  }

  await browser.close();
})();
