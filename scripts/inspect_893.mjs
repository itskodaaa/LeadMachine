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
  await page.goto('https://grantpllc.com/contact/', { waitUntil: 'networkidle2' });
  
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  const info = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form')).map(f => {
      return {
        action: f.action,
        method: f.method,
        id: f.id,
        className: f.className,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          type: i.type,
          placeholder: i.placeholder,
          id: i.id,
          required: i.required
        })),
        buttons: Array.from(f.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value)
      };
    });

    const captchas = Array.from(document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], [data-sitekey]')).map(c => ({
      src: c.src,
      className: c.className,
      sitekey: c.getAttribute('data-sitekey')
    }));

    return { forms, captchas, bodySnippet: document.body.innerText.slice(0, 1500) };
  });

  console.log('Grant Contact Info:', JSON.stringify(info, null, 2));
  await browser.close();
})();
