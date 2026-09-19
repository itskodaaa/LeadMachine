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
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto('https://twistedmetalswelding.com', { waitUntil: 'domcontentloaded' });
  const info = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('[data-aid*="CONTACT"]'));
    return els.map(e => ({
      tag: e.tagName,
      dataAid: e.getAttribute('data-aid'),
      id: e.id,
      type: e.type,
      childInput: e.querySelector('input, textarea')?.outerHTML
    }));
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
}

run();
