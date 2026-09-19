import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function test4673() {
  console.log('\n--- Testing 4673 (ALI Electrical & Lighting) ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://artisticlightinginstalls.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill first name
    await page.type('input[name="form_fields[name]"]', OUTREACH_PROFILE.firstName, { delay: 30 });
    // Fill last name
    await page.type('input[name="form_fields[field_1d9ca8d]"]', OUTREACH_PROFILE.lastName, { delay: 30 });
    // Fill email
    const emailInputs = await page.$$('input[name="form_fields[email]"]');
    for (const inp of emailInputs) {
      const isVis = await inp.isIntersectingViewport();
      if (isVis) {
        await inp.type(OUTREACH_PROFILE.email, { delay: 30 });
      }
    }
    // Fill phone
    await page.type('input[name="form_fields[field_4db8d95]"]', OUTREACH_PROFILE.phone, { delay: 30 });
    // Fill message
    await page.type('textarea[name="form_fields[field_2e1ab97]"]', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Fields filled. Submitting...');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('URL after submit:', page.url());
      const hasConfirm = /thank you|received|sent|successfully|in touch/i.test(pageText);
      console.log('Has confirmation text?', hasConfirm);
      console.log('Snippet:', pageText.slice(0, 400).replace(/\n+/g, ' '));
    }
  } catch (e) {
    console.log('Error 4673:', e.message);
  } finally {
    await browser.close();
  }
}

test4673().catch(console.error);
