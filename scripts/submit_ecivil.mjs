import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.url().includes('feedback') || res.request().method() === 'POST') {
      try {
        console.log('Response:', res.url(), res.status(), (await res.text()).slice(0, 300));
      } catch (e) {}
    }
  });

  console.log('Navigating to https://ecivilsolutions.com/contact-us/ ...');
  await page.goto('https://ecivilsolutions.com/contact-us/', { waitUntil: 'load', timeout: 30000 });
  console.log('Loaded! Title:', await page.title());

  await page.evaluate(() => {
    const nameInput = document.querySelector('input[name="your-name"]');
    const emailInput = document.querySelector('input[name="your-email"]');
    const phoneInput = document.querySelector('input[name="phone"]');
    const subjectInput = document.querySelector('input[name="your-subject"]');
    const msgInput = document.querySelector('textarea[name="your-message"]');

    if (nameInput) nameInput.value = 'Pamela Jameson';
    if (emailInput) emailInput.value = 'pamela.jameson@nortiheastprecision.com';
    if (phoneInput) phoneInput.value = '708-568-3708';
    if (subjectInput) subjectInput.value = 'Exploring Collaboration Opportunities';
    if (msgInput) msgInput.value = 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson';

    // Dispatch input events
    [nameInput, emailInput, phoneInput, subjectInput, msgInput].forEach(el => {
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const submitBtn = document.querySelector('input.wpcf7-submit');
    if (submitBtn) {
      console.log('Clicking submit button via DOM');
      submitBtn.click();
    }
  });

  console.log('Waiting for response...');
  await new Promise(r => setTimeout(r, 7000));

  const output = await page.evaluate(() => {
    const resp = document.querySelector('.wpcf7-response-output');
    return resp ? resp.innerText : 'no .wpcf7-response-output';
  });
  console.log('Result output:', output);

  await browser.close();
}

run().catch(console.error);
