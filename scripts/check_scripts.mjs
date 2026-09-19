import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkSite(url, fn) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 30000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('recaptcha') || u.includes('turnstile') || u.includes('api') || u.includes('form')) {
      console.log(`[RESP ${resp.status()}] ${u.slice(0, 100)}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await fn(page);
  await browser.close();
}

async function run() {
  console.log('=== Checking One Stop Inventing ===');
  await checkSite('https://onestopinventing.com', async (page) => {
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]')).map(s => s.src).filter(s => s.includes('recaptcha') || s.includes('hcaptcha') || s.includes('turnstile') || s.includes('gravityforms'));
    });
    console.log('One Stop scripts:', scripts);
  });

  console.log('=== Checking JD-Miami ===');
  await checkSite('https://www.jd-miami.com/', async (page) => {
    const scripts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]')).map(s => s.src).filter(s => s.includes('recaptcha') || s.includes('hcaptcha') || s.includes('turnstile') || s.includes('duda'));
    });
    console.log('JD-Miami scripts:', scripts);
  });
}

run();
