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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function test1888() {
  console.log('\n--- Testing #1888 Milan Machine Shop ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://milansmachineshop.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Navigated to contact page:', page.url());

    await page.waitForSelector('input[name="et_pb_contact_name_0"]', { timeout: 10000 });

    await page.type('input[name="et_pb_contact_name_0"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="et_pb_contact_email_0"]', OUTREACH_PROFILE.email);
    await page.type('textarea[name="et_pb_contact_message_0"]', OUTREACH_PROFILE.message);

    console.log('Fields filled. Submitting...');
    
    // Check if there is a captcha or math challenge in Divi contact form
    const captchaField = await page.$('.et_pb_contact_captcha');
    if (captchaField) {
      console.log('Found Divi math captcha, solving...');
      const mathQuestion = await page.evaluate(() => {
        const span = document.querySelector('.et_pb_contact_captcha_question');
        return span ? span.innerText : null;
      });
      console.log('Math question:', mathQuestion);
      if (mathQuestion) {
        const parts = mathQuestion.split('+').map(s => parseInt(s.trim(), 10));
        const ans = parts[0] + parts[1];
        await page.type('input.input.et_pb_contact_captcha', ans.toString());
      }
    }

    const submitBtn = await page.$('button.et_pb_contact_submit, button[name="et_builder_submit_button"]');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.click('button[type="submit"]');
    }

    console.log('Clicked submit, waiting 6 seconds...');
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const msg = document.querySelector('.et-pb-contact-message');
      const body = document.body ? document.body.innerText : '';
      return {
        msgText: msg ? msg.innerText : null,
        bodyHasThanks: /thank you|thanks|message has been sent/i.test(body)
      };
    });

    console.log('Result for #1888:', result);
  } catch (err) {
    console.log('Error #1888:', err.message);
  } finally {
    await browser.close();
  }
}

async function test1841() {
  console.log('\n--- Testing #1841 Doudney Sheet Metal ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://doudney.com/get-quote/', { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Navigated to quote page:', page.url());

    await page.waitForSelector('input[name="your-name"]', { timeout: 10000 });

    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="your-business"]', OUTREACH_PROFILE.company);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="you-phone"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="job-address"]', OUTREACH_PROFILE.address);
    await page.type('input[name="job-city"]', OUTREACH_PROFILE.city);
    await page.type('input[name="job-st"]', OUTREACH_PROFILE.state);
    await page.type('input[name="job-zip"]', OUTREACH_PROFILE.zip);

    // Select location: Miami
    await page.select('select[name="location"]', 'Miami');
    await page.select('select[name="template"]', 'no');
    await page.select('select[name="field-measure"]', 'no');

    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    console.log('Fields filled. Submitting...');
    const submitBtn = await page.$('input[type="submit"]');
    await submitBtn.click();

    console.log('Clicked submit, waiting 6 seconds...');
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output');
      return {
        response: responseOutput ? responseOutput.innerText : null,
        className: responseOutput ? responseOutput.className : null
      };
    });

    console.log('Result for #1841:', result);
  } catch (err) {
    console.log('Error #1841:', err.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await test1888();
  await test1841();
}

run();
