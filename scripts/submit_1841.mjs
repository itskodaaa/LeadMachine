import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  company: 'Northeast Precision Machinery, Inc.',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://doudney.com/get-quote/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="your-business"]', OUTREACH_PROFILE.company);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="you-phone"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="job-address"]', OUTREACH_PROFILE.address);
    await page.type('input[name="job-city"]', OUTREACH_PROFILE.city);
    await page.type('input[name="job-st"]', OUTREACH_PROFILE.state);
    await page.type('input[name="job-zip"]', OUTREACH_PROFILE.zip);

    // Leave delivery-date blank as it is optional and causes validation error with wrong format
    
    // Check at least one job type
    await page.click('input[name="job-type[]"]');

    await page.select('select[name="location"]', 'Miami');
    await page.select('select[name="template"]', 'no');
    await page.select('select[name="field-measure"]', 'no');

    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    console.log('Submitting form for #1841...');
    const submitBtn = await page.$('input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      const form = document.querySelector('form.wpcf7-form');
      return {
        output: output ? output.innerText : '',
        formClass: form ? form.className : '',
        isSent: form ? form.className.includes('sent') : false
      };
    });

    console.log('Submission result for #1841:', result);

    if (result.isSent || /thank you|sent/i.test(result.output)) {
      const note = `Contact form: https://doudney.com/get-quote/ (Autofilled & verified: ${result.output.trim()})`;
      db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(note, 'contacted', 1841);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(1841, 'sent', note);
      console.log('DB updated for #1841: contacted');
    }
  } catch (err) {
    console.log('Error submitting #1841:', err.message);
  } finally {
    await browser.close();
  }
}

run();
