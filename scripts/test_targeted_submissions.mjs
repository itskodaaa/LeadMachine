import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  name: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function testSubmit() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 1. Lead #3893: J&R Precision Drilling
  console.log('\n--- Processing Lead #3893: J&R Precision Drilling ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://jrpdrilling.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Fill form
    await page.type('input[name="your-name"]', PROFILE.name);
    await page.type('input[name="your-email"]', PROFILE.email);
    await page.type('input[name="your-subject"]', PROFILE.subject);
    await page.type('textarea[name="your-message"]', PROFILE.message);

    console.log('Filled #3893 form. Submitting...');
    const submitBtn = await page.$('input[type="submit"]');
    await submitBtn.click();

    // wait for response or DOM changes
    await new Promise(r => setTimeout(r, 6000));

    const result3893 = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output')?.innerText;
      const bodyText = document.body.innerText;
      return { responseOutput, bodySnippet: bodyText.slice(0, 500) };
    });
    console.log('#3893 Result:', result3893.responseOutput || 'No output box found');
    await page.close();
  } catch (e) {
    console.log('Error #3893:', e.message);
  }

  // 2. Lead #3899: Electrical Engineering Enterprises
  console.log('\n--- Processing Lead #3899: Electrical Engineering Ent ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.electricalengineeringenterprises.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // The form is Form #3: name="Name", your-email, Phone, your-subject, your-message
    await page.type('form.wpcf7-form input[name="Name"]', PROFILE.name);
    await page.type('form.wpcf7-form input[name="your-email"]', PROFILE.email);
    await page.type('form.wpcf7-form input[name="Phone"]', PROFILE.phone);
    await page.type('form.wpcf7-form input[name="your-subject"]', PROFILE.subject);
    await page.type('form.wpcf7-form textarea[name="your-message"]', PROFILE.message);

    console.log('Filled #3899 form. Submitting...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const result3899 = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output')?.innerText;
      return { responseOutput };
    });
    console.log('#3899 Result:', result3899.responseOutput || 'No output box found');
    await page.close();
  } catch (e) {
    console.log('Error #3899:', e.message);
  }

  // 3. Lead #3897: Parker SMT LLC
  console.log('\n--- Processing Lead #3897: Parker SMT LLC ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://parkersmt.com/contacts/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.type('form.wpcf7-form input[name="your-name"]', PROFILE.name);
    await page.type('form.wpcf7-form input[name="your-email"]', PROFILE.email);
    await page.type('form.wpcf7-form input[name="your-subject"]', PROFILE.subject);
    await page.type('form.wpcf7-form textarea[name="your-message"]', PROFILE.message);

    console.log('Filled #3897 form. Submitting...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));

    const result3897 = await page.evaluate(() => {
      const responseOutput = document.querySelector('.wpcf7-response-output')?.innerText;
      return { responseOutput };
    });
    console.log('#3897 Result:', result3897.responseOutput || 'No output box found');
    await page.close();
  } catch (e) {
    console.log('Error #3897:', e.message);
  }

  // 4. Lead #3895: Custom Manufacturing & Engineering
  console.log('\n--- Processing Lead #3895: Custom Manufacturing & Engineering ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.custom-mfg-eng.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const formInputs = await page.evaluate(() => {
      const form = document.querySelector('form[action*="formSubmitAjax.php"]');
      if (!form) return null;
      return Array.from(form.querySelectorAll('input, textarea')).map(i => ({
        name: i.name,
        placeholder: i.placeholder,
        id: i.id,
        className: i.className,
        label: i.closest('.wsite-form-field')?.innerText
      }));
    });
    console.log('#3895 Weebly Form Fields:', JSON.stringify(formInputs, null, 2));

    await page.close();
  } catch (e) {
    console.log('Error #3895:', e.message);
  }

  // 5. Lead #3901: Rocha Controls
  console.log('\n--- Inspecting Lead #3901: Rocha Controls ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.rochacontrols.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const rochaDetails = await page.evaluate(() => {
      const captchaImg = document.querySelector('img[src*="captcha"], .captcha-image, #captcha');
      const captchaLabel = document.querySelector('label[for*="captcha"]')?.innerText;
      const formHtml = document.querySelector('form')?.innerHTML.slice(0, 1000);
      return { captchaImg: captchaImg?.outerHTML, captchaLabel, formHtml };
    });
    console.log('#3901 Rocha details:', JSON.stringify(rochaDetails, null, 2));

    await page.close();
  } catch (e) {
    console.log('Error #3901:', e.message);
  }

  // 6. Lead #3902: Keller
  console.log('\n--- Inspecting Lead #3902: Keller ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.keller-na.com/request/quote', { waitUntil: 'networkidle2', timeout: 30000 });
    
    const kellerDetails = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        action: f.action,
        fields: Array.from(f.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          type: i.type,
          id: i.id,
          placeholder: i.placeholder
        }))
      }));
      return { title: document.title, forms };
    });
    console.log('#3902 Keller Quote Details:', JSON.stringify(kellerDetails, null, 2));

    await page.close();
  } catch (e) {
    console.log('Error #3902:', e.message);
  }

  await browser.close();
}

testSubmit();
