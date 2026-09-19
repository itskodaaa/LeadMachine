import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  company: 'Northeast Precision Machinery, Inc.',
  phone: '708-568-3708',
  address: '100 Main St',
  city: 'Chicago',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your precision machining and contract manufacturing services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testReata() {
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
    if (url.includes('rfq') || url.includes('quote') || url.includes('api')) {
      if (res.status() !== 200 && res.status() !== 304 && !url.endsWith('.js') && !url.endsWith('.css') && !url.endsWith('.png')) {
        console.log(`[Response] ${res.status()} ${url.slice(0, 100)}`);
      }
    }
  });

  console.log('Navigating to Reata RFQ portal...');
  await page.goto('https://rfq.digital-quote.com/rfq/index.html?supplier_id=d6d436cc-1d3f-4946-8827-3ead668067f2', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Filling fields...');
  await page.type('input[name="first_name"]', OUTREACH_PROFILE.firstName, { delay: 20 });
  await page.type('input[name="last_name"]', OUTREACH_PROFILE.lastName, { delay: 20 });
  await page.type('input[name="email"]', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('input[name="company"]', OUTREACH_PROFILE.company, { delay: 20 });
  await page.type('input[name="phone"]', OUTREACH_PROFILE.phone, { delay: 20 });
  await page.type('input[name="address.address1"]', OUTREACH_PROFILE.address, { delay: 20 });
  await page.type('input[name="address.city"]', OUTREACH_PROFILE.city, { delay: 20 });

  // State react-select
  const stateInput = await page.$('#react-select-2-input');
  if (stateInput) {
    await stateInput.click();
    await stateInput.type('IL', { delay: 30 });
    await page.keyboard.press('Enter');
  }

  await page.type('input[name="address.postal_code"]', OUTREACH_PROFILE.zip, { delay: 20 });

  // Description/notes
  const desc = await page.$('textarea[name="description"]');
  if (desc) {
    await desc.type(OUTREACH_PROFILE.message, { delay: 10 });
  }

  console.log('Attempting submit...');
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  }

  await new Promise(r => setTimeout(r, 6000));

  const validation = await page.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('.error, [role="alert"], .invalid-feedback, .text-danger')).map(e => e.innerText);
    const body = document.body.innerText;
    return {
      errs,
      bodySnippet: body.slice(0, 500)
    };
  });

  console.log('Validation/Result:', validation);
  await browser.close();
}

testReata();
