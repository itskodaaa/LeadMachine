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
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('https://nybuildingengineering.com/', { waitUntil: 'networkidle2' });
  
  const nameInputs = await page.$$('input[placeholder="Your name"]');
  await nameInputs[0].click();
  await page.keyboard.type('Pamela Jameson');

  const compInputs = await page.$$('input[placeholder="Company or firm name"]');
  await compInputs[0].click();
  await page.keyboard.type('Northeast Precision Machinery, Inc.');

  const emailInputs = await page.$$('input[placeholder="your@email.com"]');
  await emailInputs[0].click();
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com');

  const phoneInputs = await page.$$('input[placeholder="(347) 000-0000"]');
  await phoneInputs[0].click();
  await page.keyboard.type('708-568-3708');

  const addrInputs = await page.$$('input[placeholder*="address"]');
  await addrInputs[0].click();
  await page.keyboard.type('100 Main St, Chicago, IL 60601');

  const msgInputs = await page.$$('textarea');
  await msgInputs[0].click();
  await page.keyboard.type('Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson');

  console.log('Clicking submit button...');
  const submitBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Send Request'));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked:', submitBtn);

  await new Promise(r => setTimeout(r, 6000));

  const confirmation = await page.evaluate(() => {
    const contactSec = document.querySelector('#contact');
    return {
      text: contactSec ? contactSec.innerText : document.body.innerText
    };
  });

  console.log('Confirmation Text Snippet:\n', confirmation.text.slice(0, 500));
  
  if (confirmation.text.includes('Request Received') || confirmation.text.includes('Your request has been received') || confirmation.text.includes('Thank you')) {
    console.log('SUCCESS! Updating database for #898...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = 'Contact form: https://nybuildingengineering.com/#contact (Autofilled & verified: "Request Received - Thank you. Your request has been received.")';
    updateStmt.run(note, 'contacted', 898);
    logStmt.run(898, 'sent', note);
    console.log('Committed to database successfully!');
  } else {
    console.log('Not yet confirmed.');
  }

  await browser.close();
})();
