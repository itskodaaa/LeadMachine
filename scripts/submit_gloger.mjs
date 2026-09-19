import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testSubmitGloger() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.request().method() === 'POST' || res.url().includes('contact')) {
      try {
        console.log('Response:', res.status(), res.url());
      } catch (e) {}
    }
  });

  await page.goto('https://glogerengineers.com/contact_us', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.type('input[id*="38211214"]', 'Pamela');
  await page.type('input[id*="38211217"]', 'Jameson');
  await page.type('input[id*="38211220"]', 'pamela.jameson@nortiheastprecision.com');
  await page.type('input[id*="38211223"]', '708-568-3708');
  await page.type('textarea[id*="38211226"]', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.');
  await page.type('input[id*="38211229"]', 'Northeast Precision Machinery, Inc.');

  console.log('Clicking Submit button...');
  const submitBtn = await page.evaluateHandle(() => {
    const btns = Array.from(document.querySelectorAll('input[type="submit"], button, .btn'));
    return btns.find(b => (b.innerText || b.value || '').toLowerCase().trim() === 'submit');
  });

  if (submitBtn) {
    await submitBtn.click();
  }

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    return {
      currentUrl: window.location.href,
      hasThanks: text.toLowerCase().includes('thank') || text.toLowerCase().includes('thanks') || text.toLowerCase().includes('received') || text.toLowerCase().includes('sent') || text.toLowerCase().includes('success'),
      bodySnippet: text.slice(0, 500)
    };
  });

  console.log('Gloger result:', JSON.stringify(result, null, 2));
  await browser.close();
}
testSubmitGloger();
