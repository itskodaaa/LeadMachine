import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testLandReact() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://www.land.engineering/contact', { waitUntil: 'networkidle2', timeout: 25000 });

  async function fillWixInput(selector, val) {
    const el = await page.$(selector);
    if (!el) return;
    await el.click();
    await page.evaluate((sel, value) => {
      const input = document.querySelector(sel);
      input.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype || window.HTMLTextAreaElement.prototype,
        'value'
      ).set;
      nativeInputValueSetter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, selector, val);
  }

  await fillWixInput('input[aria-label="First name"]', 'Pamela');
  await fillWixInput('input[aria-label="Last name"]', 'Jameson');
  await fillWixInput('input[aria-label="Email"]', 'pamela.jameson@nortiheastprecision.com');
  await fillWixInput('input[aria-label="Subject"]', 'Exploring Collaboration Opportunities');

  // For textarea:
  const msgEl = await page.$('textarea[aria-label="Message"]');
  await msgEl.click();
  await page.evaluate((value) => {
    const input = document.querySelector('textarea[aria-label="Message"]');
    input.focus();
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    nativeSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, 'Hello, I am reaching out to express interest in your services and discuss potential project quotes. Please contact me at your convenience.');

  // Check form text before submit
  const beforeText = await page.evaluate(() => document.querySelector('form')?.innerText);
  console.log('Before submit form text:', beforeText);

  const submitBtn = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'submit');
  });

  console.log('Clicking Submit button on Land Engineering...');
  await submitBtn.click();

  await new Promise(r => setTimeout(r, 6000));

  const afterText = await page.evaluate(() => {
    return {
      formText: document.querySelector('form')?.innerText,
      bodyText: document.body.innerText.replace(/\s+/g, ' ').slice(0, 500)
    };
  });

  console.log('After submit:', afterText);

  await browser.close();
}

testLandReact();
