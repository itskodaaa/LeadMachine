import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function debug4425() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));
  page.on('response', async res => {
    if (res.url().includes('dmform') || res.request().method() === 'POST') {
      console.log('POST/dmform response:', res.status(), res.url());
      try {
        console.log('Response body:', (await res.text()).slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://www.me3eng.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  // Type carefully
  await page.type('input[name="dmform-0"]', 'Pamela Jameson', { delay: 50 });
  await page.type('input[name="dmform-1"]', 'pamela.jameson@nortiheastprecision.com', { delay: 50 });
  await page.type('input[name="dmform-2"]', '7085683708', { delay: 50 });
  await page.type('textarea[name="dmform-3"]', 'Hello, I am reaching out to express our interest in your engineering services and explore potential collaboration. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson', { delay: 20 });

  await new Promise(r => setTimeout(r, 1000));
  console.log('Clicking submit...');
  await page.click('input[type="submit"]');

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
}

debug4425();
