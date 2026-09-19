import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const P = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  zip: '33610',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.'
};

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.request().method() === 'POST') {
      console.log('NET POST:', res.url(), res.status());
      try { console.log('Body:', (await res.text()).slice(0, 200)); } catch (e) {}
    }
  });

  await page.goto('https://www.tampametalworksinc.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  console.log('Typing fields into Tampa Metal Works...');
  await page.type('input[name="dmform-0"]', P.fullName, { delay: 25 });
  await page.type('input[name="dmform-1"]', P.email, { delay: 25 });
  await page.type('input[name="dmform-2"]', P.phone, { delay: 25 });
  await page.type('input[name="dmform-4"]', P.zip, { delay: 25 });
  await page.type('textarea[name="dmform-3"]', P.message, { delay: 15 });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Submit button with mouse click...');
  const submitBtn = await page.$('input[name="submit"]');
  if (submitBtn) {
    const box = await submitBtn.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    } else {
      await submitBtn.click();
    }
  }

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const popup = document.querySelector('.dmform-success, .dm-form-response, .form-success, [class*="success"]')?.innerText;
    return {
      popup,
      body: document.body.innerText.slice(0, 400)
    };
  });
  console.log('Tampa Metal Works result:', result);

  await browser.close();
})();
