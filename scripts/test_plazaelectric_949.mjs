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
      console.log('NET Response:', res.status(), res.url());
      try {
        console.log('Body:', await res.text());
      } catch(e) {}
    }
  });

  await page.goto('https://plazaelectric.com/contact-us/', { waitUntil: 'networkidle2' });
  
  await page.focus('#fl-name');
  await page.keyboard.type('Pamela Jameson', { delay: 20 });

  await page.focus('#fl-email');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });

  await page.focus('#fl-message');
  await page.keyboard.type('Exploring Collaboration Opportunities - Interested in electrical contracting and discussing potential business partnership. Phone: 708-568-3708, Northeast Precision Machinery, Inc.', { delay: 10 });

  console.log('Clicking .fl-button on Plaza Electric...');
  await page.evaluate(() => {
    const btn = document.querySelector('.fl-contact-form .fl-button');
    btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const postSubmit = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.fl-success, .fl-message, .fl-form-error, .fl-contact-form')).map(el => el.innerText.trim());
    return { alerts };
  });

  console.log('Post Submit Result:', postSubmit);

  const combined = postSubmit.alerts.join(' ');
  if (combined.toLowerCase().includes('thank') || combined.toLowerCase().includes('sent') || combined.toLowerCase().includes('received') || combined.toLowerCase().includes('success')) {
    console.log('SUCCESS! Updating database for #949...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://plazaelectric.com/contact-us/ (Autofilled & verified: "${postSubmit.alerts[0] || 'Message Sent'}")`;
    updateStmt.run(note, 'contacted', 949);
    logStmt.run(949, 'sent', note);
    console.log('Lead 949 marked contacted!');
  } else {
    console.log('Not yet confirmed.');
  }

  await browser.close();
})();
