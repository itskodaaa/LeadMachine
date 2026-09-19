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

  // 1. Fix #4464 in DB first
  const current4464 = getStmt.get(4464);
  console.log('Current 4464:', current4464);
  db.prepare('UPDATE leads SET status = ?, notes = ? WHERE id = ?').run(
    'unable_to_reach',
    'Wix submission failed: "Something went wrong while sending your message, please try again later" (Google reCAPTCHA)',
    4464
  );
  db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(
    4464,
    'bounced',
    'Wix submission failed: Something went wrong / reCAPTCHA'
  );
  console.log('Updated 4464 to unable_to_reach');

  // 2. Investigate #4458 International Castings
  try {
    console.log('\n--- Checking #4458 International Castings ---');
    const page = await browser.newPage();
    await page.goto('https://www.internationalcastings.com/contact', { waitUntil: 'networkidle2', timeout: 25000 });

    const formDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        className: i.className,
        placeholder: i.placeholder,
        outerHTML: i.outerHTML
      }));
      return inputs;
    });
    console.log('Form details on International Castings:', JSON.stringify(formDetails, null, 2));

    // Fill each input
    await page.type('#name-yui_3_17_2_16_1497880771719_6115-fname-field', OUTREACH_PROFILE.firstName);
    await page.type('#name-yui_3_17_2_16_1497880771719_6115-lname-field', OUTREACH_PROFILE.lastName);
    await page.type('#email-yui_3_17_2_16_1497880771719_6116-field', OUTREACH_PROFILE.email);
    await page.type('#text-yui_3_17_2_16_1497880771719_6117-field', OUTREACH_PROFILE.subject);
    await page.type('#textarea-yui_3_17_2_16_1497880771719_6118-field', OUTREACH_PROFILE.message);

    console.log('Filled inputs. Submitting Squarespace form...');
    const submitBtn = await page.$('.form-button-wrapper input[type="submit"], input[value="Submit"], button[type="submit"]');
    console.log('Submit button found:', !!submitBtn);
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 5000));

      const pageState = await page.evaluate(() => {
        const conf = document.querySelector('.form-submission-text, .form-submission-html');
        return {
          confirmationText: conf ? conf.innerText.trim() : null,
          bodyText: document.body.innerText
        };
      });
      console.log('Squarespace confirmationText:', pageState.confirmationText);
      if (pageState.confirmationText || /thank you/i.test(pageState.bodyText)) {
        db.prepare('UPDATE leads SET status = ?, notes = ? WHERE id = ?').run(
          'contacted',
          `Confirmed via Squarespace form: "${pageState.confirmationText || 'Thank you!'}"`,
          4458
        );
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(
          4458,
          'sent',
          `Squarespace form submitted: ${pageState.confirmationText || 'Thank you!'}`
        );
        console.log('[DB SAVED] Lead #4458 -> contacted');
      } else {
        console.log('No confirmation found for 4458');
      }
    }
    await page.close();
  } catch (e) {
    console.log('Error 4458:', e.message);
  }

  // 3. Investigate #4461 Axis Companies
  try {
    console.log('\n--- Checking #4461 Axis Companies ---');
    const page = await browser.newPage();
    await page.goto('https://www.axiscompanies.com/contact/', { waitUntil: 'networkidle2', timeout: 25000 });

    await page.type('#your-name', OUTREACH_PROFILE.fullName);
    await page.type('#phone', OUTREACH_PROFILE.phone);
    await page.type('#company', OUTREACH_PROFILE.company);
    await page.type('#your-email', OUTREACH_PROFILE.email);
    await page.type('#message', OUTREACH_PROFILE.message);

    console.log('Filled Axis form. Submitting...');
    // Watch for wpcf7 responses
    let ajaxResponse = null;
    page.on('response', async res => {
      if (res.url().includes('wp-json/contact-form-7') || res.url().includes('feedback')) {
        try {
          ajaxResponse = await res.json();
          console.log('WPCF7 AJAX response:', ajaxResponse);
        } catch (e) {}
      }
    });

    const submitBtn = await page.$('form.wpcf7-form input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));

      const status = await page.evaluate(() => {
        const form = document.querySelector('form.wpcf7-form');
        const output = document.querySelector('.wpcf7-response-output');
        return {
          dataStatus: form ? form.getAttribute('data-status') : null,
          outputText: output ? output.innerText.trim() : null
        };
      });
      console.log('Axis status after submit:', status);
      if (status.dataStatus === 'mail_sent' || (status.outputText && /thank you|sent/i.test(status.outputText))) {
        db.prepare('UPDATE leads SET status = ?, notes = ? WHERE id = ?').run(
          'contacted',
          `Confirmed Contact Form 7: "${status.outputText}"`,
          4461
        );
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(
          4461,
          'sent',
          `CF7 submission: ${status.outputText}`
        );
        console.log('[DB SAVED] Lead #4461 -> contacted');
      } else {
        const msg = status.outputText || ajaxResponse?.message || 'Google reCAPTCHA v3 verification or spam filter';
        db.prepare('UPDATE leads SET status = ?, notes = ? WHERE id = ?').run(
          'unable_to_reach',
          `Contact Form 7 failed: ${msg} (status: ${status.dataStatus})`,
          4461
        );
        console.log('[DB SAVED] Lead #4461 -> unable_to_reach');
      }
    }
    await page.close();
  } catch (e) {
    console.log('Error 4461:', e.message);
  }

  await browser.close();
}

run();
