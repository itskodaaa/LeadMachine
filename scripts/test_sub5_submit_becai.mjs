import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, We are reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you, Pamela Jameson'
};

async function submitBecai() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('response', async res => {
    if (res.request().method() === 'POST') {
      try {
        const text = await res.text();
        if (res.url().includes('wix') || res.url().includes('form') || res.url().includes('submission')) {
          console.log(`Becai POST [${res.status()}]: ${res.url()}`);
          console.log(`Response text: ${text.slice(0, 300)}`);
        }
      } catch (e) {}
    }
  });

  await page.goto('https://www.becaielectric.com/', { waitUntil: 'networkidle2', timeout: 35000 });

  // Scroll form into view
  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) form.scrollIntoView();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Focus and type into each field
  console.log('Typing name...');
  await page.focus('#input_comp-mbqf5yg13');
  await page.keyboard.type(PROFILE.name, { delay: 20 });

  console.log('Typing email...');
  await page.focus('#input_comp-mbqf5yg86');
  await page.keyboard.type(PROFILE.email, { delay: 20 });

  console.log('Typing phone...');
  await page.focus('#input_comp-mbqf5yg96');
  await page.keyboard.type(PROFILE.phone, { delay: 20 });

  console.log('Typing subject...');
  await page.focus('#input_comp-mbqf5yg913');
  await page.keyboard.type(PROFILE.subject, { delay: 20 });

  console.log('Typing message...');
  await page.focus('#textarea_comp-mbqf5yga6');
  await page.keyboard.type(PROFILE.message, { delay: 10 });

  console.log('Checking required checkbox...');
  await page.evaluate(() => {
    const cb = document.querySelector('input[type="checkbox"]');
    if (cb && !cb.checked) {
      cb.click();
    }
  });
  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking Send button...');
  const sendBtn = await page.$('button[aria-label="Send"], button[data-testid="buttonElement"]');
  if (sendBtn) {
    await sendBtn.click();
    console.log('Send button clicked, waiting 8 seconds...');
    await new Promise(r => setTimeout(r, 8000));
  } else {
    console.log('Send button not found');
  }

  const result = await page.evaluate(() => {
    const allText = document.body.innerText;
    const notifications = Array.from(document.querySelectorAll('[data-testid*="notification"], [class*="notification"], [id*="notification"], p, span'))
      .map(el => el.innerText?.trim())
      .filter(t => t && (
        t.toLowerCase().includes('thank') ||
        t.toLowerCase().includes('message has been sent') ||
        t.toLowerCase().includes('submitted') ||
        t.toLowerCase().includes('we received') ||
        t.toLowerCase().includes('error')
      ));
    return {
      notifications: Array.from(new Set(notifications)),
      url: window.location.href,
      bodySnippetAroundForm: document.querySelector('form')?.innerText
    };
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  await browser.close();
}

submitBecai();
