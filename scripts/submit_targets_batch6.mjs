import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testSubmit1736() {
  console.log('\n========================================\nSubmitting Lead #1736: Cnc programming & machining Llc');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://cncprogramingmachining.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });

    // Scroll to form
    await page.evaluate(() => {
      const form = document.querySelector('#wpforms-form-17');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill fields using page.type
    await page.type('#wpforms-17-field_0', OUTREACH_PROFILE.fullName, { delay: 30 });
    await page.type('#wpforms-17-field_1', OUTREACH_PROFILE.email, { delay: 30 });
    await page.type('#wpforms-17-field_2', OUTREACH_PROFILE.message, { delay: 10 });

    // Ensure honeypot is empty
    await page.evaluate(() => {
      const hp = document.querySelector('#wpforms-17-field-hp');
      if (hp) hp.value = '';
    });

    console.log('Fields filled. Submitting form...');
    await page.click('#wpforms-submit-17');

    console.log('Waiting for confirmation (8s)...');
    await new Promise(r => setTimeout(r, 8000));

    const result = await page.evaluate(() => {
      const conf = document.querySelector('.wpforms-confirmation-container-17, .wpforms-confirmation-scroll, div[id*="wpforms-confirmation"]');
      const text = conf ? conf.innerText : (document.body ? document.body.innerText : '');
      return {
        confFound: !!conf,
        confText: conf ? conf.innerText.trim() : null,
        bodyHasThanks: text.toLowerCase().includes('thanks') || text.toLowerCase().includes('thank you')
      };
    });

    console.log('Result for #1736:', result);
    await page.close();
  } catch (e) {
    console.log('Error 1736:', e.message);
  }

  await browser.close();
}

async function testSubmit1738() {
  console.log('\n========================================\nSubmitting Lead #1738: Machine Building Specialties');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://mbs01.com/contact/', { waitUntil: 'domcontentloaded', timeout: 35000 });

    await page.evaluate(() => {
      const form = document.querySelector('#gform_1');
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.type('#input_1_1', OUTREACH_PROFILE.fullName, { delay: 30 });
    await page.type('#input_1_2', OUTREACH_PROFILE.email, { delay: 30 });
    await page.type('#input_1_3', '7085683708', { delay: 30 }); // masked input
    await page.type('#input_1_4', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Fields filled. Submitting Gravity Form #1738...');
    await page.click('#gform_submit_button_1');

    console.log('Waiting for confirmation (8s)...');
    await new Promise(r => setTimeout(r, 8000));

    const result = await page.evaluate(() => {
      const conf = document.querySelector('#gform_confirmation_wrapper_1, .gform_confirmation_message_1, .gform_confirmation_message');
      const text = conf ? conf.innerText : (document.body ? document.body.innerText : '');
      return {
        confFound: !!conf,
        confText: conf ? conf.innerText.trim() : null,
        bodyHasThanks: text.toLowerCase().includes('thanks') || text.toLowerCase().includes('thank you')
      };
    });

    console.log('Result for #1738:', result);
    await page.close();
  } catch (e) {
    console.log('Error 1738:', e.message);
  }

  await browser.close();
}

async function runAll() {
  await testSubmit1736();
  await testSubmit1738();
}

runAll().catch(console.error);
