import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const P = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.'
};

(async () => {
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async (res) => {
    if (res.request().method() === 'POST' || res.url().includes('email') || res.url().includes('form') || res.url().includes('message')) {
      console.log('NET:', res.url(), res.status());
      try {
        console.log('Body:', (await res.text()).slice(0, 300));
      } catch (e) {}
    }
  });

  await page.goto('https://advantagesteelinc.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Find inputs by id or query
  console.log('Typing into Advantage Steel form...');
  const nameInput = await page.$('input[id*="19605"], input[aria-label*="name" i]');
  const emailInput = await page.$('input[id*="19606"], input[type="email"], input[aria-label*="email" i]');
  const phoneInput = await page.$('input[id*="19607"], input[type="tel"], input[aria-label*="phone" i]');
  const msgInput = await page.$('textarea');

  console.log({ nameInput: !!nameInput, emailInput: !!emailInput, phoneInput: !!phoneInput, msgInput: !!msgInput });

  if (nameInput) await nameInput.type(P.fullName, { delay: 20 });
  if (emailInput) await emailInput.type(P.email, { delay: 20 });
  if (phoneInput) await phoneInput.type(P.phone, { delay: 20 });
  if (msgInput) await msgInput.type(P.message, { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Send button...');
  const sendBtn = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => x.innerText.trim().toUpperCase() === 'SEND');
    if (b) {
      b.click();
      return b.innerText.trim();
    }
    return null;
  });
  console.log('Clicked:', sendBtn);

  await new Promise(r => setTimeout(r, 7000));

  const result = await page.evaluate(() => {
    const alert = document.querySelector('[role="alert"], [data-aid*="SUCCESS"], .form-response')?.innerText;
    const body = document.body.innerText;
    return {
      alert,
      snippet: body.slice(body.indexOf('SEND') > -1 ? body.indexOf('SEND') - 200 : 0, 800)
    };
  });
  console.log('Advantage Steel result:', result);

  await browser.close();
})();
