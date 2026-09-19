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
  await page.goto('https://www.arup.com/contact-us/', { waitUntil: 'networkidle2' });
  
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

    // Find links on the contact-us page
    const subLinks = Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => /inquir|contact|project/i.test(l.text) || /contact|inquir/i.test(l.href));

    return { forms, captchas, subLinks: subLinks.slice(0, 10), bodySnippet: document.body.innerText.slice(0, 1000) };
  });

  console.log('Arup Contact Info:', JSON.stringify(info, null, 2));
  await browser.close();
})();
