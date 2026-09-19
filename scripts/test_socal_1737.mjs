import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function test1737() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      try {
        console.log('POST:', resp.status(), resp.url(), (await resp.text()).slice(0, 200));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://socal-cnc.com/contact ...');
  await page.goto('https://socal-cnc.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Find the input fields inside the form
  const formInfo = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
    return inputs.map(i => ({ tag: i.tagName, type: i.type, id: i.id, name: i.name, placeholder: i.placeholder }));
  });
  console.log('Fields:', formInfo);

  // Type using Puppeteer
  const nameInput = await page.$('input[aria-label*="Name"], input[data-aid*="NAME"], input#input29060, input[placeholder*="Name"]');
  const emailInput = await page.$('input[aria-label*="Email"], input[data-aid*="EMAIL"], input#input29061, input[placeholder*="Email"]');
  const msgInput = await page.$('textarea');

  if (nameInput) await nameInput.type('Pamela Jameson', { delay: 20 });
  if (emailInput) await emailInput.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });
  if (msgInput) await msgInput.type('Hello, We are interested in your CNC machining capabilities. Please contact us. Sincerely, Pamela Jameson', { delay: 10 });

  console.log('Fields filled. Finding submit button...');
  const submitBtn = await page.$('button[type="submit"], form button, [data-aid*="SUBMIT"]');
  if (submitBtn) {
    console.log('Clicking submit button...');
    await submitBtn.click();
  }

  console.log('Waiting 10s for response / reCAPTCHA...');
  await new Promise(r => setTimeout(r, 10000));

  const result = await page.evaluate(() => {
    const body = document.body ? document.body.innerText : '';
    const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-aid*="MESSAGE"], .form-message')).map(a => a.innerText);
    const recaptchaChallenge = document.querySelector('iframe[src*="recaptcha/api2/bframe"]') !== null;
    return {
      bodySnippet: body.slice(0, 400).replace(/\s+/g, ' '),
      alerts,
      recaptchaChallenge
    };
  });

  console.log('Post submit result for 1737:', JSON.stringify(result, null, 2));

  await browser.close();
}

test1737().catch(console.error);
