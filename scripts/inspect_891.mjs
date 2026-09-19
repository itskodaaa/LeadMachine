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
  await page.goto('https://diaseng.com/index.php/m-contact-us', { waitUntil: 'domcontentloaded', timeout: 20000 });
  
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  const info = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form')).map(f => {
      return {
        action: f.action,
        method: f.method,
        html: f.outerHTML.slice(0, 500),
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

    const bodyText = document.body ? document.body.innerText : '';
    return { forms, bodySnippet: bodyText.slice(0, 1000) };
  });

  console.log('Page info:', JSON.stringify(info, null, 2));
  await browser.close();
})();
