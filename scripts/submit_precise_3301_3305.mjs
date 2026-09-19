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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

Thank you,
Pamela Jameson`
};

async function submitTargeted() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  // 1. Submit #3301 Industrial Electric
  console.log('\n--- Submitting #3301 Industrial Electric ---');
  try {
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });
    await page.goto('https://industrialelectricinc.com/contact-us-bid-request/', { waitUntil: 'domcontentloaded', timeout: 20000 });

    await page.type('#input_1_1', OUTREACH_PROFILE.fullName);
    await page.type('#input_1_4', OUTREACH_PROFILE.phone);
    await page.type('#input_1_5', OUTREACH_PROFILE.email);
    await page.type('#input_1_3', OUTREACH_PROFILE.message);

    console.log('Filled #3301 (honeypot field_1_6 left empty). Submitting...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('#gform_submit_button_1')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const res3301 = await page.evaluate(() => {
      const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
      const valError = document.querySelector('.validation_error, .gform_validation_errors');
      return {
        url: window.location.href,
        confirmation: confirmation ? confirmation.innerText : null,
        valError: valError ? valError.innerText : null,
        bodyText: document.body.innerText.slice(0, 500)
      };
    });
    console.log('3301 result:', JSON.stringify(res3301, null, 2));
    await page.close();
  } catch (e) {
    console.log('3301 submit err:', e.message);
  }

  // 2. Inspect and Submit #3305 IDS Power
  console.log('\n--- Submitting #3305 IDS Power ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://idspower.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 20000 });

    const selectOptions = await page.evaluate(() => {
      const select = document.querySelector('#input_7_18');
      return select ? Array.from(select.options).map(o => ({ value: o.value, text: o.text })) : null;
    });
    console.log('3305 select options:', selectOptions);

    await page.type('#input_7_15_3', OUTREACH_PROFILE.firstName);
    await page.type('#input_7_15_6', OUTREACH_PROFILE.lastName);
    await page.type('#input_7_16', OUTREACH_PROFILE.email);
    await page.type('#input_7_17', OUTREACH_PROFILE.phone);
    await page.type('#input_7_19', OUTREACH_PROFILE.company);
    if (selectOptions && selectOptions.length > 1) {
      await page.select('#input_7_18', selectOptions[1].value);
    }
    await page.type('#input_7_7', OUTREACH_PROFILE.message);

    console.log('Filled #3305. Checking submit button state...');
    const btnState = await page.evaluate(() => {
      const btn = document.querySelector('#gform_submit_button_7');
      return {
        exists: !!btn,
        disabled: btn?.disabled,
        display: btn ? window.getComputedStyle(btn).display : null,
        visibility: btn ? window.getComputedStyle(btn).visibility : null
      };
    });
    console.log('3305 submit button state:', btnState);

    console.log('Clicking submit on #3305...');
    await page.click('#gform_submit_button_7');
    await new Promise(r => setTimeout(r, 6000));

    const res3305 = await page.evaluate(() => {
      const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
      const valError = document.querySelector('.validation_error, .gform_validation_errors');
      return {
        url: window.location.href,
        confirmation: confirmation ? confirmation.innerText : null,
        valError: valError ? valError.innerText : null
      };
    });
    console.log('3305 result:', JSON.stringify(res3305, null, 2));
    await page.close();
  } catch (e) {
    console.log('3305 submit err:', e.message);
  }

  await browser.close();
}

submitTargeted();
