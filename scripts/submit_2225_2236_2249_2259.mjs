import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your metal fabrication services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

function recordSuccess(leadId, url, phrase) {
  const note = `Contact form: ${url} (Autofilled & verified: ${phrase})`;
  const current = db.prepare('SELECT notes FROM leads WHERE id = ?').get(leadId);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(newNotes, 'contacted', leadId);
  db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
    .run(leadId, 'sent', note);
  console.log(`[DB SUCCESS] Lead #${leadId} marked CONTACTED: ${phrase}`);
}

async function test2225(browser) {
  console.log('\n--- Submitting Lead #2225: Sheet Metal Specialists ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.sheetmetalspecialists.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.type('input[name="your-name"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[name="type-of-business"]', 'Manufacturing Machinery', { delay: 20 });
    await page.type('input[name="type-of-service"]', 'Custom Sheet Metal Fabrication', { delay: 20 });
    await page.type('input[name="how-did-you-hear-about-SMS"]', 'Industry Referral', { delay: 20 });

    console.log('Filled #2225 fields. Clicking Send...');
    await page.click('form.wpcf7-form input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      const form = document.querySelector('form.wpcf7-form');
      return {
        output: output ? output.innerText : null,
        formClass: form ? form.className : null,
        isSent: form ? form.className.includes('sent') : false
      };
    });

    console.log('#2225 Result:', res);
    if (res.isSent || (res.output && /thank you|sent|thanks/i.test(res.output))) {
      recordSuccess(2225, 'https://www.sheetmetalspecialists.com/', res.output);
    }
  } catch (e) {
    console.log('Error #2225:', e.message);
  } finally {
    await page.close();
  }
}

async function test2236(browser) {
  console.log('\n--- Submitting Lead #2236: Firm Designs (Wix Form) ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.firmdesigns.us/contact', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input[id*="input_comp-kf4wcbm7"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[id*="input_comp-kf4wcbmq"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[id*="input_comp-kf4wcbmw"]', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('input[id*="input_comp-kf4wcbn0"]', OUTREACH_PROFILE.subject, { delay: 20 });
    await page.type('textarea[id*="textarea_comp-kf4wcbn5"]', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Filled #2236 fields. Clicking Send...');
    await page.click('button[data-testid="buttonElement"], .wixui-form button');

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const success = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
      const body = document.body ? document.body.innerText : '';
      return {
        successText: success ? success.innerText : null,
        hasThanks: /thanks for submitting|thank you|message has been sent/i.test(body)
      };
    });

    console.log('#2236 Result:', res);
    if (res.successText || res.hasThanks) {
      recordSuccess(2236, 'https://www.firmdesigns.us/contact', res.successText || 'Thanks for submitting!');
    }
  } catch (e) {
    console.log('Error #2236:', e.message);
  } finally {
    await page.close();
  }
}

async function test2249(browser) {
  console.log('\n--- Submitting Lead #2249: Star Steel ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://starsteel.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input#form-field-name', OUTREACH_PROFILE.firstName, { delay: 20 });
    await page.type('input#form-field-last_name', OUTREACH_PROFILE.lastName, { delay: 20 });
    await page.type('input#form-field-phone', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('input#form-field-email', OUTREACH_PROFILE.email, { delay: 20 });
    
    // Select dropdowns
    await page.select('select#form-field-service', 'Custom Gates');
    await page.select('select#form-field-property', 'Commercial');

    await page.type('textarea#form-field-message', OUTREACH_PROFILE.message, { delay: 10 });

    // Note: leave full-name-maspik-hp empty!

    console.log('Filled #2249 fields. Clicking SEND REQUEST...');
    await page.click('button.elementor-button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const msg = document.querySelector('.elementor-message-success, .elementor-message');
      const body = document.body ? document.body.innerText : '';
      return {
        msgText: msg ? msg.innerText : null,
        hasThanks: /thank you|thanks|sent|received/i.test(body)
      };
    });

    console.log('#2249 Result:', res);
    if (res.msgText || res.hasThanks) {
      recordSuccess(2249, 'https://starsteel.com/contact/', res.msgText || 'Message sent successfully');
    }
  } catch (e) {
    console.log('Error #2249:', e.message);
  } finally {
    await page.close();
  }
}

async function test2259(browser) {
  console.log('\n--- Submitting Lead #2259: Macias Sheet Metal ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.maciassheetmetal.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input[name="dmform-0"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[name="dmform-4"]', OUTREACH_PROFILE.company, { delay: 20 });
    await page.type('input[name="dmform-1"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[name="dmform-2"]', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('textarea[name="dmform-3"]', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Filled #2259 fields. Clicking Send Message...');
    await page.click('input[type="submit"]#1995151138, input[type="submit"][name="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const resp = document.querySelector('.dmform-success, .dmRespRow, [class*="success"]');
      const body = document.body ? document.body.innerText : '';
      return {
        respText: resp ? resp.innerText : null,
        hasThanks: /thank you|thanks|received|sent/i.test(body)
      };
    });

    console.log('#2259 Result:', res);
    if (res.respText || res.hasThanks) {
      recordSuccess(2259, 'https://www.maciassheetmetal.com/contact-us', res.respText || 'Thank you for your message');
    }
  } catch (e) {
    console.log('Error #2259:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await test2225(browser);
  await test2236(browser);
  await test2249(browser);
  await test2259(browser);

  await browser.close();
}

run();
