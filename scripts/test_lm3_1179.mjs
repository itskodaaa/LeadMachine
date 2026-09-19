import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testLM3() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to https://www.lm3technologies.com/contact ...');
  await page.goto('https://www.lm3technologies.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });

  // Type into fields
  console.log('Filling fields...');
  const fName = await page.$('input[name="first-name"], #input_comp-lwh263gu3');
  if (fName) {
    await fName.click();
    await fName.type(OUTREACH_PROFILE.firstName, { delay: 30 });
  }

  const lName = await page.$('input[name="last-name"], #input_comp-lwh263gz');
  if (lName) {
    await lName.click();
    await lName.type(OUTREACH_PROFILE.lastName, { delay: 30 });
  }

  const email = await page.$('input[name="email"], #input_comp-lwh2bkmy');
  if (email) {
    await email.click();
    await email.type(OUTREACH_PROFILE.email, { delay: 30 });
  }

  const msg = await page.$('textarea, #textarea_comp-lwh263h1');
  if (msg) {
    await msg.click();
    await msg.type(OUTREACH_PROFILE.message, { delay: 10 });
  }

  // Check captcha before submitting
  const captcha = await page.evaluate(() => {
    const el = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], .cf-turnstile');
    return el ? el.outerHTML : null;
  });
  console.log('Captcha detected:', captcha);

  // Click submit
  console.log('Clicking submit...');
  const submitBtn = await page.$('button[type="submit"], [data-testid="buttonElement"]');
  if (submitBtn) {
    await submitBtn.click();
  }

  console.log('Waiting 8s for submission response...');
  await new Promise(r => setTimeout(r, 8000));

  const postSubmit = await page.evaluate(() => {
    const successMsg = document.querySelector('.wixui-form__message, [role="alert"], .success-message, [data-testid="form-message"]');
    return {
      bodyText: document.body.innerText.slice(0, 500),
      successEl: successMsg ? successMsg.innerText : null
    };
  });

  console.log('Post submit result:', postSubmit);
  await browser.close();
}

testLM3();
