import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  message: 'Hello, I am reaching out to express our interest in your precision components and manufacturing services and explore a potential business relationship. Kindly arrange for a representative to contact us. Thank you, Pamela Jameson'
};

async function test() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('response', async res => {
    if (res.url().includes('feedback') || res.url().includes('contact-form-7')) {
      try {
        console.log('CF7 status:', res.status(), 'from:', res.url());
        console.log('CF7 body:', await res.text());
      } catch (e) {}
    }
  });

  try {
    await page.goto('https://www.secsinc.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="first-name"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="last-name"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="phone"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    console.log('Fields typed. Clicking submit button (Send message)...');
    await page.click('input[type="submit"], button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const check = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return {
        text: output?.innerText,
        classes: output?.className,
        bodySnippet: document.body.innerText.substring(0, 300)
      };
    });

    console.log('Result:', check);

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

test();
