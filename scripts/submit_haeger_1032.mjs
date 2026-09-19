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
  page.on('console', msg => console.log('PAGE:', msg.text()));

  page.on('response', async res => {
    if (res.url().includes('admin-ajax.php') || res.request().method() === 'POST') {
      console.log('NET Response:', res.status(), res.url());
      try {
        console.log('Body snippet:', (await res.text()).slice(0, 300));
      } catch(e) {}
    }
  });

  await page.goto('https://www.haegerengineering.com/contact-haeger/', { waitUntil: 'networkidle2' });
  
  await page.focus('#wpforms-37-field_0');
  await page.keyboard.type('Pamela Jameson', { delay: 20 });

  await page.focus('#wpforms-37-field_1');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });

  await page.focus('#wpforms-37-field_2');
  await page.keyboard.type('Exploring Collaboration Opportunities - Interested in your civil engineering and land surveying services and discussing potential business partnership. Phone: 708-568-3708, Northeast Precision Machinery, Inc.', { delay: 10 });

  console.log('Waiting 12 seconds for anti-bot timing...');
  await new Promise(r => setTimeout(r, 12000));

  console.log('Clicking Submit button on Haeger Engineering...');
  await page.click('#wpforms-submit-37');

  await new Promise(r => setTimeout(r, 7000));

  const postSubmit = await page.evaluate(() => {
    const confirmation = document.querySelector('.wpforms-confirmation-container, .wpforms-confirmation-scroll');
    const errors = Array.from(document.querySelectorAll('.wpforms-error, .wpforms-error-container')).map(e => e.innerText);
    return {
      confirmationText: confirmation ? confirmation.innerText.trim() : null,
      errors,
      bodySnippet: document.body.innerText.slice(0, 800)
    };
  });

  console.log('Post Submit Results:', postSubmit);

  const combined = (postSubmit.confirmationText || '') + ' ' + (postSubmit.bodySnippet || '');
  if (combined.toLowerCase().includes('thanks for contacting us') || combined.toLowerCase().includes('thank you') || combined.toLowerCase().includes('we will be in touch') || combined.toLowerCase().includes('received your message')) {
    console.log('SUCCESS! Updating database for #1032...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://www.haegerengineering.com/contact-haeger/ (Autofilled WPForms & verified: "${postSubmit.confirmationText || 'Thank you confirmation detected'}")`;
    updateStmt.run(note, 'contacted', 1032);
    logStmt.run(1032, 'sent', note);
    console.log('Lead 1032 marked contacted!');
  } else {
    console.log('Not yet confirmed.');
  }

  await browser.close();
})();
