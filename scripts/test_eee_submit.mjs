import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testEEE() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async r => {
    if (r.url().includes('wp-json') || r.url().includes('contact-form-7') || r.url().includes('admin-ajax')) {
      console.log('AJAX Response:', r.status(), r.url());
      try {
        console.log('AJAX Response Body:', await r.text());
      } catch (e) {}
    }
  });

  await page.goto('https://www.electricalengineeringenterprises.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  await page.type('form.wpcf7-form input[name="Name"]', PROFILE.fullName);
  await page.type('form.wpcf7-form input[name="your-email"]', PROFILE.email);
  await page.type('form.wpcf7-form input[name="Phone"]', PROFILE.phone);
  await page.type('form.wpcf7-form input[name="your-subject"]', PROFILE.subject);
  await page.type('form.wpcf7-form textarea[name="your-message"]', PROFILE.message);

  console.log('Submitting form...');
  await page.click('form.wpcf7-form input[type="submit"]');

  // Wait up to 15 seconds for class to not be 'submitting'
  try {
    await page.waitForFunction(() => {
      const f = document.querySelector('form.wpcf7-form');
      return f && !f.classList.contains('submitting');
    }, { timeout: 15000 });
  } catch (e) {
    console.log('Wait timeout or error:', e.message);
  }

  const res = await page.evaluate(() => {
    const f = document.querySelector('form.wpcf7-form');
    const out = document.querySelector('form.wpcf7-form .wpcf7-response-output');
    return {
      classes: f?.className,
      output: out?.innerText,
      status: f?.getAttribute('data-status')
    };
  });
  console.log('Result for #3899:', JSON.stringify(res, null, 2));

  await browser.close();
}

testEEE();
