import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your MEP engineering services and would appreciate the opportunity to explore potential collaboration. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson'
};

async function test() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    if (res.request().method() === 'POST' || res.url().includes('api') || res.url().includes('contact')) {
      console.log('Response:', res.status(), res.url());
      try {
        console.log('Body:', (await res.text()).substring(0, 300));
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://oemep.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="company"]', OUTREACH_PROFILE.company);
    await page.type('input[name="phone"]', OUTREACH_PROFILE.phone);

    // Select projectType
    await page.select('select[name="projectType"]', 'Commercial');

    // Message
    await page.type('textarea[name="message"]', OUTREACH_PROFILE.message);

    console.log('Form filled. Clicking Send Message button...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('Send Message'));
        b?.click();
      });
    }

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .alert, .success, .toast')).map(el => el.innerText);
      return {
        url: window.location.href,
        alerts,
        bodyContainsThank: text.toLowerCase().includes('thank') || text.toLowerCase().includes('sent') || text.toLowerCase().includes('received'),
        snippet: text.substring(0, 400)
      };
    });

    console.log('Post-submission result:', result);

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

test();
