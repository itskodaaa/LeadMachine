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
  message: `Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.`
};

async function test4033() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('email') || res.url().includes('contact') || res.url().includes('form')) {
      console.log(`[Response] ${res.status()} ${res.url()}`);
      try {
        const text = await res.text();
        console.log(`[Body]: ${text.slice(0, 200)}`);
      } catch(e) {}
    }
  });

  try {
    await page.goto('https://psiengineeringinc.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.evaluate(() => {
      const el = document.querySelector('[data-aid="CONTACT_FORM_NAME"]');
      if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.type('input[data-aid="CONTACT_FORM_NAME"]', PROFILE.fullName, { delay: 20 });
    await page.type('input[data-aid="CONTACT_FORM_EMAIL"]', PROFILE.email, { delay: 20 });
    await page.type('input[data-aid="Phone"]', PROFILE.phone, { delay: 20 });
    await page.type('textarea[data-aid="CONTACT_FORM_MESSAGE"]', PROFILE.message, { delay: 10 });

    const btn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    await btn.click();
    console.log('Clicked submit on 4033. Waiting 12 seconds...');
    await new Promise(r => setTimeout(r, 12000));

    const confirmation = await page.evaluate(() => {
      const body = document.body.innerText;
      const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS_MESSAGE"], [role="alert"], .alert-success');
      return {
        successElText: successEl ? successEl.innerText : null,
        hasThank: body.toLowerCase().includes('thank') || body.toLowerCase().includes('received'),
        snippet: body.slice(body.indexOf('Message') > -1 ? body.indexOf('Message') : 0, 500)
      };
    });
    console.log('4033 Final confirmation:', confirmation);

  } catch(e) {
    console.error('4033 err:', e.message);
  } finally {
    await browser.close();
  }
}

test4033();
