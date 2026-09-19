import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testSpecial() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // Test 3841: rcegroup.net
  console.log('Testing 3841: rcegroup.net');
  try {
    const res = await page.goto('http://www.rcegroup.net', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('rcegroup.net status:', res?.status(), 'url:', page.url(), 'title:', await page.title());
  } catch (e) {
    console.log('rcegroup error:', e.message);
  }

  // Test 3846: emeraldmep.com
  console.log('Testing 3846: emeraldmep.com');
  try {
    const res = await page.goto('https://emeraldmep.com/contact/', { waitUntil: 'domcontentloaded', timeout: 35000 });
    console.log('emeraldmep.com status:', res?.status(), 'url:', page.url(), 'title:', await page.title());
    const forms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        inputs: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, req: i.required
        }))
      }));
    });
    console.log('emeraldmep forms:', JSON.stringify(forms, null, 2));
  } catch (e) {
    console.log('emeraldmep error:', e.message);
  }

  await browser.close();
}

testSpecial();
