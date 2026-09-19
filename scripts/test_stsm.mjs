import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://southtexassheetmetal.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  const fName = await page.$('input[aria-label="First Name"]');
  await fName.focus();
  await page.keyboard.type('Pamela', { delay: 30 });
  await page.keyboard.press('Tab');
  await new Promise(r => setTimeout(r, 500));

  const state = await page.evaluate(() => {
    const el = document.querySelector('input[aria-label="First Name"]');
    return {
      value: el.value,
      emptyState: el.getAttribute('data-empty-state'),
      parentEmpty: el.parentElement.getAttribute('data-empty-state')
    };
  });
  console.log('After Tab:', state);

  await browser.close();
}
test();
