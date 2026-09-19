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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://houstonstructure.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input[type="submit"]')).map(b => ({
      tag: b.tagName,
      type: b.type,
      text: b.innerText,
      outerHTML: b.outerHTML.substring(0, 150)
    }));
  });
  console.log('Buttons on /contact:', buttons);

  const form = await page.evaluate(() => {
    const f = document.querySelector('form');
    return f ? f.outerHTML : 'no form';
  });
  console.log('Form on /contact:', form.substring(0, 600));

  await browser.close();
}

run();
