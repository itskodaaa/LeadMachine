import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function test3504() {
  console.log('\n--- Testing #3504 Precision Electric ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.precisionelectricaustin.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill Wix form
    await page.waitForSelector('#input_comp-kq7zyxcq', { timeout: 5000 });
    await page.type('#input_comp-kq7zyxcq', OUTREACH.fullName, { delay: 30 });
    await page.type('#input_comp-kq7zyxcs', OUTREACH.phone, { delay: 30 });
    await page.type('#input_comp-kq7zyxcu1', OUTREACH.email, { delay: 30 });
    await page.type('#input_comp-kq7zyxcx', OUTREACH.subject, { delay: 30 });
    await page.type('#textarea_comp-kq7zyxd1', OUTREACH.message, { delay: 20 });

    console.log('Fields typed. Clicking submit button...');
    const submitBtn = await page.$('button[type="submit"], button:has-text("Send Message")');
    await submitBtn.click();

    console.log('Clicked submit. Waiting 6 seconds...');
    await new Promise(r => setTimeout(r, 6000));

    const pageText = await page.evaluate(() => document.body.innerText);
    const feedback = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('[data-hook="form-message"], [role="alert"], [class*="message"], [class*="success"], [class*="alert"]')).map(el => el.innerText.trim()).filter(Boolean);
      return msgs;
    });

    console.log('Feedback elements:', feedback);
    console.log('Page text snippet around submit:', pageText.slice(pageText.indexOf('Send Message') - 100, pageText.indexOf('Send Message') + 200));

  } catch (e) {
    console.error('3504 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function test3513() {
  console.log('\n--- Testing #3513 Precision Inspection ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://precisioninspectionpllc.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Simulate mouse movements for Drupal antibot module
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.mouse.move(300, 300);

    await page.waitForSelector('#edit-submitted-name', { timeout: 5000 });
    await page.type('#edit-submitted-name', OUTREACH.fullName, { delay: 30 });
    await page.type('#edit-submitted-email', OUTREACH.email, { delay: 30 });
    await page.type('#edit-submitted-message', OUTREACH.message, { delay: 20 });

    console.log('Fields typed. Submitting form...');
    const submitBtn = await page.$('button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(e => console.log('Navigation wait:', e.message)),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log('After submit URL:', page.url());
    const text = await page.evaluate(() => document.body.innerText);
    console.log('Body text snippet:', text.slice(0, 500));

  } catch (e) {
    console.error('3513 error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await test3504();
  await test3513();
}

main();
