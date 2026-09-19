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
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto('https://ap-engineer.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.waitForSelector('input[name="Name"]', { timeout: 10000 });

  // Wait 3 seconds for any cf7ic captcha to settle
  await new Promise(r => setTimeout(r, 3000));

  await page.type('input[name="Name"]', 'Pamela Jameson');
  await page.type('input[name="email-156"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[name="telephone"]', '708-568-3708');
  await page.type('input[name="Company"]', 'Northeast Precision');
  await page.type('input[name="your-subject"]', 'Exploring Collaboration');
  await page.type('textarea[name="Client-message"]', 'Hello, we are interested in your precision engineering services and potential collaboration on upcoming project quotes.');

  console.log('Clicking submit...');
  await page.click('input.wpcf7-submit');

  await new Promise(r => setTimeout(r, 5000));

  const result = await page.evaluate(() => {
    const resp = document.querySelector('.wpcf7-response-output')?.innerText;
    const errors = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(e => e.innerText);
    const captchaText = document.querySelector('.cf7ic-loader')?.parentElement?.innerText;
    return { resp, errors, captchaText };
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.resp && /thank|sent|success|received/i.test(result.resp)) {
    console.log('SUCCESS for #3494!');
    const note = `Contact form submitted: https://ap-engineer.com/contact-us/ | Confirmation: "${result.resp.trim()}"`;
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 3494);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(3494, 'sent', note);
  } else {
    console.log('Failed or blocked:', result.resp || result.errors);
  }

  await browser.close();
})();
