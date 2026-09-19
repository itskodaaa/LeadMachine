import puppeteer from 'puppeteer-core';

const CHROME_PATH = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const profile = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Precision CNC Machining & Manufacturing Capabilities Inquiry',
  message: `Hello,\n\nI am reaching out on behalf of Northeast Precision Machinery, Inc. We specialize in precision CNC machining, tooling, and custom components for industrial applications.\n\nWe are currently expanding our supplier and machining partner network and would like to learn more about your available production capacity, equipment capabilities, and standard lead times. Could you please direct me to the appropriate person on your quoting or engineering team to discuss potential subcontract or partnership opportunities?\n\nThank you,\nPamela Jameson\nNortheast Precision Machinery, Inc.\nPhone: 708-568-3708\nEmail: pamela.jameson@nortiheastprecision.com`
};

async function testLead1482() {
  console.log('\n--- Testing Lead #1482: Dallas Precision Machining ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('admin-ajax.php')) {
      try {
        console.log(`[#1482 AJAX RESPONSE]: ${res.status()} -> ${await res.text()}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://dallasprecisionmachining.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form fields
    await page.waitForSelector('#form-field-name', { timeout: 5000 });
    await page.type('#form-field-name', profile.fullName, { delay: 30 });
    await page.type('#form-field-email', profile.email, { delay: 30 });
    if (await page.$('#form-field-field_31fee6f')) {
      await page.type('#form-field-field_31fee6f', profile.company, { delay: 30 });
    }
    if (await page.$('#form-field-field_a4923ea')) {
      await page.type('#form-field-field_a4923ea', profile.phone, { delay: 30 });
    }
    if (await page.$('#form-field-message')) {
      await page.type('#form-field-message', profile.message, { delay: 10 });
    }

    console.log('Fields typed. Submitting...');
    const submitBtn = await page.$('form.elementor-form button[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const confirmationText = await page.evaluate(() => {
      const el = document.querySelector('.elementor-message, .elementor-message-success, .elementor-message-danger');
      return el ? el.innerText : null;
    });
    console.log(`[#1482 Result]: ${confirmationText}`);
  } catch (e) {
    console.error(`[#1482 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLead1489() {
  console.log('\n--- Testing Lead #1489: Centralized Production, LLC ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('dialog', async dialog => {
    console.log(`[#1489 DIALOG]: ${dialog.type()} "${dialog.message()}"`);
    await dialog.accept();
  });

  page.on('response', async res => {
    if (res.url().includes('send-mail.php')) {
      try {
        console.log(`[#1489 RESPONSE]: ${res.status()} -> ${await res.text()}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://centralizedproduction.com/contact-us.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Form #0 action is send-mail.php
    await page.waitForSelector('form[action*="send-mail.php"] input[name="name"]', { timeout: 5000 });
    await page.type('form[action*="send-mail.php"] input[name="name"]', profile.fullName, { delay: 30 });
    await page.type('form[action*="send-mail.php"] input[name="phone"]', profile.phone, { delay: 30 });
    await page.type('form[action*="send-mail.php"] input[name="email"]', profile.email, { delay: 30 });
    await page.type('form[action*="send-mail.php"] textarea[name="message"]', profile.message, { delay: 10 });

    console.log('Fields typed. Submitting...');
    const submitBtn = await page.$('form[action*="send-mail.php"] input[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log(`[#1489 Post-submit URL]: ${page.url()}`);
    const bodyText = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 500) : '');
    console.log(`[#1489 Page snippet]: ${bodyText.replace(/\n+/g, ' ')}`);
  } catch (e) {
    console.error(`[#1489 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLead1485() {
  console.log('\n--- Testing Lead #1485: Dallas Fabrication ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('wix') && (res.url().includes('submission') || res.url().includes('form'))) {
      try {
        console.log(`[#1485 NET RESPONSE]: ${res.status()} ${res.url().slice(0, 70)}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://www.dallasfab.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    await page.waitForSelector('#input_comp-khdim07m', { timeout: 10000 });
    await page.type('#input_comp-khdim07m', profile.fullName, { delay: 30 });
    await page.type('#input_comp-khdim083', profile.email, { delay: 30 });
    if (await page.$('#input_comp-khdim0891')) {
      await page.type('#input_comp-khdim0891', profile.subject, { delay: 30 });
    }
    if (await page.$('#textarea_comp-khdim08f1')) {
      await page.type('#textarea_comp-khdim08f1', profile.message, { delay: 10 });
    }

    console.log('Fields typed. Submitting...');
    const submitBtn = await page.$('form#comp-khdim069 button[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const resultText = await page.evaluate(() => {
      const msg = document.querySelector('[data-aid="notifications"], [role="alert"], [aria-live="polite"], .notifications, [id*="notification"]');
      return msg ? msg.innerText : document.body.innerText;
    });
    console.log(`[#1485 Result Snippet]: ${resultText.slice(0, 300).replace(/\n+/g, ' ')}`);
  } catch (e) {
    console.error(`[#1485 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLead1487() {
  console.log('\n--- Testing Lead #1487: P & W Machine Inc ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    console.log('Navigating with waitUntil domcontentloaded...');
    await page.goto('https://www.pwmachine.com/locations-contact/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));

    const gform = await page.evaluate(() => {
      const f = document.querySelector('form[id*="gform"]');
      if (!f) return null;
      return {
        id: f.id,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey]'),
        fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }))
      };
    });
    console.log(`[#1487 GForm Details]:`, JSON.stringify(gform, null, 2));

    const emails = await page.evaluate(() => {
      return [...new Set(document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
    });
    console.log(`[#1487 Emails]:`, emails);
  } catch (e) {
    console.error(`[#1487 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function testLead1494() {
  console.log('\n--- Testing Lead #1494: ACCUFAST STEEL ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    console.log('Navigating with waitUntil domcontentloaded...');
    await page.goto('https://accufaststeel.com/contact/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));

    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('form');
      if (!f) return null;
      return {
        id: f.id,
        action: f.action,
        hasRecaptcha: !!f.querySelector('.g-recaptcha, [data-sitekey]'),
        fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          required: el.required
        }))
      };
    });
    console.log(`[#1494 Form Details]:`, JSON.stringify(formDetails, null, 2));

    const emails = await page.evaluate(() => {
      return [...new Set(document.body.innerText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [])];
    });
    console.log(`[#1494 Emails]:`, emails);
  } catch (e) {
    console.error(`[#1494 Error]: ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function runAll() {
  await testLead1482();
  await testLead1489();
  await testLead1485();
  await testLead1487();
  await testLead1494();
}

runAll().catch(console.error);
