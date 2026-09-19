import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

// First update 3503 in DB
const note3503 = 'Contact form submitted: https://hcengineer.com/contact-us/ | Confirmation: "Thank you for your message. It has been sent."';
db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note3503, 3503);
db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(3503, 'sent', note3503);
console.log('Lead 3503 updated as contacted!');

async function run3494() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
    });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://ap-engineer.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Populate fields
    await page.type('input[name="Name"]', 'Pamela Jameson', { delay: 30 });
    await page.type('input[name="email-156"]', 'pamela.jameson@nortiheastprecision.com', { delay: 30 });
    await page.type('input[name="telephone"]', '708-568-3708', { delay: 30 });
    await page.type('input[name="Company"]', 'Northeast Precision Machinery, Inc.', { delay: 30 });
    await page.type('input[name="your-subject"]', 'Exploring Collaboration Opportunities', { delay: 30 });
    await page.type('textarea[name="Client-message"]', 'Hello, I am reaching out to express our interest in your precision engineering services. We are looking for reliable partners for upcoming project quotes and potential collaboration. Kindly have a representative contact us at your earliest convenience.', { delay: 10 });

    console.log('Submitting 3494 form...');
    await Promise.all([
      page.click('form.wpcf7-form input[type="submit"]'),
      page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {})
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output')?.innerText;
      return { responseOutput };
    });

    console.log('3494 Response:', result);

    if (result.responseOutput && /thank|sent|success|received/i.test(result.responseOutput)) {
      const note = `Contact form submitted: https://ap-engineer.com/contact-us/ | Confirmation: "${result.responseOutput.trim()}"`;
      db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 3494);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(3494, 'sent', note);
      console.log('Lead 3494 updated as contacted!');
    } else {
      console.log('Lead 3494 did not confirm:', result.responseOutput);
    }
  } catch (e) {
    console.error('Error on 3494:', e.message);
  } finally {
    await browser.close();
  }
}

run3494();
