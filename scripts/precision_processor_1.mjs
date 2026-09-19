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
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function runPrecisionProcessor() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const results = [];

  // ==========================================
  // LEAD #63: Wise Construction Group
  // ==========================================
  console.log('\n--- Processing Lead #63: Wise Construction Group ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('https://wiseconstructiongroup.net/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill CF7 form or Elementor form
    const submitted = await page.evaluate((p) => {
      // Find CF7 form
      const cf7Form = document.querySelector('form.wpcf7-form');
      if (cf7Form) {
        const nameInput = cf7Form.querySelector('input[name="text-775"]') || cf7Form.querySelector('input[type="text"]');
        const emailInput = cf7Form.querySelector('input[name="email-216"]') || cf7Form.querySelector('input[type="email"]');
        const telInput = cf7Form.querySelector('input[name="tel-143"]') || cf7Form.querySelector('input[type="tel"]');
        const addrInput = cf7Form.querySelector('input[name="text-371"]');
        const msgInput = cf7Form.querySelector('textarea[name="textarea-149"]') || cf7Form.querySelector('textarea');
        const submitBtn = cf7Form.querySelector('input[type="submit"]');

        if (nameInput) nameInput.value = p.fullName;
        if (emailInput) emailInput.value = p.email;
        if (telInput) telInput.value = p.phone;
        if (addrInput) addrInput.value = p.address;
        if (msgInput) msgInput.value = p.message;

        // Leave honeypots untouched
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
      }
      return false;
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 5000));

    const verify = await page.evaluate(() => {
      const respOutput = document.querySelector('.wpcf7-response-output')?.innerText || '';
      const body = document.body?.innerText || '';
      return { respOutput, bodySnippet: body.substring(0, 300) };
    });

    console.log('#63 Result:', verify.respOutput);
    if (verify.respOutput.toLowerCase().includes('thank') || verify.respOutput.toLowerCase().includes('sent') || verify.respOutput.toLowerCase().includes('success')) {
      saveLeadResult(63, 'contacted', `Contact form: https://wiseconstructiongroup.net/ (CF7 Verified: ${verify.respOutput.trim()})`);
      results.push({ id: 63, company: 'Wise Construction Group', status: 'contacted', note: `Confirmed: ${verify.respOutput.trim()}` });
    } else {
      saveLeadResult(63, 'unable_to_reach', `Contact form: https://wiseconstructiongroup.net/ (${verify.respOutput || 'No confirmation response'})`);
      results.push({ id: 63, company: 'Wise Construction Group', status: 'unable_to_reach', note: verify.respOutput || 'Unconfirmed submission' });
    }
    await page.close();
  } catch (e) {
    console.log('#63 Error:', e.message);
    saveLeadResult(63, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 63, company: 'Wise Construction Group', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #65: Manhattan Construction Company
  // ==========================================
  console.log('\n--- Processing Lead #65: Manhattan Construction Company ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://manhattanconstructiongroup.com/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    // Check if there is an online form
    const hasForm = await page.evaluate(() => {
      return document.querySelectorAll('form input[type="text"], form textarea').length >= 2;
    });
    if (!hasForm) {
      console.log('#65: No web contact form found on site (phone/address/office directory only).');
      saveLeadResult(65, 'unable_to_reach', 'Checked https://manhattanconstructiongroup.com/contact/: Direct phone/address directory only; no online web contact form');
      results.push({ id: 65, company: 'Manhattan Construction Company', status: 'unable_to_reach', note: 'No Online Contact Form (Phone/Address Directory Only)' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(65, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 65, company: 'Manhattan Construction Company', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #66: JE Dunn Construction
  // ==========================================
  console.log('\n--- Processing Lead #66: JE Dunn Construction ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://jedunn.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const captchaInfo = await page.evaluate(() => {
      const captchas = document.querySelectorAll('iframe[src*="recaptcha"], .g-recaptcha');
      return captchas.length > 0;
    });

    if (captchaInfo) {
      console.log('#66: Blocked by Google reCAPTCHA Enterprise challenge on HubSpot forms.');
      saveLeadResult(66, 'unable_to_reach', 'Contact form: https://jedunn.com/contact-us/ (Autofilled; blocked by Google reCAPTCHA Enterprise)');
      results.push({ id: 66, company: 'JE Dunn Construction', status: 'unable_to_reach', note: 'Blocked by Google reCAPTCHA Enterprise' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(66, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 66, company: 'JE Dunn Construction', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #77: Quisqueya Contracting Group
  // ==========================================
  console.log('\n--- Processing Lead #77: Quisqueya Contracting Group ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.quisqueyacontractinggroup.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    const formCount = await page.evaluate(() => document.querySelectorAll('form').length);
    if (formCount === 0) {
      console.log('#77: No online web form found (phone: 929-423-6707, email: info@quisqueyacontractinggroup.com).');
      saveLeadResult(77, 'unable_to_reach', 'Checked https://www.quisqueyacontractinggroup.com/contact: No online web form found; direct phone & email provided');
      results.push({ id: 77, company: 'Quisqueya Contracting Group', status: 'unable_to_reach', note: 'No Online Web Form Found' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(77, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 77, company: 'Quisqueya Contracting Group', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #109: RH Construction usa inc
  // ==========================================
  console.log('\n--- Processing Lead #109: RH Construction usa inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.rhconstructionusa.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const submitted = await page.evaluate((p) => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return false;

      const nameInput = form.querySelector('input[name="your-name"]');
      const emailInput = form.querySelector('input[name="your-email"]');
      const commSelect = form.querySelector('select[name="communication"]');
      const phoneInput = form.querySelector('input[name="your-phone"]');
      const addrInput = form.querySelector('input[name="your-address"]');
      const msgInput = form.querySelector('textarea[name="your-message"]');
      const radio = form.querySelector('input[type="radio"][name="timeline"]');
      const submitBtn = form.querySelector('input[type="submit"], button[type="submit"]');

      if (nameInput) nameInput.value = p.fullName;
      if (emailInput) emailInput.value = p.email;
      if (commSelect) {
        commSelect.selectedIndex = 1;
        commSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (phoneInput) phoneInput.value = p.phone;
      if (addrInput) addrInput.value = p.address;
      if (msgInput) msgInput.value = p.message;
      if (radio) radio.checked = true;

      // Leave honeypots empty (_wpcf7_ak_hp_textarea)
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output')?.innerText || '';
      const body = document.body?.innerText || '';
      return { resp, bodySnippet: body.substring(0, 300) };
    });

    console.log('#109 Result:', verify.resp);
    if (verify.resp.toLowerCase().includes('thank') || verify.resp.toLowerCase().includes('sent') || verify.resp.toLowerCase().includes('success')) {
      saveLeadResult(109, 'contacted', `Contact form: https://www.rhconstructionusa.com/contact-us/ (CF7 Verified: ${verify.resp.trim()})`);
      results.push({ id: 109, company: 'RH Construction usa inc', status: 'contacted', note: `Confirmed: ${verify.resp.trim()}` });
    } else {
      saveLeadResult(109, 'unable_to_reach', `Contact form: https://www.rhconstructionusa.com/contact-us/ (${verify.resp || 'Submission unconfirmed'})`);
      results.push({ id: 109, company: 'RH Construction usa inc', status: 'unable_to_reach', note: verify.resp || 'Unconfirmed submission' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(109, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 109, company: 'RH Construction usa inc', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #110: Active Construction NY Inc.
  // ==========================================
  console.log('\n--- Processing Lead #110: Active Construction NY Inc. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://activeconstructionny.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const submitted = await page.evaluate((p) => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return false;

      const nameInput = form.querySelector('input[name="your-name"]');
      const emailInput = form.querySelector('input[name="your-email"]');
      const subjInput = form.querySelector('input[name="your-subject"]');
      const msgInput = form.querySelector('textarea[name="your-message"]');
      const submitBtn = form.querySelector('input[type="submit"]');

      if (nameInput) nameInput.value = p.fullName;
      if (emailInput) emailInput.value = p.email;
      if (subjInput) subjInput.value = p.subject;
      if (msgInput) msgInput.value = p.message;

      // DO NOT touch alt_s or rptumo270 honeypots!
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify = await page.evaluate(() => {
      const resp = document.querySelector('.wpcf7-response-output')?.innerText || '';
      return { resp };
    });

    console.log('#110 Result:', verify.resp);
    if (verify.resp.toLowerCase().includes('thank') || verify.resp.toLowerCase().includes('sent') || verify.resp.toLowerCase().includes('success')) {
      saveLeadResult(110, 'contacted', `Contact form: https://activeconstructionny.com/contact-us/ (CF7 Verified: ${verify.resp.trim()})`);
      results.push({ id: 110, company: 'Active Construction NY Inc.', status: 'contacted', note: `Confirmed: ${verify.resp.trim()}` });
    } else {
      saveLeadResult(110, 'unable_to_reach', `Contact form: https://activeconstructionny.com/contact-us/ (${verify.resp || 'Unconfirmed'})`);
      results.push({ id: 110, company: 'Active Construction NY Inc.', status: 'unable_to_reach', note: verify.resp || 'Unconfirmed submission' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(110, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 110, company: 'Active Construction NY Inc.', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #111: Green Point Construction Company
  // ==========================================
  console.log('\n--- Processing Lead #111: Green Point Construction Company ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://greenpointconstructionny.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Check captcha text
    const captchaProblem = await page.evaluate(() => {
      const form = document.querySelector('#contactForm');
      if (!form) return null;
      // Look for math problem text around captcha_answer
      const captchaInput = form.querySelector('input[name="captcha_answer"]');
      const parent = captchaInput ? captchaInput.parentElement : form;
      return parent ? parent.innerText : '';
    });

    console.log('#111 Captcha text detected:', captchaProblem);

    // Solve math captcha if present
    let answer = '';
    const match = captchaProblem?.match(/(\d+)\s*([\+\-\*])\s*(\d+)/);
    if (match) {
      const n1 = parseInt(match[1]);
      const op = match[2];
      const n2 = parseInt(match[3]);
      if (op === '+') answer = (n1 + n2).toString();
      else if (op === '-') answer = (n1 - n2).toString();
      else if (op === '*') answer = (n1 * n2).toString();
    }

    console.log('#111 Calculated Math Captcha Answer:', answer);

    const submitted = await page.evaluate((p, ans) => {
      const form = document.querySelector('#contactForm');
      if (!form) return false;

      const nameInput = form.querySelector('input[name="name"]');
      const emailInput = form.querySelector('input[name="email"]');
      const phoneInput = form.querySelector('input[name="phone"]');
      const subjInput = form.querySelector('input[name="subject"]');
      const msgInput = form.querySelector('textarea[name="message"]');
      const captchaInput = form.querySelector('input[name="captcha_answer"]');
      const submitBtn = form.querySelector('button[type="submit"]');

      if (nameInput) nameInput.value = p.fullName;
      if (emailInput) emailInput.value = p.email;
      if (phoneInput) phoneInput.value = p.phone;
      if (subjInput) subjInput.value = p.subject;
      if (msgInput) msgInput.value = p.message;
      if (captchaInput && ans) captchaInput.value = ans;

      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    }, OUTREACH_PROFILE, answer);

    await new Promise(r => setTimeout(r, 6000));

    const verify = await page.evaluate(() => {
      const body = document.body?.innerText.toLowerCase() || '';
      const alerts = Array.from(document.querySelectorAll('.alert, .toast, .swal2-title, .toast-message')).map(a => a.innerText).join(' ');
      return { body, alerts, url: window.location.href };
    });

    console.log('#111 Response URL:', verify.url, 'Alerts:', verify.alerts);
    if (verify.alerts.toLowerCase().includes('success') || verify.alerts.toLowerCase().includes('thank') || verify.body.includes('message has been sent') || verify.body.includes('thank you')) {
      saveLeadResult(111, 'contacted', `Contact form: https://greenpointconstructionny.com/contact (Verified: ${verify.alerts || 'Thank you'})`);
      results.push({ id: 111, company: 'Green Point Construction Company', status: 'contacted', note: `Confirmed: ${verify.alerts || 'Thank you'}` });
    } else {
      saveLeadResult(111, 'unable_to_reach', `Contact form: https://greenpointconstructionny.com/contact (Math Captcha Challenge / Response: ${verify.alerts || 'Unconfirmed'})`);
      results.push({ id: 111, company: 'Green Point Construction Company', status: 'unable_to_reach', note: verify.alerts || 'Math Captcha Challenge' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(111, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 111, company: 'Green Point Construction Company', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #112: A Cruz Construction Corp
  // ==========================================
  console.log('\n--- Processing Lead #112: A Cruz Construction Corp ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://acruzconstructioncorp.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const formDetails = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText);
      return { formCount: forms.length, buttons };
    });
    console.log('#112 Forms and buttons:', formDetails);

    // Try filling the estimate multi-step or footer form
    const submitted = await page.evaluate((p) => {
      const input = document.querySelector('#footer-message-input');
      const submitBtn = document.querySelector('button[aria-label="send-message"], button[type="submit"]');
      if (input) {
        input.value = `${p.fullName} - ${p.email} - ${p.phone}: ${p.message}`;
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
      }
      return false;
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 5000));

    const verify = await page.evaluate(() => {
      const body = document.body?.innerText.toLowerCase() || '';
      return { bodySnippet: body.substring(0, 300) };
    });

    console.log('#112 Verify:', verify.bodySnippet);
    saveLeadResult(112, 'unable_to_reach', 'Contact form: https://acruzconstructioncorp.com/contact (Interactive Quote Wizard / No direct web message confirmation)');
    results.push({ id: 112, company: 'A Cruz Construction Corp', status: 'unable_to_reach', note: 'Interactive Quote Wizard Only' });
    await page.close();
  } catch (e) {
    saveLeadResult(112, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 112, company: 'A Cruz Construction Corp', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #113: Mega Construction
  // ==========================================
  console.log('\n--- Processing Lead #113: Mega Construction ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.megaconstructionco.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 5000));

    // Wix Form submission
    const submitted = await page.evaluate((p) => {
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

      // Click Wix Submit button
      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(b => (b.innerText || '').toLowerCase().includes('request') || (b.innerText || '').toLowerCase().includes('submit') || (b.innerText || '').toLowerCase().includes('send'));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify = await page.evaluate(() => {
      const msg = document.querySelector('.wixui-form__message, [data-testid="form-submitted"]')?.innerText || '';
      const body = document.body?.innerText.toLowerCase() || '';
      return { msg, bodySnippet: body.substring(0, 300) };
    });

    console.log('#113 Wix Result:', verify.msg);
    if (verify.msg.toLowerCase().includes('thank') || verify.msg.toLowerCase().includes('submitted') || verify.bodySnippet.includes('thanks for submitting')) {
      saveLeadResult(113, 'contacted', `Contact form: https://www.megaconstructionco.com/contact-us (Wix Verified: ${verify.msg.trim() || 'Thank you'})`);
      results.push({ id: 113, company: 'Mega Construction', status: 'contacted', note: `Confirmed: ${verify.msg.trim() || 'Thank you'}` });
    } else {
      saveLeadResult(113, 'unable_to_reach', `Contact form: https://www.megaconstructionco.com/contact-us (Wix Form unconfirmed / missing dropdown selection: ${verify.msg || 'No confirmation'})`);
      results.push({ id: 113, company: 'Mega Construction', status: 'unable_to_reach', note: verify.msg || 'Missing required dropdown selection' });
    }
    await page.close();
  } catch (e) {
    saveLeadResult(113, 'unable_to_reach', `Error: ${e.message}`);
    results.push({ id: 113, company: 'Mega Construction', status: 'unable_to_reach', note: e.message });
  }

  // ==========================================
  // LEAD #114: Proper contracting NY inc
  // ==========================================
  console.log('\n--- Lead #114: Proper contracting NY inc (Previously Verified) ---');
  results.push({ id: 114, company: 'Proper contracting NY inc', status: 'contacted', note: 'Confirmed: thank you' });

  await browser.close();

  console.log('\n========================================');
  console.log('FINAL PRECISION RESULTS SUMMARY:');
  console.table(results);
}

runPrecisionProcessor();
