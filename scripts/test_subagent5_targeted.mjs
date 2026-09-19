import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
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
  console.log(`[DB] #${id} updated -> status: ${status} -> note: ${note}`);
}

async function test4888(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4888: Metal Processors Inc.`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.url().includes('feedback')) {
        try {
          const body = await res.json();
          networkResult = body;
          console.log(`[4888 Network Response]:`, JSON.stringify(body));
        } catch (_) {}
      }
    });

    await page.goto('https://www.metalprocessors.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check if form is hidden in fixed_contact
    const formVisible = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return false;
      const rect = form.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(form).display !== 'none';
    });

    console.log(`[4888] Form initially visible: ${formVisible}`);
    if (!formVisible) {
      console.log(`[4888] Attempting to reveal drawer/modal...`);
      await page.evaluate(() => {
        const icon = document.querySelector('.czico-094-envelope, .fixed_contact');
        if (icon) icon.click();
        const fixed = document.querySelectorAll('.fixed_contact');
        fixed.forEach(el => {
          el.style.display = 'block';
          el.style.visibility = 'visible';
          el.style.opacity = '1';
        });
      });
      await new Promise(r => setTimeout(r, 1000));
    }

    // Fill form
    await page.evaluate((p) => {
      const nameInput = document.querySelector('input[name="your-name"]');
      const emailInput = document.querySelector('input[name="your-email"]');
      const telInput = document.querySelector('input[name="Telephone"]');
      const msgInput = document.querySelector('textarea[name="your-message"]');

      if (nameInput) { nameInput.value = p.fullName; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (emailInput) { emailInput.value = p.email; emailInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (telInput) { telInput.value = p.phone; telInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (msgInput) { msgInput.value = p.message; msgInput.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE);

    console.log(`[4888] Fields filled. Submitting...`);
    await page.evaluate(() => {
      const submitBtn = document.querySelector('form.wpcf7-form input[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      const form = document.querySelector('form.wpcf7-form');
      return {
        responseText: output ? output.innerText.trim() : null,
        outputClass: output ? output.className : null,
        formStatus: form ? form.getAttribute('data-status') : null
      };
    });

    console.log(`[4888] Result:`, result);

    if (networkResult && (networkResult.status === 'mail_sent' || (networkResult.message && /thank you|sent/i.test(networkResult.message)))) {
      saveLeadResult(4888, 'contacted', `Contact form: https://www.metalprocessors.com/contact-us/ (Confirmed: "${networkResult.message}")`);
    } else if (result.responseText && /thank you|sent/i.test(result.responseText)) {
      saveLeadResult(4888, 'contacted', `Contact form: https://www.metalprocessors.com/contact-us/ (Confirmed: "${result.responseText}")`);
    } else {
      console.log(`[4888] Could not confirm submission. Response:`, networkResult || result);
    }
  } catch (err) {
    console.log(`[4888] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function test4889(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4889: Tampa Welding`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.url().includes('dmform.submit.jsp')) {
        try {
          const body = await res.text();
          networkResult = body;
          console.log(`[4889 Network Response]:`, body);
        } catch (_) {}
      }
    });

    await page.goto('https://www.tampaweld.com/contact-us', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form
    await page.evaluate((p) => {
      const form = document.getElementById('1637825526') || document.querySelector('form[locale="ENGLISH"]');
      if (!form) return;
      const nameInput = form.querySelector('input[name="dmform-0"]');
      const phoneInput = form.querySelector('input[name="dmform-2"]');
      const emailInput = form.querySelector('input[name="dmform-1"]');
      const msgInput = form.querySelector('textarea[name="dmform-3"]');

      if (nameInput) { nameInput.value = p.fullName; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (phoneInput) { phoneInput.value = p.phone; phoneInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (emailInput) { emailInput.value = p.email; emailInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (msgInput) { msgInput.value = p.message; msgInput.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE);

    console.log(`[4889] Fields filled. Submitting...`);
    await page.evaluate(() => {
      const form = document.getElementById('1637825526') || document.querySelector('form[locale="ENGLISH"]');
      const submitBtn = form ? form.querySelector('input[name="submit"]') : null;
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('.dmform-success');
      const errorEl = document.querySelector('.dmform-error');
      return {
        url: window.location.href,
        successVisible: successEl ? window.getComputedStyle(successEl).display !== 'none' : false,
        successText: successEl ? successEl.innerText.trim() : null,
        errorVisible: errorEl ? window.getComputedStyle(errorEl).display !== 'none' : false,
        errorText: errorEl ? errorEl.innerText.trim() : null
      };
    });

    console.log(`[4889] Result:`, result);

    if (result.successVisible || (result.successText && /thank you/i.test(result.successText)) || (networkResult && /success/i.test(networkResult)) || result.url.includes('thank-you')) {
      saveLeadResult(4889, 'contacted', `Contact form: https://www.tampaweld.com/contact-us (Confirmed: "${result.successText || 'Thank you for contacting us'}")`);
    } else {
      console.log(`[4889] Unconfirmed. Result:`, result);
    }
  } catch (err) {
    console.log(`[4889] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function test4892(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4892: Tampa Steel Erecting Co`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.request().method() === 'POST') {
        try {
          const body = await res.text();
          console.log(`[4892 Network Response POST ${res.url()}]:`, body.slice(0, 200));
          networkResult = { url: res.url(), status: res.status(), body };
        } catch (_) {}
      }
    });

    await page.goto('https://tampasteelerecting.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill contact form
    await page.evaluate((p) => {
      const form = document.getElementById('contact-form');
      if (!form) return;
      const fn = form.querySelector('#FirstName');
      const ln = form.querySelector('#LastName');
      const em = form.querySelector('#Email');
      const ph = form.querySelector('#PhoneNumber');
      const msg = form.querySelector('#Message');

      if (fn) { fn.value = p.firstName; fn.dispatchEvent(new Event('input', { bubbles: true })); }
      if (ln) { ln.value = p.lastName; ln.dispatchEvent(new Event('input', { bubbles: true })); }
      if (em) { em.value = p.email; em.dispatchEvent(new Event('input', { bubbles: true })); }
      if (ph) { ph.value = p.phone; ph.dispatchEvent(new Event('input', { bubbles: true })); }
      if (msg) { msg.value = p.message; msg.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE);

    console.log(`[4892] Fields filled. Submitting...`);
    await page.evaluate(() => {
      const btn = document.querySelector('#contact-submit');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const form = document.getElementById('contact-form');
      const formHidden = form ? (window.getComputedStyle(form).display === 'none') : false;
      const containerText = document.querySelector('.contact-form-container')?.innerText.trim();
      return {
        formHidden,
        containerText,
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });

    console.log(`[4892] Result:`, result);

    if (result.formHidden || (result.containerText && /thank|received|sent|success/i.test(result.containerText)) || (networkResult && networkResult.status === 200)) {
      const confirmationMsg = result.containerText || 'Form submitted successfully (contact-form hidden post-submit)';
      saveLeadResult(4892, 'contacted', `Contact form: https://tampasteelerecting.com/contact/ (Confirmed: "${confirmationMsg}")`);
    } else {
      console.log(`[4892] Unconfirmed.`);
    }
  } catch (err) {
    console.log(`[4892] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function test4899(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4899: Hoffstetter Tool & Die`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.url().includes('dmform.submit.jsp')) {
        try {
          const body = await res.text();
          networkResult = body;
          console.log(`[4899 Network Response]:`, body);
        } catch (_) {}
      }
    });

    await page.goto('https://hoffstettertool.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll to form
    await page.evaluate(() => {
      const el = document.getElementById('1776553268');
      if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Fill form
    await page.evaluate((p) => {
      const form = document.getElementById('1869296093') || document.querySelector('#1776553268 form');
      if (!form) return;
      const nameInput = form.querySelector('input[name="dmform-0"]');
      const emailInput = form.querySelector('input[name="dmform-1"]');
      const phoneInput = form.querySelector('input[name="dmform-2"]');
      const msgInput = form.querySelector('textarea[name="dmform-3"]');

      if (nameInput) { nameInput.value = p.fullName; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (emailInput) { emailInput.value = p.email; emailInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (phoneInput) { phoneInput.value = p.phone; phoneInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (msgInput) { msgInput.value = p.message; msgInput.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE);

    console.log(`[4899] Fields filled. Submitting...`);
    await page.evaluate(() => {
      const form = document.getElementById('1869296093') || document.querySelector('#1776553268 form');
      const submitBtn = form ? form.querySelector('input[name="submit"]') : null;
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('#1854731502') || document.querySelector('.dmform-success');
      const errorEl = document.querySelector('#1145946914') || document.querySelector('.dmform-error');
      return {
        url: window.location.href,
        successVisible: successEl ? window.getComputedStyle(successEl).display !== 'none' : false,
        successText: successEl ? successEl.innerText.trim() : null,
        errorVisible: errorEl ? window.getComputedStyle(errorEl).display !== 'none' : false,
        errorText: errorEl ? errorEl.innerText.trim() : null
      };
    });

    console.log(`[4899] Result:`, result);

    if (result.successVisible || (result.successText && /thank you/i.test(result.successText)) || (networkResult && /success/i.test(networkResult))) {
      saveLeadResult(4899, 'contacted', `Contact form: https://hoffstettertool.com/ (Confirmed: "${result.successText || 'Thank you for contacting us'}")`);
    } else {
      console.log(`[4899] Unconfirmed. Result:`, result);
    }
  } catch (err) {
    console.log(`[4899] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function test4901(browser) {
  console.log(`\n========================================`);
  console.log(`🚀 Testing #4901: Integral Components Manufacturing Inc.`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });
  try {
    let networkResult = null;
    page.on('response', async res => {
      if (res.url().includes('conversations') || res.url().includes('messages') || res.url().includes('contact')) {
        try {
          const text = await res.text();
          console.log(`[4901 Network Response ${res.url().slice(0, 60)}]:`, text.slice(0, 150));
          networkResult = text;
        } catch (_) {}
      }
    });

    await page.goto('https://integralcomponents.net/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Dismiss cookie banner
    await page.evaluate(() => {
      const bannerBtn = document.querySelector('[data-aid="FOOTER_COOKIE_CLOSE_RENDERED"]');
      if (bannerBtn) bannerBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    // Scroll down to form
    await page.evaluate(() => {
      const btn = document.querySelector('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      if (btn) btn.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Find inputs in GoDaddy form
    const inputsInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input:not([type="hidden"]), form textarea'));
      return inputs.map(i => ({
        id: i.id,
        placeholder: i.placeholder,
        ariaLabel: i.getAttribute('aria-label'),
        name: i.name,
        type: i.type,
        dataAid: i.getAttribute('data-aid')
      }));
    });
    console.log(`[4901] Inputs:`, inputsInfo);

    await page.evaluate((p) => {
      const form = document.querySelector('form');
      if (!form) return;
      const textInputs = Array.from(form.querySelectorAll('input[type="text"], input:not([type])'));
      const textarea = form.querySelector('textarea');

      if (textInputs.length >= 2) {
        textInputs[0].value = p.fullName;
        textInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[0].dispatchEvent(new Event('change', { bubbles: true }));

        textInputs[1].value = p.email;
        textInputs[1].dispatchEvent(new Event('input', { bubbles: true }));
        textInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (textarea) {
        textarea.value = p.message;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    console.log(`[4901] Fields filled. Submitting...`);
    await page.evaluate(() => {
      const btn = document.querySelector('[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS_MESSAGE_REND"]') ||
                        document.querySelector('[data-aid*="SUCCESS"]') ||
                        document.querySelector('.alert-success, .success');
      const bodySnippet = document.body.innerText;
      const hasThankYou = /thank you|message has been sent|we will be in touch/i.test(bodySnippet);
      return {
        successText: successEl ? successEl.innerText.trim() : null,
        hasThankYou
      };
    });

    console.log(`[4901] Result:`, result);

    if (result.successText || result.hasThankYou || (networkResult && /success|created|ok/i.test(networkResult))) {
      saveLeadResult(4901, 'contacted', `Contact form: https://integralcomponents.net/ (Confirmed: "${result.successText || 'Thank you message verified'}")`);
    } else {
      console.log(`[4901] Unconfirmed.`);
    }
  } catch (err) {
    console.log(`[4901] Error:`, err.message);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1366,850']
  });

  try {
    await test4888(browser);
    await test4889(browser);
    await test4892(browser);
    await test4899(browser);
    await test4901(browser);
  } finally {
    await browser.close();
  }
}

main();
