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
  await page.goto('https://plazaelectric.com/contact-us/', { waitUntil: 'networkidle2' });
  
  const test = await page.evaluate(() => {
    const $ = window.jQuery;
    const btn = $('.fl-contact-form .fl-button')[0];
    const events = $._data(btn, 'events');
    return {
      events: events ? Object.keys(events) : null,
      clickHandler: events?.click?.[0]?.handler?.toString()
    };
  });
  console.log('Plaza events:', test);
  await browser.close();
})();
