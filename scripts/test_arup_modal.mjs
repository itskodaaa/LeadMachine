import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://www.arup.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Accept cookies if present to clear overlay
  await page.evaluate(() => {
    const btn = document.querySelector('#onetrust-accept-btn-handler') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Accept all'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Click 'Business enquiries'
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Business enquiries'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Inspect the form inside the modal
  const formDetails = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return { error: 'No form' };

    const selects = Array.from(form.querySelectorAll('select')).map(s => ({
      name: s.name,
      options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
    }));

    const inputs = Array.from(form.querySelectorAll('input, textarea')).map(i => ({
      name: i.name,
      type: i.type,
      required: i.required,
      placeholder: i.placeholder
    }));

    const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value);

    const captchas = Array.from(form.querySelectorAll('.g-recaptcha, iframe, [data-sitekey]')).map(c => c.src || c.className);

    return { selects, inputs, buttons, captchas };
  });

  console.log('Form Details:', JSON.stringify(formDetails, null, 2));

  await browser.close();
})();
