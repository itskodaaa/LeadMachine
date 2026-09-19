import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function testMoffatt() {
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  try {
    await page.goto('https://www.moffattnichol.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Opened Moffatt contact page');
    
    // Check if reCAPTCHA or turnstile
    const captchas = await page.evaluate(() => {
      return {
        recaptcha: !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"]'),
        turnstile: !!document.querySelector('.cf-turnstile, iframe[src*="turnstile"]')
      };
    });
    console.log('Captchas:', captchas);

    // Fill form
    await page.type('#Name', 'Pamela Jameson', { delay: 20 });
    await page.type('#Title', 'Purchasing Director', { delay: 20 });
    await page.type('#Email', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });
    await page.type('#Phone', '708-568-3708', { delay: 20 });
    await page.type('#Company-Name', 'Northeast Precision Machinery, Inc.', { delay: 20 });

    // Select country
    await page.select('#Country', 'United States'); // or whatever options exist
    const selectedCountry = await page.$eval('#Country', el => el.value);
    console.log('Selected country:', selectedCountry);

    await page.type('#Project-Description', 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nThank you,\nPamela Jameson', { delay: 10 });

    console.log('Submitting form...');
    const submitBtn = await page.$('#wf-form-General-Contact-Form input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 5000));

    // Check for success or error
    const result = await page.evaluate(() => {
      const done = document.querySelector('.w-form-done');
      const fail = document.querySelector('.w-form-fail');
      return {
        doneStyle: done ? window.getComputedStyle(done).display : null,
        doneText: done ? done.innerText : null,
        failStyle: fail ? window.getComputedStyle(fail).display : null,
        failText: fail ? fail.innerText : null
      };
    });
    console.log('Submission result:', result);

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

testMoffatt();
