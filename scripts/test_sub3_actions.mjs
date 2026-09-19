import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testEHRA() {
  console.log('--- Testing #4145 EHRA Engineering ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      if (res.url().includes('forms.hsforms.com') || res.url().includes('submissions')) {
        console.log(`[EHRA Network] Response: ${res.status()} ${res.url()}`);
        try {
          const body = await res.text();
          console.log(`[EHRA Response body]: ${body.slice(0, 300)}`);
        } catch (e) {}
      }
    });

    await page.goto('https://ehra.team/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill HubSpot form
    await page.type('input[name="firstname"]', OUTREACH.firstName);
    await page.type('input[name="lastname"]', OUTREACH.lastName);
    await page.type('input[name="email"]', OUTREACH.email);
    await page.type('input[name="phone"]', OUTREACH.phone);
    await page.type('input[name="company"]', OUTREACH.company);
    await page.type('textarea[name="message"]', OUTREACH.message);

    console.log('Filled EHRA form. Submitting...');
    const submitBtn = await page.$('input[type="submit"][value="Talk to Our Team"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.click('.hs-button');
    }

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const submitted = document.querySelector('.submitted-message, .hs-form-submitted, .hs-main-font-element');
      return submitted ? submitted.innerText : document.body.innerText.slice(0, 500);
    });
    console.log('EHRA result text:', confirmation);
  } catch (e) {
    console.error('EHRA error:', e);
  } finally {
    await browser.close();
  }
}

async function testTetra() {
  console.log('\n--- Testing #4144 Tetra Land Services ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 900 });

    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log(`[Tetra POST]: ${res.status()} ${res.url()}`);
        try {
          const body = await res.text();
          console.log(`[Tetra Response]: ${body.slice(0, 300)}`);
        } catch (e) {}
      }
    });

    await page.goto('https://tetralandservices.com/#contact', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('input[name="userName"]', OUTREACH.fullName);
    await page.type('input[name="userEmail"]', OUTREACH.email);
    await page.type('input[name="userPhone"]', OUTREACH.phone);
    await page.select('select[name="userService"]', 'Civil Engineering');
    await page.type('textarea[name="userMessage"]', OUTREACH.message);

    console.log('Filled Tetra form. Submitting...');
    await page.evaluate(() => {
      const btn = document.querySelector('form button, form input[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('.alert, .success, [role="alert"], #status, .form-message'));
      return alerts.map(a => a.innerText).join(' | ') || document.body.innerText.slice(0, 500);
    });
    console.log('Tetra result:', result);
  } catch (e) {
    console.error('Tetra error:', e);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testEHRA();
  await testTetra();
}

run();
