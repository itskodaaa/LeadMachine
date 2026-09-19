import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('request', req => {
    if (req.method() === 'POST') console.log('POST Req:', req.url());
  });

  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      try {
        console.log('POST Resp:', resp.status(), resp.url(), (await resp.text()).slice(0, 200));
      } catch (e) {}
    }
  });

  await page.goto('https://gomezironworks.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking and typing Name...');
  await page.click('[data-aid="CONTACT_FORM_NAME"]');
  await page.type('[data-aid="CONTACT_FORM_NAME"]', 'Pamela Jameson', { delay: 30 });

  console.log('Clicking and typing Email...');
  await page.click('[data-aid="CONTACT_FORM_EMAIL"]');
  await page.type('[data-aid="CONTACT_FORM_EMAIL"]', 'pamela.jameson@nortiheastprecision.com', { delay: 30 });

  console.log('Clicking and typing Message...');
  await page.click('[data-aid="CONTACT_FORM_MESSAGE"]');
  await page.type('[data-aid="CONTACT_FORM_MESSAGE"]', 'Hello, We are interested in your metal fabrication services. Please contact us at your convenience. Best regards, Pamela Jameson', { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Submit button...');
  await page.click('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

  console.log('Waiting 10s...');
  await new Promise(r => setTimeout(r, 10000));

  const afterState = await page.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-aid*="MESSAGE"], .form-message')).map(a => a.innerText.trim());
    const body = document.body ? document.body.innerText : '';
    return {
      alerts,
      hasThanks: body.toLowerCase().includes('thank') || body.toLowerCase().includes('inquiry')
    };
  });

  console.log('After submit:', afterState);
  await browser.close();
}

test().catch(console.error);
