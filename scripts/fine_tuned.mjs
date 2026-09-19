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
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function runFineTuned() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. LEAD #110 (Active Construction NY Inc.)
  console.log('\n--- Retrying #110 (Active Construction NY) ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://activeconstructionny.com/contact-us/', { waitUntil: 'load', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate((p) => {
      const form = document.querySelector('form.wpcf7-form');
      if (form) {
        const nameInput = form.querySelector('input[name="your-name"]');
        const emailInput = form.querySelector('input[name="your-email"]');
        const subjInput = form.querySelector('input[name="your-subject"]');
        const msgInput = form.querySelector('textarea[name="your-message"]');
        const submitBtn = form.querySelector('input[type="submit"]');

        if (nameInput) nameInput.value = p.fullName;
        if (emailInput) emailInput.value = p.email;
        if (subjInput) subjInput.value = p.subject;
        if (msgInput) msgInput.value = p.message;

        if (submitBtn) submitBtn.click();
      }
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify110 = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output')?.innerText || '';
      return resp;
    });

    console.log('#110 CF7 Response:', verify110);
    if (verify110.toLowerCase().includes('thank') || verify110.toLowerCase().includes('sent') || verify110.toLowerCase().includes('success')) {
      saveLeadResult(110, 'contacted', `Contact form: https://activeconstructionny.com/contact-us/ (CF7 Verified: ${verify110.trim()})`);
    } else {
      saveLeadResult(110, 'unable_to_reach', `Contact form: https://activeconstructionny.com/contact-us/ (${verify110 || 'Unconfirmed submission'})`);
    }
    await page.close();
  } catch (e) {
    console.log('#110 Error:', e.message);
  }

  // 2. LEAD #113 (Mega Construction - Wix Form)
  console.log('\n--- Retrying #113 (Mega Construction) ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://www.megaconstructionco.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Interact with Wix service dropdown
    const dropdownOpened = await page.evaluate(() => {
      const dropdownBtn = document.querySelector('button[aria-label="Select a Service"], button#label-for-id_-12, [data-testid="select-trigger"]');
      if (dropdownBtn) {
        dropdownBtn.click();
        return true;
      }
      return false;
    });

    console.log('#113 Dropdown opened:', dropdownOpened);
    await new Promise(r => setTimeout(r, 1000));

    // Select an option from the list
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('[role="option"], li, [data-testid="select-option"]'));
      if (options.length > 0) {
        options[0].click();
      }
    });

    await new Promise(r => setTimeout(r, 1000));

    // Fill the rest of inputs
    await page.evaluate((p) => {
      const fName = document.querySelector('input[aria-label="First name"], input[placeholder*="Emily"]');
      const lName = document.querySelector('input[aria-label="Last name"], input[placeholder*="Smith"]');
      const email = document.querySelector('input[aria-label="Email"], input[type="email"]');
      const phone = document.querySelector('input[aria-label="Phone. Phone"], input[type="phone"]');
      const addr = document.querySelector('input[aria-label="Address"], input[placeholder*="address"]');
      const details = document.querySelector('textarea[aria-label="Give us more details"], textarea');

      if (fName) { fName.value = p.firstName; fName.dispatchEvent(new Event('input', { bubbles: true })); fName.dispatchEvent(new Event('change', { bubbles: true })); }
      if (lName) { lName.value = p.lastName; lName.dispatchEvent(new Event('input', { bubbles: true })); lName.dispatchEvent(new Event('change', { bubbles: true })); }
      if (email) { email.value = p.email; email.dispatchEvent(new Event('input', { bubbles: true })); email.dispatchEvent(new Event('change', { bubbles: true })); }
      if (phone) { phone.value = p.phone; phone.dispatchEvent(new Event('input', { bubbles: true })); phone.dispatchEvent(new Event('change', { bubbles: true })); }
      if (addr) { addr.value = p.address; addr.dispatchEvent(new Event('input', { bubbles: true })); addr.dispatchEvent(new Event('change', { bubbles: true })); }
      if (details) { details.value = p.message; details.dispatchEvent(new Event('input', { bubbles: true })); details.dispatchEvent(new Event('change', { bubbles: true })); }

      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => (b.innerText || '').toLowerCase().includes('request') || (b.innerText || '').toLowerCase().includes('quote') || (b.innerText || '').toLowerCase().includes('submit'));
      if (submitBtn) {
        submitBtn.click();
      }
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify113 = await page.evaluate(() => {
      const msg = document.querySelector('.wixui-form__message, [data-testid="form-submitted"]')?.innerText || '';
      const body = document.body?.innerText || '';
      return { msg, bodySnippet: body.substring(0, 300) };
    });

    console.log('#113 Wix Result:', verify113);
    if (verify113.msg.toLowerCase().includes('thank') || verify113.msg.toLowerCase().includes('submitted') || verify113.bodySnippet.toLowerCase().includes('thanks for submitting')) {
      saveLeadResult(113, 'contacted', `Contact form: https://www.megaconstructionco.com/contact-us (Wix Verified: ${verify113.msg.trim() || 'Thanks for submitting'})`);
    } else {
      saveLeadResult(113, 'unable_to_reach', `Contact form: https://www.megaconstructionco.com/contact-us (${verify113.msg || 'Wix submission unconfirmed'})`);
    }
    await page.close();
  } catch (e) {
    console.log('#113 Error:', e.message);
  }

  // 3. LEAD #63 (Wise Construction Group - Elementor Form)
  console.log('\n--- Retrying #63 (Wise Construction Group) ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://wiseconstructiongroup.net/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate((p) => {
      // Look for Elementor form
      const elForm = document.querySelector('form.elementor-form');
      if (elForm) {
        const name = elForm.querySelector('input[name="form_fields[name]"], #form-field-name');
        const email = elForm.querySelector('input[name="form_fields[email]"], #form-field-email');
        const tel = elForm.querySelector('input[name="form_fields[field_a748e36]"], #form-field-field_a748e36');
        const selects = elForm.querySelectorAll('select');

        if (name) name.value = p.fullName;
        if (email) email.value = p.email;
        if (tel) tel.value = p.phone;
        selects.forEach(s => {
          if (s.options.length > 1) {
            s.selectedIndex = 1;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        const submit = elForm.querySelector('button[type="submit"], input[type="submit"]');
        if (submit) submit.click();
      }
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify63 = await page.evaluate(() => {
      const elMsg = document.querySelector('.elementor-message-success, .elementor-message')?.innerText || '';
      return elMsg;
    });

    console.log('#63 Elementor Result:', verify63);
    if (verify63.toLowerCase().includes('sent') || verify63.toLowerCase().includes('success') || verify63.toLowerCase().includes('thank')) {
      saveLeadResult(63, 'contacted', `Contact form: https://wiseconstructiongroup.net/ (Elementor Verified: ${verify63.trim()})`);
    } else {
      saveLeadResult(63, 'unable_to_reach', `Contact form: https://wiseconstructiongroup.net/ (${verify63 || 'Elementor submission unconfirmed'})`);
    }
    await page.close();
  } catch (e) {
    console.log('#63 Error:', e.message);
  }

  await browser.close();
}

runFineTuned();
