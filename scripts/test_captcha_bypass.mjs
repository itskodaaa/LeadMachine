import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { getOrInstallChrome } from '../lead-machine/worker.mjs';

puppeteer.use(StealthPlugin());
const chromeBin = getOrInstallChrome();

async function run() {
  console.log('--- Testing Google reCAPTCHA v2 Demo with Puppeteer Stealth ---');
  const browser = await puppeteer.launch({
    executablePath: chromeBin,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,768'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  await page.goto('https://www.google.com/recaptcha/api2/demo', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));

  const frameHandle = await page.$('iframe[title="reCAPTCHA"]');
  if (frameHandle) {
    const frame = await frameHandle.contentFrame();
    console.log('✅ reCAPTCHA anchor frame found!');
    const checkbox = await frame.$('#recaptcha-anchor');
    if (checkbox) {
      console.log('Clicking #recaptcha-anchor checkbox...');
      await checkbox.click();
      await new Promise(r => setTimeout(r, 3500));
      const ariaChecked = await checkbox.evaluate(el => el.getAttribute('aria-checked'));
      console.log('aria-checked status:', ariaChecked);
      const token = await page.evaluate(() => {
        const t = document.querySelector('textarea[name="g-recaptcha-response"]');
        return t ? t.value : '';
      });
      console.log('Token length:', token.length);
      if (ariaChecked === 'true' || token.length > 0) {
        console.log('🎉 SUCCESS: reCAPTCHA passed seamlessly!');
      } else {
        console.log('Challenge image grid presented (expected for standard headless without audio/human solving).');
      }
    }
  } else {
    console.log('reCAPTCHA frame not found.');
  }

  await browser.close();
}

run();
