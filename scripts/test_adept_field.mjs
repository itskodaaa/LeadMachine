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
  await page.goto('https://adeptengineering.com/', { waitUntil: 'networkidle2' });
  
  await page.focus('#wpforms-78286-field_2');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com');

  const val = await page.evaluate(() => document.getElementById('wpforms-78286-field_2').value);
  console.log('Value in field_2 after focus+type:', JSON.stringify(val));

  const isValid = await page.evaluate(() => {
    const el = document.getElementById('wpforms-78286-field_2');
    return window.jQuery(el).valid();
  });
  console.log('Is valid:', isValid);

  await browser.close();
})();
