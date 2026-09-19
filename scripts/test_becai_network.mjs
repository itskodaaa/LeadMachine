import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const requests = [];
  page.on('request', req => {
    if (req.method() === 'POST') {
      requests.push({ url: req.url(), postData: req.postData()?.slice(0, 300) });
    }
  });

  await page.goto('https://www.becaielectric.com/', { waitUntil: 'networkidle2', timeout: 35000 });
  
  // Clear requests array so we only see post-submit
  requests.length = 0;

  await page.focus('#input_comp-mbqf5yg13');
  await page.keyboard.type('Pamela Jameson');
  await page.focus('#input_comp-mbqf5yg86');
  await page.keyboard.type('pamela.jameson@nortiheastprecision.com');
  await page.focus('#input_comp-mbqf5yg96');
  await page.keyboard.type('708-568-3708');
  await page.focus('#input_comp-mbqf5yg913');
  await page.keyboard.type('Exploring Collaboration Opportunities');
  await page.focus('#textarea_comp-mbqf5yga6');
  await page.keyboard.type('Hello, We are reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson');
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) cb.click();
  });
  await new Promise(r => setTimeout(r, 500));
  
  console.log('Clicking Send...');
  const sendBtn = await page.$('button[aria-label="Send"], button[data-testid="buttonElement"]');
  await sendBtn.click();
  await new Promise(r => setTimeout(r, 6000));

  console.log('POST requests after submit:', JSON.stringify(requests, null, 2));

  // Check alert/toast/dialog or any text in whole page
  const fullText = await page.evaluate(() => document.body.innerText);
  console.log('Includes thanks?', fullText.toLowerCase().includes('thank') || fullText.toLowerCase().includes('received') || fullText.toLowerCase().includes('sent'));

  await browser.close();
})();
