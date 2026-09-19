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
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function testTitaniumDetail() {
  console.log('\n--- Inspecting Titanium Fields ---');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('response', async resp => {
      if (resp.url().includes('formSubmitAjax.php')) {
        console.log('[Titanium Weebly Ajax Resp]', resp.status(), await resp.text());
      }
    });

    await page.goto('https://www.titaniumengineers.com/request-a-quote.html', { waitUntil: 'networkidle2', timeout: 20000 });

    const fields = await page.evaluate(() => {
      const form = document.querySelector('#form-443528741528713041');
      if (!form) return [];
      const items = Array.from(form.querySelectorAll('.wsite-form-field, div[id*="field-"]')).map(div => {
        const label = div.querySelector('label') ? div.querySelector('label').innerText.trim() : '';
        const inputs = Array.from(div.querySelectorAll('input, textarea, select')).map(i => ({
          name: i.name,
          id: i.id,
          type: i.type,
          value: i.value
        }));
        return { label, inputs };
      });
      return items;
    });
    console.log('Titanium form fields with labels:', JSON.stringify(fields, null, 2));

    // Now fill accurately:
    // First Name
    await page.type('#input-825472944891523769', OUTREACH_PROFILE.firstName);
    // Last Name
    await page.type('#input-825472944891523769-1', OUTREACH_PROFILE.lastName);
    // Company
    await page.type('#input-346001875812142730', OUTREACH_PROFILE.company);
    // Email
    await page.type('#input-639320241662572479', OUTREACH_PROFILE.email);
    // Radio: North or South America
    await page.click('#radio-0-_u551446107367226383');
    // Message / comments
    await page.type('#input-797669080850384012', OUTREACH_PROFILE.message);

    console.log('Filled all fields! Submitting Titanium form...');
    await page.evaluate(() => {
      const btn = document.querySelector('#form-443528741528713041 input[type="submit"]');
      btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const msg = document.querySelector('.wsite-form-instructions, .form-submission, #form-443528741528713041');
      return {
        bodySnippet: document.body.innerText.slice(0, 600)
      };
    });
    console.log('Titanium submit result:', result.bodySnippet);

  } catch (e) {
    console.log('Titanium error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testRockwellDetail() {
  console.log('\n--- Inspecting Rockwell Detail ---');
  const browser = await puppeteer.launch({ headless: 'new', executablePath: CHROME_BIN, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    page.on('response', resp => {
      if (resp.url().includes('admin-ajax.php') || resp.url().includes('contact')) {
        console.log('[Rockwell Net Resp]', resp.status(), resp.url());
      }
    });

    await page.goto('https://rockwellprecision.com/contact/', { waitUntil: 'networkidle2', timeout: 20000 });

    await page.type('#input_7_100', OUTREACH_PROFILE.firstName);
    await page.type('#input_7_101', OUTREACH_PROFILE.lastName);
    await page.type('#input_7_103', OUTREACH_PROFILE.phone);
    await page.type('#input_7_102', OUTREACH_PROFILE.email);
    await page.type('#input_7_7', OUTREACH_PROFILE.zip);
    await page.type('#input_7_104', OUTREACH_PROFILE.message);

    console.log('Filled Rockwell fields. Clicking submit...');
    await page.click('#gform_submit_button_7');

    await new Promise(r => setTimeout(r, 8000));

    const domInfo = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('.gfield_error, .validation_error, .validation_message')).map(e => e.innerText);
      const conf = Array.from(document.querySelectorAll('.gform_confirmation_message, [id*="gform_confirmation"]')).map(e => e.innerText);
      const visibleForm = !!document.querySelector('#gform_7');
      return { errors, conf, visibleForm, url: window.location.href };
    });
    console.log('Rockwell DOM Info:', JSON.stringify(domInfo, null, 2));

  } catch (e) {
    console.log('Rockwell error:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testTitaniumDetail();
  await testRockwellDetail();
}

run();
