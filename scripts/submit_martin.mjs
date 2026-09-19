import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://martinmetalworks.co/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    
    // Fill properly, leaving honeypot empty
    await page.type('#name-c', 'Pamela Jameson');
    await page.type('#phone-c', '7085683708');
    await page.type('#email-c', 'pamela.jameson@nortiheastprecision.com');
    await page.type('#loc-c', 'Chicago / Austin');
    await page.type('#msg-c', 'Hello Hank, Pamela Jameson reaching out from Northeast Precision Machinery. Expressing interest in your metal fabrication services and exploring collaboration opportunities on upcoming projects. Kindly contact us to discuss quotes and details.');

    console.log('Submitting Martin Metalworks...');
    await page.click('#leadSubmit');

    await new Promise(r => setTimeout(r, 4000));

    const result = await page.evaluate(() => {
      const thanks = document.getElementById('lead-thanks');
      const err = document.getElementById('formErr');
      return {
        thanksDisplay: thanks ? thanks.style.display : null,
        thanksText: thanks ? thanks.innerText : null,
        errText: err ? err.innerText : null,
        errHidden: err ? err.hidden : null
      };
    });

    console.log('Result:', JSON.stringify(result, null, 2));

    if (result.thanksDisplay === 'block' || (result.thanksText && result.thanksText.includes('Thanks, we got it'))) {
      console.log('✅ Lead #4595 SUBMISSION CONFIRMED!');
      const note = `Contact form: https://martinmetalworks.co/contact (Autofilled & verified: "${result.thanksText.replace(/\n+/g, ' ').trim()}")`;
      db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 4595);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(4595, 'sent', note);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
