import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testVista() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on('request', req => {
      const rt = req.resourceType();
      if (['media', 'font'].includes(rt)) req.abort();
      else req.continue();
    });

    console.log('Navigating to Vista Projects...');
    await page.goto('https://www.vistaprojects.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Loaded Vista Projects! Title:', await page.title());

    const forms = await page.evaluate(() => {
      const f = document.querySelector('#fluentform_4');
      if (!f) return null;
      return {
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select, button')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder,
          required: i.required
        }))
      };
    });
    console.log('Vista form:', JSON.stringify(forms, null, 2));

    const captcha = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], [data-recptcha_key]'),
        turnstile: !!document.querySelector('.cf-turnstile'),
      };
    });
    console.log('Vista captcha:', captcha);

  } catch (e) {
    console.log('Vista error:', e.message);
  } finally {
    await browser.close();
  }
}

testVista();
