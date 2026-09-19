import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function debug1841() {
  console.log('\n--- Debugging #1841 Doudney Validation Errors ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://doudney.com/get-quote/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Check all required fields (fields with aria-required="true" or class wpcf7-validates-as-required)
    const requiredFields = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      return inputs.map(i => ({
        name: i.name,
        type: i.type,
        isRequired: i.hasAttribute('aria-required') || i.className.includes('required'),
        classes: i.className
      }));
    });
    console.log('Required fields in #1841:', requiredFields.filter(f => f.isRequired));

    // Fill all required fields carefully:
    await page.type('input[name="your-name"]', 'Pamela Jameson');
    await page.type('input[name="your-business"]', 'Northeast Precision Machinery, Inc.');
    await page.type('input[name="your-email"]', 'pamela.jameson@nortiheastprecision.com');
    await page.type('input[name="you-phone"]', '708-568-3708');
    await page.type('input[name="job-address"]', '100 Main St');
    await page.type('input[name="job-city"]', 'Chicago');
    await page.type('input[name="job-st"]', 'IL');
    await page.type('input[name="job-zip"]', '60601');
    
    // Checkboxes job-type[]
    await page.click('input[name="job-type[]"]'); // check at least one

    // delivery-date
    const hasDate = await page.$('input[name="delivery-date"]');
    if (hasDate) {
      await page.type('input[name="delivery-date"]', '2026-10-15');
    }

    await page.select('select[name="location"]', 'Miami');
    await page.select('select[name="template"]', 'no');
    await page.select('select[name="field-measure"]', 'no');

    await page.type('textarea[name="your-message"]', 'Hello, we are interested in exploring a potential business relationship for upcoming sheet metal projects. Kindly have a representative contact us at your earliest convenience.');

    const submitBtn = await page.$('input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const errTips = await page.evaluate(() => {
      const tips = Array.from(document.querySelectorAll('.wpcf7-not-valid-tip')).map(t => ({
        text: t.innerText,
        forField: t.previousElementSibling?.name || t.parentElement?.querySelector('input, select, textarea')?.name
      }));
      const output = document.querySelector('.wpcf7-response-output')?.innerText;
      const formClass = document.querySelector('form.wpcf7-form')?.className;
      return { output, formClass, tips };
    });

    console.log('Result after complete fill #1841:', JSON.stringify(errTips, null, 2));

  } catch (e) {
    console.log('Error in #1841:', e.message);
  } finally {
    await browser.close();
  }
}

async function debug1888() {
  console.log('\n--- Debugging #1888 Milan Machine Shop ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    page.on('dialog', async d => { console.log('Dialog:', d.message()); await d.accept(); });

    await page.goto('https://milansmachineshop.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('Loaded contact page:', page.url());

    await page.waitForSelector('form.et_pb_contact_form', { timeout: 10000 });

    await page.type('input[name="et_pb_contact_name_0"]', 'Pamela Jameson', { delay: 20 });
    await page.type('input[name="et_pb_contact_email_0"]', 'pamela.jameson@nortiheastprecision.com', { delay: 20 });
    await page.type('textarea[name="et_pb_contact_message_0"]', 'Hello, I am reaching out to express interest in your machining and welding services and would appreciate the opportunity to explore a potential collaboration. Please contact us at your earliest convenience.', { delay: 20 });

    // Check Divi captcha math problem
    const captchaText = await page.evaluate(() => {
      const captchaEl = document.querySelector('.et_pb_contact_captcha_question');
      return captchaEl ? captchaEl.innerText : null;
    });
    console.log('Divi math captcha:', captchaText);
    if (captchaText) {
      const match = captchaText.match(/(\d+)\s*\+\s*(\d+)/);
      if (match) {
        const sum = parseInt(match[1]) + parseInt(match[2]);
        console.log('Calculated sum:', sum);
        await page.type('input.input.et_pb_contact_captcha', sum.toString());
      }
    }

    console.log('Submitting Divi contact form...');
    const submitBtn = await page.$('.et_pb_contact_form button[type="submit"], .et_pb_contact_submit');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const contactMsg = document.querySelector('.et-pb-contact-message');
      const body = document.body ? document.body.innerText : '';
      return {
        contactMsg: contactMsg ? contactMsg.innerText : null,
        bodyContainsThanks: /thank|thanks|received/i.test(body)
      };
    });

    console.log('Result #1888:', result);

  } catch (e) {
    console.log('Error in #1888:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await debug1841();
  await debug1888();
}

run();
