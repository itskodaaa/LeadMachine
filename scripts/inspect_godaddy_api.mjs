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
  await page.goto('https://lecgitx.com/', { waitUntil: 'networkidle2', timeout: 20000 });

  page.on('request', req => {
    if (req.method() === 'POST') {
      console.log('POST Request:', req.url(), req.postData()?.substring(0, 150));
    }
  });

  // Type with real keystrokes using page.focus and page.keyboard.type
  const inputs = await page.$$('form input[type="text"]:not([name="_app_id"]), form textarea');
  console.log('Found inputs:', inputs.length);
  if (inputs.length >= 4) {
    await inputs[0].click();
    await page.keyboard.type('Pamela Jameson', { delay: 20 });
    await inputs[1].click();
    await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 20 });
    await inputs[2].click();
    await page.keyboard.type('7085683708', { delay: 20 });
    await inputs[3].click();
    await page.keyboard.type('Hello, inquiring about structural engineering services for upcoming projects.', { delay: 20 });
  }

  console.log('Clicking SEND button...');
  const sendBtn = await page.$('button[data-ux="ButtonPrimary"], form button');
  if (sendBtn) {
    await sendBtn.click();
  }

  await new Promise(r => setTimeout(r, 6000));
  const messages = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('[role="alert"], [data-ux*="Alert"], [class*="success"], [class*="alert"]')).map(el => el.innerText);
  });
  console.log('Alert messages on page:', messages);

  await browser.close();
}

run();
