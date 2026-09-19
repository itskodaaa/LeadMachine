import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkIMS() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://www.imsengineers.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const text = await page.evaluate(() => document.body.innerText);
    console.log('IMS Contact page full text:\n', text);
  } catch (e) {
    console.log('IMS error:', e.message);
  } finally {
    await page.close();
    await browser.close();
  }
}

checkIMS();
