import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function checkFormTech() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://formtechco.com/contact-us', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  page.on('dialog', async d => {
    console.log('Dialog popped up:', d.type(), d.message());
    await d.accept();
  });

  page.on('response', async res => {
    if (res.url().includes('/api/send')) {
      console.log('POST /api/send status:', res.status());
      try {
        console.log('Response:', await res.text());
      } catch (e) {}
    }
  });

  await page.type('#fullName', 'Pamela Jameson');
  await page.type('#email', 'pamela.jameson@nortiheastprecision.com');
  await page.type('#message', 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience.');

  const btn = await page.$('#contact-form button[type="submit"], #contact-form button');
  console.log('Submit button text:', await page.evaluate(el => el.innerText, btn));
  await btn.click();

  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const info = await page.evaluate(() => {
      const alertEl = document.querySelector('[role="alert"], .alert, .toast, #contact-form, [class*="success"]');
      const formText = document.querySelector('#contact-form')?.innerText || '';
      return {
        formText,
        btnText: document.querySelector('#contact-form button')?.innerText,
        alertText: alertEl?.innerText
      };
    });
    console.log(`Sec ${i+1}:`, info);
  }

  await browser.close();
}

checkFormTech();
