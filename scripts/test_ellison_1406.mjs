import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  title: 'Procurement Director',
  email: 'pamela.jameson@nortiheastprecision.com',
  company: 'Northeast Precision Machinery, Inc.',
  phone: '708-568-3708',
  zip: '85281',
  bestTime: 'Morning / Anytime',
  message: `Hello,

I am reaching out to express our interest in your CNC machine tools and automation solutions and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a sales representative to contact us at your earliest convenience to discuss equipment options, pricing, and potential collaboration.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testEllison() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--ignore-certificate-errors']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const url = res.url();
    if (url.includes('form') || url.includes('submission') || url.includes('api')) {
      if (!url.endsWith('.js') && !url.endsWith('.css') && !url.endsWith('.png')) {
        console.log(`[Response] ${res.status()} ${url}`);
        try {
          const txt = await res.text();
          console.log('Body:', txt.slice(0, 200));
        } catch (e) {}
      }
    }
  });

  console.log('Navigating to https://www.ellisonaz.com/sales-team ...');
  await page.goto('https://www.ellisonaz.com/sales-team', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling fields via React input simulation...');
  await page.type('#text-c80c61f4-33a8-4258-b878-f9f8a98c13bc-field', OUTREACH_PROFILE.company, { delay: 20 });
  await page.type('#text-ec571fac-1d58-49d8-918d-0d61ed1e1f89-field', OUTREACH_PROFILE.zip, { delay: 20 });
  await page.type('#name-bad7b16c-4735-4fba-97ec-acaa756bd2a5-fname-field', OUTREACH_PROFILE.firstName, { delay: 20 });
  await page.type('#name-bad7b16c-4735-4fba-97ec-acaa756bd2a5-lname-field', OUTREACH_PROFILE.lastName, { delay: 20 });
  await page.type('#text-a99c0c92-5b5e-4e58-af50-d49d40402581-field', OUTREACH_PROFILE.title, { delay: 20 });
  await page.type('#email-fc131e97-9ea4-4584-a10f-d88ffe5686b2-field', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('#phone-223abeb1-d5f0-4d1c-b429-6ecbdd9d10ea-input-field', OUTREACH_PROFILE.phone, { delay: 20 });
  await page.type('#text-d5d008b4-e35f-4bc6-ad5a-c7cd84835414-field', OUTREACH_PROFILE.bestTime, { delay: 20 });
  await page.type('#textarea-3ddfbd15-dd05-4669-9048-0ed7a76cde60-field', OUTREACH_PROFILE.message, { delay: 10 });

  console.log('Clicking Submit button...');
  await page.click('form button[type="submit"]');

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const successMsg = document.querySelector('.form-submission-text, .form-submission-html, .sqs-form-submitted, [role="alert"]');
    return {
      successEl: successMsg ? successMsg.innerText : null,
      pageSnippet: document.body.innerText.slice(0, 600)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testEllison();
