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

async function testJR() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async r => {
    if (r.url().includes('wp-json') || r.url().includes('contact-form-7') || r.url().includes('admin-ajax')) {
      console.log('JR AJAX Response:', r.status(), r.url());
      try {
        console.log('JR AJAX Response Body:', (await r.text()).slice(0, 500));
      } catch (e) {}
    }
  });

  await page.goto('https://jrpdrilling.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const formDetails = await page.evaluate(() => {
    const f = document.querySelector('form');
    return {
      action: f?.action,
      method: f?.method,
      className: f?.className,
      innerHtml: f?.innerHTML
    };
  });
  console.log('JR Form Details:', formDetails.action, formDetails.className);

  await page.type('input[name="your-name"]', PROFILE.fullName);
  await page.type('input[name="your-email"]', PROFILE.email);
  await page.type('input[name="your-subject"]', PROFILE.subject);
  await page.type('textarea[name="your-message"]', PROFILE.message);

  console.log('Submitting JR form...');
  const submitBtn = await page.$('input[type="submit"]');
  console.log('Submit button found:', !!submitBtn);
  if (submitBtn) {
    await submitBtn.click();
  }

  // wait 10 seconds
  await new Promise(r => setTimeout(r, 10000));

  const res = await page.evaluate(() => {
    const f = document.querySelector('form.wpcf7-form');
    const out = document.querySelector('form.wpcf7-form .wpcf7-response-output');
    return {
      classes: f?.className,
      output: out?.innerText,
      status: f?.getAttribute('data-status')
    };
  });
  console.log('JR Result:', JSON.stringify(res, null, 2));

  await browser.close();
}

testJR();
