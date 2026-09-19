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
    if (res.url().includes('contact-form-7') || res.url().includes('feedback')) {
      console.log('CF7 Response:', res.status(), res.url());
      try {
        console.log('CF7 Body:', await res.text());
      } catch(e) {}
    }
  });

  await page.goto('https://grantpllc.com/contact/', { waitUntil: 'networkidle2' });

  // Fill the fields
  await page.type('input[name="your-name"]', 'Pamela Jameson', { delay: 10 });
  await page.type('input[name="your-email"]', 'pamela.jameson@nortiheastprecision.com', { delay: 10 });
  
  // Select position
  await page.select('select[name="menu-607"]', 'Engineering Company');

  await page.type('input[name="your-subject"]', 'Exploring Collaboration Opportunities', { delay: 10 });
  await page.type('textarea[name="your-message"]', 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nThank you,\nPamela Jameson', { delay: 5 });

  console.log('Submitting CF7 form...');
  const submitBtn = await page.$('input[type="submit"], button[type="submit"]');
  await submitBtn.click();

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    return {
      outputClass: output ? output.className : null,
      outputText: output ? output.innerText.trim() : null
    };
  });

  console.log('Result:', result);

  if (result.outputText && (result.outputText.toLowerCase().includes('thank') || result.outputText.toLowerCase().includes('sent') || result.outputClass.includes('wpcf7-mail-sent-ok'))) {
    console.log('SUCCESS! Updating lead #893...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://grantpllc.com/contact/ (Autofilled & verified: "${result.outputText}")`;
    updateStmt.run(note, 'contacted', 893);
    logStmt.run(893, 'sent', note);
    console.log('Committed to database!');
  } else {
    console.log('Not confirmed. Output:', result.outputText);
    if (result.outputText) {
      const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
      const note = `Contact form: https://grantpllc.com/contact/ (Submission failed/blocked: "${result.outputText}")`;
      updateStmt.run(note, 'unable_to_reach', 893);
      logStmt.run(893, 'bounced', note);
    }
  }

  await browser.close();
})();
