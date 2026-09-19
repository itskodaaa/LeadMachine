import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function check() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://psinternationalsupply.net/', { waitUntil: 'networkidle2', timeout: 30000 });
    const html = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      return forms.length > 1 ? forms[1].outerHTML : (forms[0] ? forms[0].outerHTML : 'no form');
    });
    console.log('Form HTML:', html.slice(0, 1500));
  } finally {
    await browser.close();
  }
}

check();
