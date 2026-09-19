import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express interest in your services and would appreciate the opportunity to explore potential collaboration. Kindly arrange for a representative to contact us.'
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    page.on('response', async res => {
      const u = res.url();
      if (u.includes('wix-forms') || u.includes('form') || u.includes('submission')) {
        console.log('Form Response:', res.status(), u);
        try {
          const body = await res.text();
          console.log('Response body:', body.slice(0, 300));
        } catch (_) {}
      }
    });

    await page.goto('https://www.precisionelectricaustin.com/contact', { waitUntil: 'networkidle0', timeout: 25000 });

    // Fill the exact inputs
    await page.type('#input_comp-kq7zyxcj', OUTREACH.firstName, { delay: 20 });
    await page.type('#input_comp-kq7zyxcr2', OUTREACH.lastName, { delay: 20 });
    await page.type('#input_comp-kq7zyxcu1', OUTREACH.email, { delay: 20 });
    await page.type('#input_comp-kq7zyxcx', OUTREACH.subject, { delay: 20 });
    await page.type('#textarea_comp-kq7zyxd1', OUTREACH.message, { delay: 10 });

    console.log('Inputs filled. Finding submit button...');
    const btn = await page.$('button[type="submit"]');
    console.log('Clicking button...');
    await btn.click();

    console.log('Waiting 8 seconds for response...');
    await new Promise(r => setTimeout(r, 8000));

    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Page text near form:');
    const idx = pageText.indexOf('Send Message');
    if (idx !== -1) {
      console.log(pageText.slice(idx - 100, idx + 200));
    } else {
      console.log(pageText.slice(0, 500));
    }

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

run();
