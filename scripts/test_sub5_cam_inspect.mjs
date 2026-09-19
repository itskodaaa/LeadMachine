import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testCam() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  page.on('console', msg => console.log('CAM CONSOLE:', msg.text()));
  page.on('request', req => {
    if (req.url().includes('wix') || req.method() === 'POST') {
      console.log(`CAM REQ: ${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('submission') || res.url().includes('form') || res.request().method() === 'POST') {
      console.log(`CAM RES: ${res.status()} ${res.url()}`);
    }
  });

  await page.goto('https://www.camintegrated.com/contact', { waitUntil: 'networkidle2' });

  // Let's scroll into view of the form
  await page.evaluate(() => {
    const el = document.getElementById('comp-k66juqee1');
    if (el) el.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Type directly into inputs
  console.log('Typing name...');
  await page.click('#input_comp-k66juqeu');
  await page.type('#input_comp-k66juqeu', 'Pamela Jameson', { delay: 30 });

  console.log('Typing email...');
  await page.click('#input_comp-k66juqfq');
  await page.type('#input_comp-k66juqfq', 'pamela.jameson@nortiheastprecision.com', { delay: 30 });

  console.log('Typing subject...');
  await page.click('#input_comp-k66juqgk');
  await page.type('#input_comp-k66juqgk', 'Exploring Collaboration Opportunities', { delay: 30 });

  console.log('Typing message...');
  await page.click('#textarea_comp-k66juqhm');
  await page.type('#textarea_comp-k66juqhm', 'Hello, I am reaching out to express interest in your services and request a representative contact us for potential collaboration. Sincerely, Pamela Jameson', { delay: 20 });

  console.log('Clicking submit...');
  const btn = await page.$('form#comp-k66juqee1 button, [data-testid="buttonElement"]');
  if (btn) {
    await btn.click();
    console.log('Clicked button, waiting 8 seconds...');
    await new Promise(r => setTimeout(r, 8000));
  }

  const successEl = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="form-notifications"], [aria-live="polite"], .wix-form-notification, [id*="notification"]');
    return {
      text: el ? el.innerText : null,
      html: el ? el.outerHTML : null,
      allText: document.querySelector('#comp-k66juqee1')?.innerText
    };
  });
  console.log('Form result:', successEl);

  await browser.close();
}

testCam();
