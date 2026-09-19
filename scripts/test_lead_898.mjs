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
  
  page.on('response', async res => {
    if (res.url().includes('api') || res.request().method() === 'POST') {
      console.log('API Response:', res.status(), res.url());
      try {
        console.log('Response body:', (await res.text()).slice(0, 300));
      } catch(e) {}
    }
  });

  await page.goto('https://nybuildingengineering.com/', { waitUntil: 'networkidle2' });
  
  const inputs = await page.$$('input[placeholder="Your name"]');
  if (inputs.length) await inputs[0].type('Pamela Jameson', { delay: 10 });
  
  const comp = await page.$$('input[placeholder="Company or firm name"]');
  if (comp.length) await comp[0].type('Northeast Precision Machinery, Inc.', { delay: 10 });

  const email = await page.$$('input[placeholder="your@email.com"]');
  if (email.length) await email[0].type('pamela.jameson@nortiheastprecision.com', { delay: 10 });

  const phone = await page.$$('input[placeholder="(347) 000-0000"]');
  if (phone.length) await phone[0].type('708-568-3708', { delay: 10 });

  const addr = await page.$$('input[placeholder*="address"]');
  if (addr.length) await addr[0].type('100 Main St, Chicago, IL 60601', { delay: 10 });

  await page.evaluate(() => {
    const selects = document.querySelectorAll('select');
    if (selects[0]) { selects[0].selectedIndex = 1; selects[0].dispatchEvent(new Event('change', { bubbles: true })); }
    if (selects[1]) { selects[1].selectedIndex = 1; selects[1].dispatchEvent(new Event('change', { bubbles: true })); }
  });

  const msg = await page.$$('textarea');
  if (msg.length) await msg[0].type('Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nThank you,\nPamela Jameson', { delay: 5 });

  console.log('Fields filled. Submitting...');
  
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('Send Request'));
    if (b) { b.click(); return true; }
    return false;
  });
  console.log('Clicked send button:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const postSubmitText = await page.evaluate(() => {
    const contactSec = document.querySelector('#contact') || document.body;
    return contactSec.innerText;
  });
  console.log('Post submit text snippet:\n', postSubmitText.slice(0, 500));

  await browser.close();
})();
