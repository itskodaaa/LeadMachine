import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
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
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you,
Pamela Jameson`
};

async function checkRest() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Inspect #3306 https://www.toveyengineering.com/request-information
  console.log('\n--- Inspecting #3306 form ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.toveyengineering.com/request-information', { waitUntil: 'domcontentloaded', timeout: 20000 });
    const fInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return {
        action: form.action,
        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
          tag: i.tagName,
          name: i.name,
          id: i.id,
          type: i.type,
          placeholder: i.placeholder,
          required: i.required
        })),
        buttons: Array.from(form.querySelectorAll('button, input[type="submit"]')).map(b => b.innerText || b.value),
        captcha: !!form.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]')
      };
    });
    console.log('Tovey form:', JSON.stringify(fInfo, null, 2));
    await page.close();
  } catch (e) { console.log('3306 err:', e.message); }

  // 2. Test #3305 submit on https://idspower.com/contact-us/
  console.log('\n--- Testing #3305 submit ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://idspower.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    // Fill gravity form
    await page.type('input[name="input_1"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="input_3"]', OUTREACH_PROFILE.company);
    await page.type('input[name="input_4"]', OUTREACH_PROFILE.email);
    await page.type('input[name="input_5"]', OUTREACH_PROFILE.phone);
    await page.type('textarea[name="input_6"]', OUTREACH_PROFILE.message);

    console.log('Filled #3305. Submitting...');
    await page.click('#gform_submit_button_7');
    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      return {
        url: window.location.href,
        confirmation: document.querySelector('.gform_confirmation_message')?.innerText,
        validationErrors: Array.from(document.querySelectorAll('.gfield_validation_message, .validation_error')).map(e => e.innerText)
      };
    });
    console.log('3305 result:', JSON.stringify(res, null, 2));
    await page.close();
  } catch (e) { console.log('3305 err:', e.message); }

  // 3. Inspect #3303 Georgia-Pacific https://www.gp.com/
  console.log('\n--- Inspecting #3303 gp.com ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.gp.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ text: a.innerText.trim(), href: a.href }))
        .filter(a => /contact|inquir|support/i.test(a.text) || /contact/i.test(a.href));
    });
    console.log('3303 contact links from home:', links);
    await page.close();
  } catch (e) { console.log('3303 err:', e.message); }

  // 4. Test 3301 and 3302 with curl/fetch
  await browser.close();
}

checkRest();
