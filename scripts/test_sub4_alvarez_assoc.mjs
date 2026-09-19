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

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testAlvarezAndAssoc() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Test #4046 Alvarez Engineers
  console.log('\n--- Testing #4046 Alvarez Engineers ---');
  const page4046 = await browser.newPage();
  try {
    await page4046.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page4046.goto('https://www.alvarezeng.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Look at form and inputs
    const formInfo = await page4046.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return null;
      return {
        inputs: Array.from(form.querySelectorAll('input, textarea, select')).map(el => ({
          name: el.name,
          type: el.type,
          value: el.value,
          checked: el.checked
        }))
      };
    });
    console.log('Alvarez form info:', JSON.stringify(formInfo, null, 2));

    // Fill the form
    await page4046.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page4046.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page4046.type('input[name="phone"]', OUTREACH_PROFILE.phone);
    await page4046.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    // Check acceptance checkbox if exists
    const checkbox = await page4046.$('input[type="checkbox"]');
    if (checkbox) {
      console.log('Found checkbox, clicking it...');
      await checkbox.click();
    }

    console.log('Submitting form...');
    await Promise.all([
      page4046.click('input[type="submit"]'),
      new Promise(resolve => setTimeout(resolve, 6000))
    ]);

    const result = await page4046.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return {
        responseText: output ? output.innerText.trim() : null,
        responseClass: output ? output.className : null,
        status: document.querySelector('form.wpcf7-form')?.getAttribute('data-status')
      };
    });
    console.log('Alvarez submission result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.error('Alvarez error:', e.message);
  } finally {
    await page4046.close();
  }

  // Test #4045 Associated Machine Co.
  console.log('\n--- Testing #4045 Associated Machine Co. ---');
  const page4045 = await browser.newPage();
  try {
    await page4045.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page4045.goto('https://www.assocmachine.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    const formInfo4045 = await page4045.evaluate(() => {
      const form = document.querySelector('form.et_pb_contact_form');
      if (!form) return null;
      return {
        inputs: Array.from(form.querySelectorAll('input, textarea, select, button')).map(el => ({
          name: el.name,
          type: el.type,
          id: el.id,
          placeholder: el.placeholder,
          text: el.innerText
        }))
      };
    });
    console.log('Assoc Machine form info:', JSON.stringify(formInfo4045, null, 2));

    await page4045.type('#et_pb_contact_name_0', OUTREACH_PROFILE.fullName);
    await page4045.type('#et_pb_contact_email_0', OUTREACH_PROFILE.email);
    await page4045.type('#et_pb_contact_phone_0', OUTREACH_PROFILE.phone);
    await page4045.type('#et_pb_contact_message_0', OUTREACH_PROFILE.message);

    // Check if there is a captcha math problem in Divi form
    const captchaText = await page4045.evaluate(() => {
      const cap = document.querySelector('.et_pb_contact_right');
      return cap ? cap.innerText : null;
    });
    console.log('Captcha text if any:', captchaText);

    console.log('Submitting Assoc Machine form...');
    await page4045.click('button.et_builder_submit_button');
    await new Promise(resolve => setTimeout(resolve, 6000));

    const result4045 = await page4045.evaluate(() => {
      const messageContainer = document.querySelector('.et-pb-contact-message');
      const body = document.body ? document.body.innerText : '';
      return {
        containerText: messageContainer ? messageContainer.innerText.trim() : null,
        url: window.location.href,
        hasThankYou: /thank you|thanks|message has been sent/i.test(body)
      };
    });
    console.log('Assoc Machine submission result:', JSON.stringify(result4045, null, 2));
  } catch (e) {
    console.error('Assoc Machine error:', e.message);
  } finally {
    await page4045.close();
  }

  await browser.close();
}

testAlvarezAndAssoc();
