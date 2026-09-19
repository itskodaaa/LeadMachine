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

async function testMorgan1697() {
  console.log('\n--- Testing #1697 The Morgan Corporation (Email in Phone Field) ---');
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
        console.log(`[#1697 AJAX RESPONSE]: ${res.status()} -> ${await res.text()}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://morgancorporation.net/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Notice field_5ce848c is type=email. Let's change its type to text or put email
    await page.evaluate(() => {
      const p = document.querySelector('#form-field-field_5ce848c');
      if (p) p.setAttribute('type', 'text');
    });

    await page.type('#form-field-name', profile.fullName, { delay: 20 });
    await page.type('#form-field-email', profile.email, { delay: 20 });
    await page.type('#form-field-field_5ce848c', profile.phone, { delay: 20 });
    await page.type('#form-field-message', profile.message, { delay: 10 });

    console.log('Submitting...');
    const submitBtn = await page.$('form.elementor-form button[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const result = await page.evaluate(() => {
      const msg = document.querySelector('.elementor-message');
      return msg ? msg.innerText : document.body.innerText.match(/(?:thanks|thank you|submitted|received|message)[^\n.!]*/i);
    });
    console.log('[#1697 Result]:', result);
  } catch (e) {
    console.error('[#1697 Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function testJB1705() {
  console.log('\n--- Testing #1705 JB Manufacturing Post-Submission DOM ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  try {
    await page.goto('https://jb-mfg.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#et_pb_contact_name_0', profile.fullName, { delay: 20 });
    await page.type('#et_pb_contact_email_0', profile.email, { delay: 20 });
    await page.type('#et_pb_contact_message_0', profile.message, { delay: 10 });

    const mathSolved = await page.evaluate(() => {
      const span = document.querySelector('.et_pb_contact_captcha_question');
      if (!span) return null;
      const m = span.innerText.trim().match(/(\d+)\s*\+\s*(\d+)/);
      return m ? parseInt(m[1], 10) + parseInt(m[2], 10) : null;
    });

    if (mathSolved !== null) {
      await page.type('input[name="et_pb_contact_captcha_0"]', mathSolved.toString(), { delay: 20 });
    }

    console.log('Submitting with math captcha answer:', mathSolved);
    const submitBtn = await page.$('form.et_pb_contact_form button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    const postDom = await page.evaluate(() => {
      const box = document.querySelector('.et-pb-contact-message');
      const err = document.querySelector('.et_pb_contact_error_text');
      return {
        url: window.location.href,
        message: box ? box.innerText : null,
        error: err ? err.innerText : null,
        bodySnippet: document.body.innerText.slice(0, 400).replace(/\n+/g, ' ')
      };
    });
    console.log('[#1705 Post-Submission State]:', JSON.stringify(postDom, null, 2));
  } catch (e) {
    console.error('[#1705 Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function testKempler1704() {
  console.log('\n--- Testing #1704 Kempler Industries ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('site_contact_requests')) {
      try {
        console.log(`[#1704 RESPONSE]: ${res.status()} -> ${(await res.text()).slice(0, 150)}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://kempler.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#lead_first_name', profile.firstName, { delay: 20 });
    await page.type('#lead_last_name', profile.lastName, { delay: 20 });
    await page.type('#lead_company_name', profile.company, { delay: 20 });
    await page.type('#lead_email', profile.email, { delay: 20 });
    await page.type('#lead_phone', profile.phone, { delay: 20 });
    await page.type('#lead_message', profile.message, { delay: 10 });

    console.log('Submitting #1704...');
    const submitBtn = await page.$('form#new_lead input[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ timeout: 10000 }).catch(() => null),
      submitBtn.click()
    ]);

    await new Promise(r => setTimeout(r, 4000));
    console.log('[#1704 Post URL]:', page.url());
    const confirmation = await page.evaluate(() => {
      const alert = document.querySelector('.alert, .notice, .flash, .success');
      return alert ? alert.innerText : document.body.innerText.match(/(?:thanks|thank you|submitted|received|request)[^\n.!]*/i);
    });
    console.log('[#1704 Result]:', confirmation);
  } catch (e) {
    console.error('[#1704 Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function testOakley1729() {
  console.log('\n--- Testing #1729 Oakley Industrial Machinery ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security', '--ignore-certificate-errors', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  page.on('response', async res => {
    if (res.url().includes('wpcf7') || res.url().includes('feedback')) {
      try {
        console.log(`[#1729 WPCF7]: ${res.status()} -> ${(await res.text()).slice(0, 150)}`);
      } catch (_) {}
    }
  });

  try {
    await page.goto('https://oim-inc.com/contacts/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Form #0 is general contact
    await page.waitForSelector('form.wpcf7-form input[name="your-name"]', { timeout: 8000 });
    await page.type('form.wpcf7-form input[name="your-name"]', profile.fullName, { delay: 20 });
    await page.type('form.wpcf7-form input[name="your-company"]', profile.company, { delay: 20 });
    await page.type('form.wpcf7-form input[name="your-tel"]', profile.phone, { delay: 20 });
    await page.type('form.wpcf7-form input[name="your-email"]', profile.email, { delay: 20 });
    await page.type('form.wpcf7-form textarea[name="your-message"]', profile.message, { delay: 10 });

    // Check acceptance checkbox
    await page.click('form.wpcf7-form input[type="checkbox"][name*="acceptance"]');

    console.log('Submitting #1729...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    await submitBtn.click();

    await new Promise(r => setTimeout(r, 6000));
    const confirmation = await page.evaluate(() => {
      const el = document.querySelector('.wpcf7-response-output');
      return el ? el.innerText : null;
    });
    console.log('[#1729 Result]:', confirmation);
  } catch (e) {
    console.error('[#1729 Error]:', e.message);
  } finally {
    await browser.close();
  }
}

async function run() {
  await testMorgan1697();
  await testJB1705();
  await testKempler1704();
  await testOakley1729();
}

run().catch(console.error);
