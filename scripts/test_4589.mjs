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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://highvoltage-electrical.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    console.log('URL:', page.url(), 'Title:', await page.title());

    const captchas = await page.evaluate(() => {
      const turnstiles = document.querySelectorAll('.cf-turnstile, iframe[src*="turnstile"], [data-turnstile]');
      return Array.from(turnstiles).map(t => ({
        tag: t.tagName,
        src: t.getAttribute('src'),
        class: t.className,
        sitekey: t.getAttribute('data-sitekey')
      }));
    });
    console.log('Turnstiles found:', captchas);

    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, button')).map(i => ({ name: i.name, type: i.type, id: i.id }))
      }));
    });
    console.log('Forms:', JSON.stringify(forms, null, 2));

  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
