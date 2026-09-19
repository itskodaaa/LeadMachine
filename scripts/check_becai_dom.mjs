import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('https://www.becaielectric.com/', { waitUntil: 'networkidle2', timeout: 35000 });
  await page.focus('#input_comp-mbqf5yg13');
  await page.keyboard.type('Pamela Jameson');
  await page.focus('#input_comp-mbqf5yg86');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com');
  await page.focus('#input_comp-mbqf5yg96');
  await page.keyboard.type('708-568-3708');
  await page.focus('#input_comp-mbqf5yg913');
  await page.keyboard.type('Exploring Collaboration Opportunities');
  await page.focus('#textarea_comp-mbqf5yga6');
  await page.keyboard.type('Hello, We are reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson');
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });
  await new Promise(r => setTimeout(r, 500));
  const sendBtn = await page.$('button[aria-label="Send"], button[data-testid="buttonElement"]');
  await sendBtn.click();
  await new Promise(r => setTimeout(r, 5000));
  const formHtml = await page.evaluate(() => {
    const form = document.querySelector('form');
    // Also check for any new elements in body
    const successMsg = document.querySelector('[data-testid="form-success-message"], .wix-form-notification, [aria-live="polite"]');
    return {
      successText: successMsg ? successMsg.innerText : 'null',
      successOuter: successMsg ? successMsg.outerHTML : 'null',
      formText: form ? form.innerText : 'no form',
      allAriaLabels: Array.from(document.querySelectorAll('[aria-label]')).map(el => el.getAttribute('aria-label'))
    };
  });
  console.log('Post-send result:', JSON.stringify(formHtml, null, 2));
  await browser.close();
})();
