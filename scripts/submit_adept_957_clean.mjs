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
    if (res.url().includes('admin-ajax.php') || res.request().method() === 'POST') {
      console.log('AJAX Response:', res.status(), res.url());
      try {
        console.log('AJAX Body:', await res.text());
      } catch(e) {}
    }
  });

  await page.goto('https://adeptengineering.com/', { waitUntil: 'networkidle2' });
  
  await page.focus('#wpforms-78286-field_1');
  await page.keyboard.type('Pamela');

  await page.focus('#wpforms-78286-field_1-last');
  await page.keyboard.type('Jameson');

  await page.focus('#wpforms-78286-field_5');
  await page.keyboard.type('Northeast Precision Machinery, Inc.');

  await page.focus('#wpforms-78286-field_6');
  await page.keyboard.type('708-568-3708');

  await page.focus('#wpforms-78286-field_2');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com');

  await page.focus('#wpforms-78286-field_3');
  await page.keyboard.type('Pamela Jameson');

  console.log('Clicking submit button on Adept...');
  await page.evaluate(() => {
    document.getElementById('wpforms-submit-78286').click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const confirmation = await page.evaluate(() => {
    const box = document.querySelector('.wpforms-confirmation-container');
    return box ? box.innerText.trim() : null;
  });

  console.log('Confirmation box text:', confirmation);

  if (confirmation && (confirmation.toLowerCase().includes('thank') || confirmation.toLowerCase().includes('contact'))) {
    console.log('SUCCESS! Updating database for #957...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://adeptengineering.com/ (Autofilled & verified: "${confirmation}")`;
    updateStmt.run(note, 'contacted', 957);
    logStmt.run(957, 'sent', note);
    console.log('Lead 957 committed as contacted!');
  }

  await browser.close();
})();
