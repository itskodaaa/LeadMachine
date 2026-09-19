import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://evsmetal.com/contact/contact-form/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('URL:', page.url());

    const captchas = await page.evaluate(() => {
      const els = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      return Array.from(els).map(e => ({ tag: e.tagName, src: e.getAttribute('src'), class: e.className }));
    });
    console.log('Captchas found:', captchas);

    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          tag: i.tagName.toLowerCase(),
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        }))
      };
    });
    console.log('Form details:', JSON.stringify(formDetails, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
