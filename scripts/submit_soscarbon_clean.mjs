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
    if (res.url().includes('instantpage') || res.url().includes('contact') || res.request().method() === 'POST') {
      console.log('NET Response:', res.status(), res.url());
      try {
        console.log('Body:', (await res.text()).slice(0, 300));
      } catch(e) {}
    }
  });

  await page.goto('https://soscarbon.com/contact-us', { waitUntil: 'networkidle2' });
  
  // Fill inputs by querying form inputs
  const inputs = await page.$$('form input:not([name="_app_id"])');
  console.log('Found visible inputs:', inputs.length);
  
  if (inputs[0]) { await inputs[0].click(); await page.keyboard.type('Pamela Jameson', { delay: 10 }); }
  if (inputs[1]) { await inputs[1].click(); await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 10 }); }
  if (inputs[2]) { await inputs[2].click(); await page.keyboard.type('708-568-3708', { delay: 10 }); }
  if (inputs[3]) { await inputs[3].click(); await page.keyboard.type('Northeast Precision Machinery, Inc.', { delay: 10 }); }
  if (inputs[4]) { await inputs[4].click(); await page.keyboard.type('Chicago, IL', { delay: 10 }); }

  const ta = await page.$('form textarea');
  if (ta) {
    await ta.click();
    await page.keyboard.type('Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your convenience. Thank you, Pamela Jameson', { delay: 5 });
  }

  console.log('Clicking SEND button...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').trim() === 'SEND');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 7000));

  const postSubmit = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('[role="alert"], [class*="message"], [class*="alert"], [class*="confirmation"], [class*="thank"]')).map(a => a.innerText.trim());
    return {
      body: document.body.innerText.slice(0, 800),
      alerts
    };
  });

  console.log('Post submit text:', postSubmit);

  const lower = (postSubmit.body + ' ' + postSubmit.alerts.join(' ')).toLowerCase();
  if (lower.includes('thank') || lower.includes('received') || lower.includes('sent') || lower.includes('in touch')) {
    console.log('SUCCESS! Updating database for #947...');
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const note = `Contact form: https://soscarbon.com/contact-us (Autofilled & verified: ${postSubmit.alerts[0] || 'Thank you confirmation detected'})`;
    updateStmt.run(note, 'contacted', 947);
    logStmt.run(947, 'sent', note);
    console.log('Lead 947 marked contacted!');
  } else {
    console.log('Submission did not produce explicit confirmation.');
  }

  await browser.close();
})();
