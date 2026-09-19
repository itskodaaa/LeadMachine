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
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log('POST request:', req.url(), req.postData()?.substring(0, 150));
    }
  });
  page.on('response', async res => {
    if (res.status() >= 400) {
      console.log(`HTTP ${res.status()} ${res.url()}`);
    }
  });

  await page.goto('https://twistedmetalswelding.com', { waitUntil: 'networkidle2', timeout: 20000 });
  await page.waitForSelector('[data-aid="CONTACT_FORM_NAME"]');

  await page.type('[data-aid="CONTACT_FORM_NAME"]', 'Pamela Jameson');
  await page.type('[data-aid="CONTACT_FORM_EMAIL"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('[data-aid="CONTACT_FORM_MESSAGE"]', 'Hello, requesting a quote for upcoming custom metal fabrication work.');

  console.log('Fields typed. Clicking submit button...');
  await page.click('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

  await new Promise(r => setTimeout(r, 6000));
  await browser.close();
}

run();
