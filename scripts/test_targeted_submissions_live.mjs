import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // --- 1. Rocha Controls (#3901) ---
  console.log('\n--- Testing #3901: Rocha Controls ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.rochacontrols.com/contact', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill inputs
    await page.type('input[name*="dynamic-form"][type="text"]', PROFILE.fullName);
    await page.type('input[name*="dynamic-form"][type="email"]', PROFILE.email);
    await page.type('textarea[name*="dynamic-form"]', PROFILE.message);

    // Leave captcha input empty! (Honeypot)

    // Listen to network responses
    page.on('response', async resp => {
      if (resp.url().includes('rochacontrols.com')) {
        console.log(`[Rocha Response] ${resp.status()} ${resp.url()}`);
      }
    });

    console.log('Clicking Rocha submit button...');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(e => console.log('Nav:', e.message)),
        submitBtn.click()
      ]);
    }

    await new Promise(r => setTimeout(r, 3000));
    const rochaResult = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('.alert, .alert-success, .alert-danger, .jw-element-form-alert, .form-success, .success-message')).map(e => e.innerText);
      const text = document.body.innerText;
      return { alerts, textSnippet: text.slice(0, 600) };
    });
    console.log('Rocha Submission Result:', JSON.stringify(rochaResult, null, 2));
    await page.close();
  } catch (e) {
    console.log('Rocha Error:', e.message);
  }

  // --- 2. J&R Precision Drilling (#3893) ---
  console.log('\n--- Testing #3893: J&R Precision Drilling ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://jrpdrilling.com/contact/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="your-name"]', PROFILE.fullName);
    await page.type('input[name="your-email"]', PROFILE.email);
    await page.type('input[name="your-subject"]', PROFILE.subject);
    await page.type('textarea[name="your-message"]', PROFILE.message);

    console.log('Clicking J&R submit button...');
    await page.click('input[type="submit"]');

    // Wait for CF7 response
    await new Promise(r => setTimeout(r, 6000));

    const jrResult = await page.evaluate(() => {
      const out = document.querySelector('.wpcf7-response-output');
      return {
        output: out?.innerText,
        classes: out?.className,
        formClasses: document.querySelector('form.wpcf7-form')?.className
      };
    });
    console.log('J&R Submission Result:', JSON.stringify(jrResult, null, 2));
    await page.close();
  } catch (e) {
    console.log('J&R Error:', e.message);
  }

  // --- 3. Electrical Engineering Enterprises (#3899) ---
  console.log('\n--- Testing #3899: Electrical Engineering Enterprises ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.electricalengineeringenterprises.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    const form = await page.$('form.wpcf7-form');
    if (form) {
      await page.type('form.wpcf7-form input[name="Name"]', PROFILE.fullName);
      await page.type('form.wpcf7-form input[name="your-email"]', PROFILE.email);
      await page.type('form.wpcf7-form input[name="Phone"]', PROFILE.phone);
      await page.type('form.wpcf7-form input[name="your-subject"]', PROFILE.subject);
      await page.type('form.wpcf7-form textarea[name="your-message"]', PROFILE.message);

      console.log('Clicking EEE submit button...');
      await page.click('form.wpcf7-form input[type="submit"]');

      await new Promise(r => setTimeout(r, 6000));

      const eeeResult = await page.evaluate(() => {
        const out = document.querySelector('form.wpcf7-form .wpcf7-response-output');
        return {
          output: out?.innerText,
          classes: out?.className,
          formClasses: document.querySelector('form.wpcf7-form')?.className
        };
      });
      console.log('EEE Submission Result:', JSON.stringify(eeeResult, null, 2));
    }
    await page.close();
  } catch (e) {
    console.log('EEE Error:', e.message);
  }

  // --- 4. Custom Manufacturing & Engineering (#3895) ---
  console.log('\n--- Testing #3895: Custom Manufacturing & Engineering ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.custom-mfg-eng.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('input[name="_u811323329434582723[first]"]', PROFILE.firstName);
    await page.type('input[name="_u811323329434582723[last]"]', PROFILE.lastName);
    await page.type('input[name="_u446874073495773124"]', PROFILE.email);
    await page.type('textarea[name="_u386528933377233929"]', PROFILE.message);

    page.on('response', async resp => {
      if (resp.url().includes('formSubmitAjax.php')) {
        console.log(`[CME Ajax Response] ${resp.status()}`);
        try {
          const body = await resp.text();
          console.log(`[CME Ajax Body]`, body);
        } catch (e) {}
      }
    });

    console.log('Clicking CME submit...');
    const submitBtn = await page.$('.wsite-button, input[type="submit"], form[action*="formSubmitAjax.php"] a');
    if (submitBtn) {
      await submitBtn.click();
    }

    await new Promise(r => setTimeout(r, 6000));

    const cmeResult = await page.evaluate(() => {
      const success = document.querySelector('.wsite-form-success, #wsite-form-success, .form-success')?.innerText;
      const formHtml = document.querySelector('form[action*="formSubmitAjax.php"]')?.innerText;
      return { success, formHtml };
    });
    console.log('CME Result:', JSON.stringify(cmeResult, null, 2));
    await page.close();
  } catch (e) {
    console.log('CME Error:', e.message);
  }

  await browser.close();
}

run();
