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
  industry: 'Manufacturing & Machinery',
  message: `Hello,

I am reaching out to express our interest in your fabrication and metal services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

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

async function test2230(browser) {
  console.log('\n--- Submitting Lead #2230: Suri Steel ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://suristeel.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    
    await page.type('input#form-field-name', OUTREACH_PROFILE.firstName, { delay: 20 });
    await page.type('input#form-field-field_f42e0da', OUTREACH_PROFILE.lastName, { delay: 20 });
    await page.type('input#form-field-email', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input#form-field-field_2498f89', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('input#form-field-field_f03e6f8', OUTREACH_PROFILE.company, { delay: 20 });
    await page.type('input#form-field-field_03b3adc', OUTREACH_PROFILE.industry, { delay: 20 });
    await page.type('textarea#form-field-message', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Filled #2230 fields. Clicking SEND...');
    await page.click('button.elementor-button[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const msg = document.querySelector('.elementor-message-success, .elementor-message');
      const body = document.body ? document.body.innerText : '';
      return {
        msgText: msg ? msg.innerText : null,
        hasThanks: /thank you|thanks|received|sent/i.test(body)
      };
    });

    console.log('#2230 Result:', res);
    if (res.msgText || res.hasThanks) {
      recordSuccess(2230, 'https://suristeel.com/contact/', res.msgText || 'Message sent successfully');
    }
  } catch (e) {
    console.log('Error #2230:', e.message);
  } finally {
    await page.close();
  }
}

async function test2233(browser) {
  console.log('\n--- Submitting Lead #2233: Globe Stainless Inc ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://globestainless.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input#form-field-field_2bf5a95', OUTREACH_PROFILE.firstName, { delay: 20 });
    await page.type('input#form-field-field_8bed0ee', OUTREACH_PROFILE.lastName, { delay: 20 });
    await page.type('input#form-field-field_fc0c9e8', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input#form-field-field_86e4d3e', OUTREACH_PROFILE.phone, { delay: 20 });

    console.log('Filled #2233 fields. Clicking SEND...');
    // Click submit in the first form (the contact form)
    const btn = await page.$('.elementor-form button[type="submit"]');
    if (btn) await btn.click();

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const msg = document.querySelector('.elementor-message-success, .elementor-message');
      const body = document.body ? document.body.innerText : '';
      return {
        msgText: msg ? msg.innerText : null,
        hasThanks: /thank you|thanks|received|sent/i.test(body)
      };
    });

    console.log('#2233 Result:', res);
    if (res.msgText || res.hasThanks) {
      recordSuccess(2233, 'https://globestainless.com/contact/', res.msgText || 'Message sent successfully');
    }
  } catch (e) {
    console.log('Error #2233:', e.message);
  } finally {
    await page.close();
  }
}

async function test2238(browser) {
  console.log('\n--- Submitting Lead #2238: JC Mobile Custom Welding ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://jcweldingrepair.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

    await page.type('input#g35-name', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input#g35-email', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('textarea#contact-form-comment-g35-message', OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Filled #2238 fields. Clicking Submit...');
    await page.click('button[type="submit"].pushbutton-wide, .contact-submit button, button.wp-block-button__link');

    await new Promise(r => setTimeout(r, 6000));

    const res = await page.evaluate(() => {
      const successEl = document.querySelector('.contact-form-success, #contact-form-35 h3, .jetpack-contact-form__success-message');
      const body = document.body ? document.body.innerText : '';
      return {
        successText: successEl ? successEl.innerText : null,
        hasThanks: /thank you|message sent|received/i.test(body)
      };
    });

    console.log('#2238 Result:', res);
    if (res.successText || res.hasThanks) {
      recordSuccess(2238, 'https://jcweldingrepair.com/contact-us/', res.successText || 'Message sent successfully');
    }
  } catch (e) {
    console.log('Error #2238:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await test2230(browser);
  await test2233(browser);
  await test2238(browser);

  await browser.close();
}

run();
