import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const sleep = ms => new Promise(r => setTimeout(r, ms));

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  location: 'Houston, TX',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function runSubmits() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // --- Lead 4180: Langford Engineering ---
  console.log('\n--- Testing #4180 Langford Engineering ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    await page.goto('https://www.langfordeng.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    const nameInput = await page.$('#input_comp-kej860in');
    const emailInput = await page.$('#input_comp-kej860iz');
    const phoneInput = await page.$('#input_comp-kej860j3');
    const addressInput = await page.$('#input_comp-kej860j7');
    const subjectInput = await page.$('#input_comp-kej860ja1');
    const msgInput = await page.$('#textarea_comp-kej860jk');

    if (nameInput) await nameInput.type(OUTREACH.fullName, { delay: 30 });
    if (emailInput) await emailInput.type(OUTREACH.email, { delay: 30 });
    if (phoneInput) await phoneInput.type(OUTREACH.phone, { delay: 30 });
    if (addressInput) await addressInput.type(OUTREACH.address, { delay: 30 });
    if (subjectInput) await subjectInput.type(OUTREACH.subject, { delay: 30 });
    if (msgInput) await msgInput.type(OUTREACH.message, { delay: 20 });

    const submitBtn = await page.$('#comp-kej860hr button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking Wix submit button...');
      await submitBtn.click();
      await sleep(7000);
      const res = await page.evaluate(() => {
        const form = document.querySelector('#comp-kej860hr');
        return {
          formText: form?.innerText || '',
          successMsg: document.querySelector('[data-testid="messagestate-success"], .notifications')?.innerText || '',
          errorMsg: document.querySelector('[data-testid="messagestate-error"]')?.innerText || ''
        };
      });
      console.log('Wix result:', JSON.stringify(res));
    }
    await page.close();
  } catch (e) {
    console.log('4180 err:', e.message);
  }

  // --- Lead 4182: RSK Engineering ---
  console.log('\n--- Testing #4182 RSK Engineering ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://rskengineering.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    // RSK gform_1 fields:
    // input_1_14: Company?
    // input_1_6_3: First Name?
    // input_1_6_6: Last Name?
    // input_1_2: Email
    // input_1_5: Phone
    // input_1_13: Message
    await page.evaluate((outreach) => {
      const f = document.querySelector('#gform_1');
      if (!f) return;
      const firstName = document.querySelector('#input_1_6_3');
      const lastName = document.querySelector('#input_1_6_6');
      const company = document.querySelector('#input_1_14');
      const email = document.querySelector('#input_1_2');
      const phone = document.querySelector('#input_1_5');
      const msg = document.querySelector('#input_1_13');

      if (firstName) firstName.value = outreach.firstName;
      if (lastName) lastName.value = outreach.lastName;
      if (company) company.value = outreach.company;
      if (email) email.value = outreach.email;
      if (phone) phone.value = outreach.phone;
      if (msg) msg.value = outreach.message;
    }, OUTREACH);

    const submitBtn = await page.$('#gform_submit_button_1');
    if (submitBtn) {
      console.log('Clicking RSK submit...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await sleep(3000);
      const res = await page.evaluate(() => {
        return {
          url: window.location.href,
          conf: document.querySelector('.gform_confirmation_message')?.innerText || '',
          err: document.querySelector('.gform_validation_errors, .validation_error')?.innerText || '',
          bodySnippet: document.body.innerText.slice(0, 400)
        };
      });
      console.log('RSK result:', JSON.stringify(res));
    }
    await page.close();
  } catch (e) {
    console.log('4182 err:', e.message);
  }

  // --- Lead 4184: Cobb, Fendley & Associates ---
  console.log('\n--- Testing #4184 Cobb Fendley ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.cobbfendley.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('#input_1_1', OUTREACH.fullName, { delay: 20 });
    await page.type('#input_1_12', OUTREACH.email, { delay: 20 });
    await page.type('#input_1_11', OUTREACH.phone, { delay: 20 });
    await page.type('#input_1_2', OUTREACH.message, { delay: 20 });

    const submitBtn = await page.$('#gform_submit_button_1');
    if (submitBtn) {
      console.log('Clicking Cobb Fendley submit...');
      await submitBtn.click();
      await sleep(6000);
      const res = await page.evaluate(() => {
        return {
          conf: document.querySelector('.gform_confirmation_message')?.innerText || '',
          err: document.querySelector('.gform_validation_errors, .validation_error')?.innerText || '',
          formWrapper: document.querySelector('#gform_wrapper_1')?.innerText || ''
        };
      });
      console.log('Cobb Fendley result:', JSON.stringify(res));
    }
    await page.close();
  } catch (e) {
    console.log('4184 err:', e.message);
  }

  // --- Lead 4185: KEA Structural Engineers ---
  console.log('\n--- Testing #4185 KEA Structural ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://keastructural.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('#name', OUTREACH.fullName, { delay: 20 });
    await page.type('#email', OUTREACH.email, { delay: 20 });
    await page.type('#phone', OUTREACH.phone, { delay: 20 });
    await page.type('#project_location', 'Houston, TX', { delay: 20 });
    await page.type('#message', OUTREACH.message, { delay: 20 });

    const submitBtn = await page.$('#contact-form107 button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking KEA Structural submit...');
      await submitBtn.click();
      await sleep(6000);
      const res = await page.evaluate(() => {
        const form = document.querySelector('#contact-form107');
        return {
          formText: form?.innerText || '',
          success: document.querySelector('.breakdance-form-success, .success-message')?.innerText || '',
          error: document.querySelector('.breakdance-form-error, .error-message')?.innerText || ''
        };
      });
      console.log('KEA result:', JSON.stringify(res));
    }
    await page.close();
  } catch (e) {
    console.log('4185 err:', e.message);
  }

  // --- Lead 4186: EZpermitsTX ---
  console.log('\n--- Testing #4186 EZpermitsTX ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://ezpermitstx.com/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await sleep(4000);

    await page.evaluate((outreach) => {
      const f1 = document.querySelector('#wpforms-18672-field_1');
      const f2 = document.querySelector('#wpforms-18672-field_2');
      const f3 = document.querySelector('#wpforms-18672-field_3');
      const f4 = document.querySelector('#wpforms-18672-field_4');
      const f5 = document.querySelector('#wpforms-18672-field_5');
      if (f1) f1.value = outreach.fullName;
      if (f2) f2.value = outreach.email;
      if (f3) f3.value = '7085683708';
      if (f4) f4.value = '77043';
      if (f5) f5.value = 'Engineering Consultation';
    }, OUTREACH);

    const submitBtn = await page.$('#wpforms-submit-18672');
    if (submitBtn) {
      console.log('Clicking EZpermitsTX submit...');
      await submitBtn.click();
      await sleep(6000);
      const res = await page.evaluate(() => {
        return {
          conf: document.querySelector('.wpforms-confirmation-container')?.innerText || '',
          err: document.querySelector('.wpforms-error-container')?.innerText || '',
          formSnippet: document.querySelector('#wpforms-form-18672')?.innerText?.slice(0, 300) || ''
        };
      });
      console.log('EZpermitsTX result:', JSON.stringify(res));
    }
    await page.close();
  } catch (e) {
    console.log('4186 err:', e.message);
  }

  // --- Lead 4187: BMG STRUCTURAL ENGINEERS ---
  console.log('\n--- Testing #4187 BMG STRUCTURAL ENGINEERS ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://bmgstructural.com/?page_id=6', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('#fieldFirstName', OUTREACH.firstName, { delay: 20 });
    await page.type('#fieldLastName', OUTREACH.lastName, { delay: 20 });
    await page.type('#fieldEmail', OUTREACH.email, { delay: 20 });
    await page.type('#fieldSubject', OUTREACH.subject, { delay: 20 });
    await page.type('#fieldMessage', OUTREACH.message, { delay: 20 });

    const submitBtn = await page.$('#contact-form button[type="submit"], #contact-form input[type="submit"]');
    if (submitBtn) {
      console.log('Clicking BMG submit...');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await sleep(3000);
      const res = await page.evaluate(() => {
        return {
          url: window.location.href,
          text: document.body.innerText.slice(0, 400)
        };
      });
      console.log('BMG result:', JSON.stringify(res));
    }
    await page.close();
  } catch (e) {
    console.log('4187 err:', e.message);
  }

  await browser.close();
}

runSubmits();
