import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function testDielAndMaster() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test DI-EL
  console.log('--- Checking DI-EL Tool (#4846) ---');
  const p1 = await browser.newPage();
  p1.on('response', async resp => {
    if (resp.url().includes('fluentform') || resp.url().includes('admin-ajax.php')) {
      try {
        const text = await resp.text();
        console.log(`[DI-EL Ajax Response ${resp.status()}]`, text);
      } catch (e) {}
    }
  });

  await p1.goto('https://dieltool.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
  await p1.type('#ff_1_names_first_name_', OUTREACH_PROFILE.firstName);
  await p1.type('#ff_1_names_last_name_', OUTREACH_PROFILE.lastName);
  await p1.type('#ff_1_email', OUTREACH_PROFILE.email);
  await p1.type('#ff_1_subject', OUTREACH_PROFILE.subject);
  await p1.type('#ff_1_message', OUTREACH_PROFILE.message);

  const btn = await p1.$('button.ff-btn-submit');
  console.log('Submitting DI-EL form...');
  await btn.click();
  await new Promise(r => setTimeout(r, 6000));

  const result1 = await p1.evaluate(() => {
    const success = document.querySelector('.ff-message-success, .fluentform-response-success');
    const err = document.querySelector('.error, .ff-errors-in-stack');
    return {
      success: success ? success.innerText : null,
      err: err ? err.innerText : null,
      fullAlert: document.querySelector('.text-success, .alert, .fluentform-response')?.innerText
    };
  });
  console.log('DI-EL Result:', result1);
  await p1.close();

  // Test Master Tool (#4840)
  console.log('\n--- Checking Master Tool Co. (#4840) ---');
  const p2 = await browser.newPage();
  p2.on('response', async resp => {
    if (resp.url().includes('contact-us') && resp.request().method() === 'POST') {
      console.log(`[Master Tool POST response ${resp.status()}]`);
    }
  });
  await p2.goto('https://mastertoolusa.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
  // check recaptcha
  const iframeCaptcha = await p2.$('iframe[src*="recaptcha"]');
  console.log('Master Tool has recaptcha iframe:', !!iframeCaptcha);

  await p2.type('#input_2_9', OUTREACH_PROFILE.firstName + ' ' + OUTREACH_PROFILE.lastName);
  await p2.type('#input_2_2', OUTREACH_PROFILE.email);
  await p2.type('#input_2_34', OUTREACH_PROFILE.message);

  const submitM = await p2.$('#gform_submit_button_2');
  console.log('Master Tool submit button:', !!submitM);
  if (submitM) {
    await submitM.click();
    await new Promise(r => setTimeout(r, 5000));
    const mRes = await p2.evaluate(() => {
      const gconf = document.querySelector('.gform_confirmation_message, .gform_validation_errors, .gfield_error');
      return {
        conf: gconf ? gconf.innerText : null,
        url: window.location.href
      };
    });
    console.log('Master Tool Result:', mRes);
  }
  await p2.close();

  await browser.close();
}

testDielAndMaster().catch(console.error);
