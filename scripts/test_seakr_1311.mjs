import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello,

I am reaching out to express our interest in your aerospace and space electronics engineering services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testSEAKR() {
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
    if (url.includes('ninja-forms') || url.includes('admin-ajax.php') || url.includes('connect')) {
      console.log(`[Response] ${res.status()} ${url}`);
      try {
        const text = await res.text();
        console.log('Body:', text.slice(0, 250));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://seakr.com/connect/ ...');
  await page.goto('https://seakr.com/connect/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Filling Ninja Forms fields...');
  await page.type('#nf-field-1', OUTREACH_PROFILE.fullName, { delay: 20 });
  await page.type('#nf-field-2', OUTREACH_PROFILE.email, { delay: 20 });
  await page.type('#nf-field-11', OUTREACH_PROFILE.phone, { delay: 20 });
  await page.type('#nf-field-3', OUTREACH_PROFILE.message, { delay: 10 });

  console.log('Clicking Submit button #nf-field-5 ...');
  await page.click('#nf-field-5');

  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const msg = document.querySelector('.nf-response-msg, [role="alert"], .nf-msg');
    return {
      msgText: msg ? msg.innerText : null,
      pageText: document.body.innerText.slice(0, 600)
    };
  });

  console.log('Result:', result);
  await browser.close();
}

testSEAKR();
