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
    args: ['--no-sandbox']
  });

  // Uzun+Case
  const page = await browser.newPage();
  await page.goto('https://uzuncase.com/contact/', { waitUntil: 'networkidle2' });
  const html = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#gform_1 .gfield')).map(f => {
      return {
        id: f.id,
        html: f.innerHTML
      };
    });
  });
  console.log('Uzun+Case fields HTML:\n', JSON.stringify(html, null, 2));

  // Check if there is recaptcha on Uzun+Case
  const captcha = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe, div, script')).map(el => el.className || el.id || el.src).filter(s => typeof s === 'string' && /captcha|recaptcha|turnstile/i.test(s));
  });
  console.log('Uzun+Case captchas:', captcha);

  await page.close();
  await browser.close();
}

run();
