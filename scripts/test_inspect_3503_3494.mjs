import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check3503() {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://hcengineer.com/contact-us/', { waitUntil: 'networkidle2' });
  
  // Fill form
  await page.type('input[name="your-name"]', 'Pamela Jameson');
  await page.type('input[name="your-email"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[name="your-subject"]', 'Exploring Collaboration');
  await page.type('textarea[name="your-message"]', 'Hello, we are interested in your engineering services for upcoming projects.');

  await page.click('form.wpcf7-form input[type="submit"]');
  await new Promise(r => setTimeout(r, 4000));

  const validationErrors = await page.evaluate(() => {
    const errorSpans = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(s => s.innerText);
    const hiddenInputs = Array.from(document.querySelectorAll('form.wpcf7-form input[type="hidden"]')).map(i => ({ name: i.name, value: i.value }));
    const allInputs = Array.from(document.querySelectorAll('form.wpcf7-form input, form.wpcf7-form textarea')).map(i => ({
      name: i.name,
      type: i.type,
      required: i.required,
      value: i.value
    }));
    return { errorSpans, hiddenInputs, allInputs, responseOutput: document.querySelector('.wpcf7-response-output')?.innerText };
  });
  console.log('3503 Validation Result:', JSON.stringify(validationErrors, null, 2));

  // Also check if there's reCAPTCHA v3 or Akismet or Cloudflare Turnstile on the page
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.src).filter(s => /recaptcha|turnstile|hcaptcha|akismet/i.test(s));
  });
  console.log('3503 Security Scripts:', scripts);

  await browser.close();
}

async function check3494() {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
  });
  const res = await page.goto('https://ap-engineer.com/contact-us/', { waitUntil: 'networkidle2' });
  console.log('3494 Status:', res.status());
  const body = await page.evaluate(() => document.body.innerText.slice(0, 300));
  console.log('3494 Body:', body);
  const forms = await page.evaluate(() => Array.from(document.querySelectorAll('form')).map(f => f.outerHTML));
  console.log('3494 Forms count:', forms.length);
  await browser.close();
}

(async () => {
  await check3503();
  await check3494();
})();
