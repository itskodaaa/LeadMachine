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
  await page.goto('https://www.thorntontomasetti.com/contact-us', { waitUntil: 'networkidle2' });
  
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  const info = await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form')).map(f => ({
      action: f.action,
      method: f.method,
      className: f.className,
      id: f.id,
      inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        id: i.id
      })),
      buttons: Array.from(f.querySelectorAll('button, input[type=\"submit\"]')).map(b => b.innerText || b.value)
    }));
    const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
    return {
      forms: forms.filter(f => !f.className.includes('search')),
      iframes,
      body: document.body.innerText.slice(0, 1500)
    };
  });

  console.log('TT Info:', JSON.stringify(info, null, 2));

  await browser.close();
})();
