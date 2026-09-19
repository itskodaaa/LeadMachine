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
  address: '100 Main St, Chicago, IL 60601',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.goto('https://houstonstructure.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });

  await page.evaluate((p) => {
    const form = document.querySelector('form[name="contact-page"]');
    if (!form) return;
    form.querySelector('input[name="name"]').value = p.fullName;
    form.querySelector('input[name="phone"]').value = p.phone;
    form.querySelector('input[name="address"]').value = p.address;
    form.querySelector('textarea[name="message"]').value = p.message;
    // Leave bot-field EMPTY!
  }, OUTREACH_PROFILE);

  page.on('response', async res => {
    if (res.request().method() === 'POST') {
      console.log(`[Houston Net] ${res.status()} ${res.url()}`);
    }
  });

  console.log('Clicking Send Request...');
  const submitSuccess = await page.evaluate(() => {
    const form = document.querySelector('form[name="contact-page"]');
    const btn = form.querySelector('button[type="submit"]');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked:', submitSuccess);

  await new Promise(r => setTimeout(r, 6000));
  console.log('Final URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  const match = bodyText.match(/(?:thank|received|success|sent)[^\n\.]*/i);
  console.log('Confirmation text snippet:', match ? match[0] : 'None');

  await browser.close();
}

run();
