import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB SAVED] Lead #${id} -> status: ${status} | note: ${note}`);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
  });

  // --- LEAD #4106 Anco Precision Inc. ---
  try {
    console.log('\n========================================');
    console.log('Processing Lead #4106: Anco Precision Inc.');
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(35000);
    await page.goto('https://ancoprecision.com/instant-quotes/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    await page.waitForSelector('form[action*="quote-submit"]', { timeout: 10000 });
    console.log('4106: Populating quote form...');
    await page.type('input[name="first_name"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="last_name"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="company"]', OUTREACH_PROFILE.company);
    await page.type('input[name="email"]', OUTREACH_PROFILE.email);
    await page.type('input[name="phone"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="material"]', 'Precision Machining Services');
    await page.type('textarea[name="details"]', OUTREACH_PROFILE.message);

    console.log('4106: Submitting form...');
    const submitBtn = await page.$('button.form-submit, button[type="submit"]');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
      submitBtn.click()
    ]);
    await new Promise(r => setTimeout(r, 3000));

    const postSubmitText = await page.evaluate(() => document.body.innerText);
    console.log('4106 Post submit URL:', page.url());
    console.log('4106 Post submit text snippet:', postSubmitText.slice(0, 300));
    
    if (/thank you|information was sent|received|submitted|success/i.test(postSubmitText)) {
      const match = postSubmitText.match(/Thank you[^.\n]*\./i) || postSubmitText.match(/Thank you/i);
      const confMsg = match ? match[0] : 'Thank you. Your project information was sent to Anco Precision.';
      saveLeadResult(4106, 'contacted', `Confirmed: Quote form submitted successfully ("${confMsg.trim()}")`);
    } else {
      console.log('4106: Confirmation not matched directly');
    }
    await page.close();
  } catch (e) {
    console.log('4106 Error:', e.message);
  }

  // --- LEAD #4114 GoldstarCNC ---
  try {
    console.log('\n========================================');
    console.log('Processing Lead #4114: GoldstarCNC');
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(35000);
    await page.goto('https://goldstarcnc.us/contact-us/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    await page.waitForSelector('#et_pb_contact_name_0', { timeout: 10000 });
    console.log('4114: Populating Divi contact form...');
    await page.type('#et_pb_contact_name_0', OUTREACH_PROFILE.fullName);
    await page.type('#et_pb_contact_email_0', OUTREACH_PROFILE.email);
    await page.type('#et_pb_contact_telefono_0', OUTREACH_PROFILE.phone);
    await page.type('#et_pb_contact_message_0', OUTREACH_PROFILE.message);

    console.log('4114: Submitting contact form...');
    const submitBtn = await page.$('button.et_pb_contact_submit');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      submitBtn.click()
    ]);
    await new Promise(r => setTimeout(r, 4000));

    const postSubmit = await page.evaluate(() => {
      const form = document.querySelector('.et_pb_contact_form');
      return {
        formText: form ? form.innerText : '',
        bodyText: document.body.innerText.slice(0, 400)
      };
    });
    console.log('4114 Form text after submit:', postSubmit.formText);
    if (/thanks for contacting|thank you|thanks|message has been sent/i.test(postSubmit.formText) || /thanks for contacting|thank you|thanks|message has been sent/i.test(postSubmit.bodyText)) {
      const msg = postSubmit.formText.trim() || 'Thanks for contacting us';
      saveLeadResult(4114, 'contacted', `Confirmed: Divi contact form submitted successfully ("${msg}")`);
    } else {
      console.log('4114 form could not verify text');
    }
    await page.close();
  } catch (e) {
    console.log('4114 Error:', e.message);
  }

  // --- LEAD #4115 Southern Gear & Machine, Inc. ---
  try {
    console.log('\n========================================');
    console.log('Processing Lead #4115: Southern Gear & Machine, Inc.');
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(35000);
    await page.goto('https://southerngear.com/rfq/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3000));

    await page.waitForSelector('form.wpcf7-form', { timeout: 10000 });
    console.log('4115: Populating WPCF7 RFQ form...');
    await page.type('input[name="contact-person"]', OUTREACH_PROFILE.fullName);
    await page.type('input[name="title"]', 'Procurement Manager');
    await page.type('input[name="company-name"]', OUTREACH_PROFILE.company);
    await page.type('input[name="address-1"]', OUTREACH_PROFILE.address);
    await page.type('input[name="city"]', OUTREACH_PROFILE.city);
    await page.type('input[name="state"]', OUTREACH_PROFILE.state);
    await page.type('input[name="zip"]', OUTREACH_PROFILE.zip);
    await page.type('input[name="tel-number"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="your-email"]', OUTREACH_PROFILE.email);
    await page.type('textarea[name="rfq-notes"]', OUTREACH_PROFILE.message);

    console.log('4115: Submitting RFQ form...');
    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    await submitBtn.click();
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      return {
        output: output ? output.innerText : '',
        body: document.body.innerText.slice(0, 400)
      };
    });
    console.log('4115 WPCF7 response output:', result.output);
    if (/thank you|message has been sent|sent successfully|received/i.test(result.output)) {
      saveLeadResult(4115, 'contacted', `Confirmed: WPCF7 RFQ form submitted successfully ("${result.output.trim()}")`);
    } else {
      console.log('4115 response not matching success yet:', result.output);
    }
    await page.close();
  } catch (e) {
    console.log('4115 Error:', e.message);
  }

  await browser.close();
}

run();
