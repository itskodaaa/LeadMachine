import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://www.eagleprecisionmachining.com/contact-us/', { waitUntil: 'networkidle2', timeout: 45000 });
    console.log('Current URL:', page.url());
    const formsInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => {
        return {
          id: f.id,
          action: f.action,
          method: f.method,
          fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
            tag: el.tagName,
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            required: el.required
          }))
        };
      });
    });
    console.log('Forms info:', JSON.stringify(formsInfo, null, 2));

    const captchas = await page.evaluate(() => {
      const hasRecaptcha = !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], script[src*="recaptcha"]');
      const hasHcaptcha = !!document.querySelector('.h-captcha, iframe[src*="hcaptcha"]');
      const hasTurnstile = !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]');
      return { hasRecaptcha, hasHcaptcha, hasTurnstile };
    });
    console.log('Captchas:', captchas);
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

run();
