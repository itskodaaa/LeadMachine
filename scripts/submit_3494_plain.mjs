import puppeteer from 'puppeteer';
import db from './db.mjs';

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  console.log('Navigating to https://ap-engineer.com/contact-us/...');
  const res = await page.goto('https://ap-engineer.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Status:', res.status());

  await page.waitForSelector('input[name="Name"]');

  await page.type('input[name="Name"]', 'Pamela Jameson');
  await page.type('input[name="email-156"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[name="telephone"]', '708-568-3708');
  await page.type('input[name="Company"]', 'Northeast Precision Machinery, Inc.');
  await page.type('input[name="your-subject"]', 'Exploring Collaboration Opportunities');
  await page.type('textarea[name="Client-message"]', 'Hello, I am reaching out to express our interest in your precision engineering services and potential collaboration on upcoming project quotes. Kindly have a representative contact us at your earliest convenience.');

  console.log('Clicking submit...');
  await page.click('form.wpcf7-form input[type="submit"]');

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const resp = document.querySelector('.wpcf7-response-output')?.innerText;
    const errors = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(e => e.innerText);
    return { resp, errors };
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.resp && /thank|sent|success|received/i.test(result.resp)) {
    console.log('SUCCESS for #3494!');
    const note = `Contact form submitted: https://ap-engineer.com/contact-us/ | Confirmation: "${result.resp.trim()}"`;
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 3494);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(3494, 'sent', note);
  } else {
    console.log('Submission did not produce success confirmation:', result);
  }

  await browser.close();
})();
