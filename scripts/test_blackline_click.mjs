import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  console.log('Navigating to homepage...');
  await page.goto('https://blackline-eng.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('Homepage loaded! Clicking contact link...');
  await page.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(el => el.href.includes('/contact/'));
    if (a) a.click();
  });
  console.log('Waiting 8s...');
  await new Promise(r => setTimeout(r, 8000));
  console.log('Current URL:', page.url());
  console.log('Title:', await page.title());
  const forms = await page.evaluate(() => {
    const form = document.querySelector('form#gform_1');
    return form ? { id: form.id, inputs: Array.from(form.querySelectorAll('input, textarea')).map(i => i.name) } : null;
  });
  console.log('Form details:', forms);
  await browser.close();
}
run();
