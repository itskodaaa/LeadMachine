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

async function testSubmitCanibble() {
  console.log('\n========================================\nTesting #4237 Turner Precision (CaNibble Tools)');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('https://canibbletools.com/pages/contact-canibble', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Fill inputs
    await page.type('#ContactForm-name', OUTREACH_PROFILE.fullName);
    await page.type('#ContactForm-email', OUTREACH_PROFILE.email);
    await page.type('#ContactForm-phone', OUTREACH_PROFILE.phone);
    await page.type('#ContactForm-body', OUTREACH_PROFILE.message);

    console.log('Filled form. Submitting...');
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).catch(e => console.log('Navigation event:', e.message)),
      page.click('#ContactForm button[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const url = page.url();
    const content = await page.evaluate(() => document.body.innerText);
    console.log('Current URL after submit:', url);
    const hasThanks = /thanks|thank you|we'll get in touch|message sent|received your/i.test(content);
    console.log('Confirmation detected:', hasThanks);
    console.log('Content snippet:', content.slice(0, 400));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testSubmitTrilogy() {
  console.log('\n========================================\nTesting #4242 TRILOGY PRECISION');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('response', async resp => {
      if (resp.url().includes('contact-forms') && resp.url().includes('feedback')) {
        try {
          const json = await resp.json();
          console.log('CF7 Feedback Response:', JSON.stringify(json));
        } catch (e) {}
      }
    });

    await page.goto('https://trilogyprecision.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="your-phone"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('textarea[name="your-message"]', OUTREACH_PROFILE.message);

    console.log('Filled Trilogy form. Submitting...');
    await page.click('form.wpcf7-form input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));
    const output = await page.evaluate(() => {
      const respOutput = document.querySelector('.wpcf7-response-output');
      return respOutput ? respOutput.innerText : null;
    });
    console.log('CF7 DOM response output:', output);
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testSubmitRockwell() {
  console.log('\n========================================\nTesting #4241 Rockwell Precision');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('response', resp => {
      if (resp.url().includes('rockwellprecision.com')) {
        console.log(`[Resp] ${resp.status()} ${resp.url()}`);
      }
    });

    await page.goto('https://rockwellprecision.com/contact/', { waitUntil: 'networkidle2', timeout: 20000 });
    
    // Inspect form 7 inputs in detail
    const fields = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('#gform_7 input, #gform_7 textarea')).map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        label: el.labels && el.labels[0] ? el.labels[0].innerText : ''
      }));
    });
    console.log('Rockwell form fields:', JSON.stringify(fields, null, 2));

  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testSubmitPrecisionMach() {
  console.log('\n========================================\nTesting #4243 Precision Machinery Contractors');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('response', async resp => {
      if (resp.url().includes('wix') && (resp.url().includes('form') || resp.url().includes('submit'))) {
        console.log(`[Wix Form Resp] ${resp.status()} ${resp.url().slice(0, 100)}`);
      }
    });

    await page.goto('https://www.precisionmachllc.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    
    await page.type('#input_comp-kq7zyxcj', OUTREACH_PROFILE.firstName);
    await page.type('#input_comp-kq7zyxcr2', OUTREACH_PROFILE.lastName);
    await page.type('#input_comp-kq7zyxcu1', OUTREACH_PROFILE.email);
    await page.type('#input_comp-kwn5p6jw', OUTREACH_PROFILE.phone);
    await page.type('#input_comp-kq7zyxcx', OUTREACH_PROFILE.company);
    await page.type('#textarea_comp-kq7zyxd1', OUTREACH_PROFILE.message);

    console.log('Filled Wix form. Clicking submit...');
    await page.click('#comp-kq7zyxc01 button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const btn = document.querySelector('#comp-kq7zyxc01 button[type="submit"]');
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-testid="notifications"], .notifications, [class*="success"], [class*="message"]')).map(el => el.innerText);
      return { btnText: btn ? btn.innerText : null, alerts, pageText: document.body.innerText.slice(0, 500) };
    });
    console.log('Wix submit result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testSubmitTitanium() {
  console.log('\n========================================\nTesting #4244 Titanium Engineers');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('response', async resp => {
      if (resp.url().includes('formSubmitAjax.php')) {
        try {
          const txt = await resp.text();
          console.log('[Weebly Resp]', resp.status(), txt);
        } catch (e) {}
      }
    });

    await page.goto('https://www.titaniumengineers.com/request-a-quote.html', { waitUntil: 'networkidle2', timeout: 20000 });
    
    await page.type('#input-825472944891523769', OUTREACH_PROFILE.firstName);
    await page.type('#input-825472944891523769-1', OUTREACH_PROFILE.lastName);
    await page.type('#input-346001875812142730', OUTREACH_PROFILE.email);
    await page.type('#input-639320241662572479', OUTREACH_PROFILE.phone);
    await page.type('#input-797669080850384012', OUTREACH_PROFILE.message);

    console.log('Filled Weebly form. Clicking submit...');
    await page.click('#form-443528741528713041 input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      return document.body.innerText.slice(0, 500);
    });
    console.log('Weebly result snippet:', result);
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testSubmitCanibble();
  await testSubmitTrilogy();
  await testSubmitRockwell();
  await testSubmitPrecisionMach();
  await testSubmitTitanium();
}

run();
