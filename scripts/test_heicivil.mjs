import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  first: 'Pamela',
  last: 'Jameson',
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention.'
};

async function testHeiCivil() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  console.log('Navigating to HEI Civil contact page...');
  await page.goto('https://heicivil.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Inspect the submit button and fields
  const buttonInfo = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('form#gform_1 button, form#gform_1 input[type="submit"]')).map(b => ({
      tagName: b.tagName,
      id: b.id,
      type: b.type,
      text: b.innerText || b.value
    }));
    return btns;
  });
  console.log('Submit button info:', buttonInfo);

  // Fill in the form properly
  const fillResult = await page.evaluate((profile) => {
    const form = document.querySelector('form#gform_1');
    if (!form) return { success: false, error: 'form not found' };

    // Location dropdown
    const locSelect = document.querySelector('select#input_1_1');
    if (locSelect) {
      locSelect.value = 'Texas – Austin';
      locSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Department dropdown
    const deptSelect = document.querySelector('select#input_1_3');
    if (deptSelect) {
      deptSelect.value = 'General Inquiry';
      deptSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Name
    const firstName = document.querySelector('input#input_1_4_3');
    if (firstName) {
      firstName.value = profile.first;
      firstName.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const lastName = document.querySelector('input#input_1_4_6');
    if (lastName) {
      lastName.value = profile.last;
      lastName.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const title = document.querySelector('input#input_1_4_8');
    if (title) {
      title.value = 'Representative';
      title.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Phone
    const phone = document.querySelector('input#input_1_5');
    if (phone) {
      phone.value = profile.phone;
      phone.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Email
    const email = document.querySelector('input#input_1_6');
    if (email) {
      email.value = profile.email;
      email.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Company
    const comp = document.querySelector('input#input_1_7');
    if (comp) {
      comp.value = profile.company;
      comp.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Message
    const msg = document.querySelector('textarea#input_1_8');
    if (msg) {
      msg.value = profile.message;
      msg.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Check honey pot or spam field
    // Notice input_10 was labeled "URL" or similar - let's see if it's hidden or honeypot
    const field10 = document.querySelector('#field_1_10');
    const isField10Hidden = field10 ? (field10.offsetParent === null || window.getComputedStyle(field10).display === 'none' || window.getComputedStyle(field10).visibility === 'hidden') : false;

    // Click submit
    const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      submitBtn.click();
      return { success: true, isField10Hidden, clickedBtn: submitBtn.id || submitBtn.className };
    }
    return { success: false, error: 'no submit button inside form' };
  }, OUTREACH);

  console.log('Fill & submit result:', fillResult);

  // Wait 8 seconds for AJAX or navigation
  await new Promise(r => setTimeout(r, 8000));

  const postSubmit = await page.evaluate(() => {
    const confMsg = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, #gform_confirmation_message_1')?.innerText;
    const errors = document.querySelector('.gform_validation_errors, .validation_error, .gfield_description.validation_message')?.innerText;
    const formStillThere = !!document.querySelector('form#gform_1');
    return {
      confMsg,
      errors,
      formStillThere,
      bodyTextSnippet: document.body.innerText.substring(0, 1000)
    };
  });

  console.log('Post submit result:', postSubmit);

  await page.close();
  await browser.close();
}

testHeiCivil();
