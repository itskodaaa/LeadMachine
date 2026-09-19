import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function checkSubmit() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  let otmResponse = null;
  page.on('response', async resp => {
    if (resp.url().includes('otmdash')) {
      try {
        const text = await resp.text();
        otmResponse = { status: resp.status(), text };
        console.log('OTM RESP:', resp.status(), text);
      } catch (e) {
        console.log('OTM RESP ERR:', e.message);
      }
    }
  });

  await page.goto('https://www.hallenggroup.com/contact-us/', { waitUntil: 'networkidle2' });
  await page.type('input[name="from"]', 'Pamela Jameson');
  await page.type('input[name="sender"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[name="phone"]', '708-568-3708');
  await page.type('input[name="company"]', 'Northeast Precision Machinery, Inc.');
  await page.type('textarea[name="msg"]', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson');

  const btn = await page.$('button[type="submit"]');
  console.log('Clicking button...');
  await btn.click();
  await new Promise(r => setTimeout(r, 10000));

  const domStatus = await page.evaluate(() => {
    const s = document.querySelector('.alert-success');
    const d = document.querySelector('.alert-danger');
    return {
      successClass: s?.className,
      successText: s?.innerText,
      dangerClass: d?.className,
      dangerText: d?.innerText
    };
  });

  console.log('DOM Status:', JSON.stringify(domStatus, null, 2));

  if (otmResponse && otmResponse.status === 200) {
    console.log('SUCCESS CONFIRMED ON HALL ENGINEERING GROUP!');
    const note = 'Confirmed: Submission successful via OTM Form API (HTTP 200) - ' + (domStatus.successText || 'Your Message Has been Successfully Sent.').trim();
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 3859').run('contacted', note);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (3859, "sent", ?, CURRENT_TIMESTAMP)').run(note);
    console.log('Database committed for #3859!');
  }

  await browser.close();
}
checkSubmit();
