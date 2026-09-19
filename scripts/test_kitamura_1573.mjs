import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  company: 'Northeast Precision Machinery, Inc.',
  zip: '60056',
  message: `Hello,

I am reaching out to express our interest in your machining centers and CNC machinery and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testKitamura() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('contact-form-7') || url.includes('feedback')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const json = await res.json();
        console.log('JSON:', JSON.stringify(json).slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://www.kitamura-machinery.com/contact/ ...');
  await page.goto('https://www.kitamura-machinery.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling fields...');
  await page.type('input[name="first-name"]', OUTREACH_PROFILE.firstName, { delay: 20 });
  await page.type('input[name="last-name"]', OUTREACH_PROFILE.lastName, { delay: 20 });
  await page.type('input[name="client-email"]', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('input[name="company"]', OUTREACH_PROFILE.company, { delay: 20 });
  await page.type('input[name="zip-code"]', OUTREACH_PROFILE.zip, { delay: 20 });
  await page.type('textarea[name="message"]', OUTREACH_PROFILE.message, { delay: 10 });

  console.log('Clicking submit...');
  await page.click('.wpcf7-submit, input[type="submit"]');

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    return {
      outputClass: output ? output.className : null,
      outputMsg: output ? output.innerText : null
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testKitamura();
