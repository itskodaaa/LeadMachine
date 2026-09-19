import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

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

const SUCCESS_SIGNALS = [
  'thank you',
  'thanks',
  'message has been sent',
  'we have received your',
  'we will contact you',
  'will get back to you',
  'submission was successful',
  'submitted successfully',
  'in touch shortly',
  'inquiry received',
  'form received',
  'successfully submitted',
  'your message was sent',
  'we will be in touch',
  'sent successfully',
  'request received',
  'quote requested'
];

const ERROR_SIGNALS = [
  'there was a problem',
  'please fix the errors',
  'invalid captcha',
  'recaptcha verification failed',
  'required field',
  'please enter a valid',
  'an error occurred while sending'
];

function normalizeUrl(url) {
  if (!url) return null;
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

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
}

async function safeNavigate(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    return true;
  } catch (e) {
    if (url.startsWith('https://')) {
      const httpUrl = url.replace('https://', 'http://');
      try {
        await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }
}

async function processLeadInBrowser(browser, lead) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  const startTime = Date.now();
  const rawUrl = normalizeUrl(lead.website);

  console.log(`\n========================================`);
  console.log(`[Lead #${lead.id}] Starting: ${lead.company_name} (${rawUrl})`);

  try {
    // 1. Navigate to target website
    const loaded = await safeNavigate(page, rawUrl);
    if (!loaded) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Lead #${lead.id}] ❌ Failed to load site`);
      saveLeadResult(lead.id, 'unable_to_reach', `Site inaccessible / connection timeout`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Site Inaccessible' };
    }

    // 2. Check for Cloudflare / Security blocks
    const pageTitle = (await page.title()).toLowerCase();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (pageTitle.includes('attention required') || pageTitle.includes('just a moment') || bodyText.includes('checking your browser') || bodyText.includes('cf-turnstile-wrapper')) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Lead #${lead.id}] ⚠️ Blocked by Cloudflare/Security WAF`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: Blocked by Security WAF`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Security WAF Block' };
    }

    // 3. Find Contact page link if current page doesn't have an active form
    let contactPageUrl = page.url();
    const hasFormOnCurrentPage = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.some(f => f.querySelectorAll('input, textarea').length >= 2);
    });

    if (!hasFormOnCurrentPage) {
      const contactLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const contactKeywords = ['contact', 'get-in-touch', 'inquire', 'request-quote', 'quote', 'estimate'];
        for (const k of contactKeywords) {
          const match = links.find(a => {
            const href = a.getAttribute('href') || '';
            const text = (a.innerText || '').toLowerCase();
            return (text.includes(k) || href.toLowerCase().includes(k)) && !href.startsWith('mailto:') && !href.startsWith('tel:');
          });
          if (match) return match.href;
        }
        return null;
      });

      if (contactLink) {
        console.log(`[Lead #${lead.id}] Navigating to contact page: ${contactLink}`);
        await safeNavigate(page, contactLink);
        contactPageUrl = page.url();
      }
    }

    // 4. Locate form elements
    const formDetection = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      let targetForm = forms.find(f => f.querySelectorAll('input, textarea').length >= 2);
      const container = targetForm || document.body;

      // Detect Captchas
      const captchaElements = container.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      let captchaName = null;
      if (captchaElements.length > 0) {
        const first = captchaElements[0];
        const src = first.getAttribute('src') || '';
        const cls = first.className || '';
        if (src.includes('recaptcha') || cls.includes('recaptcha')) captchaName = 'Google reCAPTCHA';
        else if (src.includes('hcaptcha') || cls.includes('hcaptcha')) captchaName = 'hCaptcha';
        else if (src.includes('turnstile') || cls.includes('turnstile')) captchaName = 'Cloudflare Turnstile';
        else captchaName = 'Captcha Challenge';
      }

      // Find inputs
      const allInputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
      if (allInputs.length === 0) {
        return { hasForm: false, captchaName };
      }

      return {
        hasForm: true,
        captchaName,
        inputCount: allInputs.length
      };
    });

    if (!formDetection.hasForm) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Lead #${lead.id}] ℹ️ No online contact web form found on ${contactPageUrl}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${contactPageUrl}: No online web form found (direct directory only)`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'No Web Form Found' };
    }

    if (formDetection.captchaName) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Lead #${lead.id}] ⚠️ Captcha detected: ${formDetection.captchaName}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (Autofilled; blocked by ${formDetection.captchaName})`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: `Blocked by ${formDetection.captchaName}` };
    }

    // 5. Autofill form fields
    console.log(`[Lead #${lead.id}] Autofilling form fields on ${contactPageUrl}...`);
    const fillResult = await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      let filledCount = 0;

      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder} ${labelText}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description') || combined.includes('notes')) {
          el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
          el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
          el.value = p.phone;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('first') || combined.includes('fname')) {
          el.value = p.firstName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('last') || combined.includes('lname')) {
          el.value = p.lastName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('name') && !combined.includes('company')) {
          el.value = p.fullName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
          el.value = p.company;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('subject') || combined.includes('topic') || combined.includes('title')) {
          el.value = p.subject;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('zip') || combined.includes('postal')) {
          el.value = p.zip;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('city')) {
          el.value = p.city;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (combined.includes('address')) {
          el.value = p.address;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
        } else if (el.tagName.toLowerCase() === 'select') {
          if (el.options.length > 1) {
            el.selectedIndex = 1;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
        }
      }
      return filledCount;
    }, OUTREACH_PROFILE);

    console.log(`[Lead #${lead.id}] Filled ${fillResult} fields. Finding submit button...`);

    // 6. Find Submit button
    const submitBtnInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button'));
      const submitKeywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message', 'request a consultation'];
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || '').toLowerCase().trim();
        const type = (btn.getAttribute('type') || '').toLowerCase();
        if (type === 'submit' || submitKeywords.some(k => text.includes(k))) {
          btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return { found: true, text };
        }
      }
      const form = document.querySelector('form');
      return { found: !!form, isFormFallback: true };
    });

    if (!submitBtnInfo.found) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Lead #${lead.id}] ⚠️ Form fields filled, but submit button could not be located.`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (Autofilled; submit button not found)`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Submit Button Not Found' };
    }

    // 7. Click submit & observe response
    console.log(`[Lead #${lead.id}] Submitting form...`);
    const initialUrl = page.url();
    
    try {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button'));
        const submitKeywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message', 'request a consultation'];
        let clicked = false;
        for (const btn of buttons) {
          const text = (btn.innerText || btn.value || '').toLowerCase().trim();
          const type = (btn.getAttribute('type') || '').toLowerCase();
          if (type === 'submit' || submitKeywords.some(k => text.includes(k))) {
            btn.click();
            clicked = true;
            break;
          }
        }
        if (!clicked) {
          const form = document.querySelector('form');
          if (form) {
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            if (typeof form.requestSubmit === 'function') form.requestSubmit();
            else form.submit();
          }
        }
      });
    } catch (clickErr) {
      // Ignored if execution context destroyed due to fast navigation
    }

    // Wait for response and DOM update
    await new Promise(r => setTimeout(r, 4500));

    // 8. Strict Verification Check
    let verification = { isSuccess: false, phrase: '', isError: false, error: '' };
    try {
      verification = await page.evaluate((signals, errors, initUrl) => {
        const body = document.body ? document.body.innerText.toLowerCase() : '';
        const current = window.location.href;
        const urlChanged = current !== initUrl && !current.includes('#');

        const successContainers = document.querySelectorAll(
          '.wixui-form__message, .form-submission-message, .sqs-form-submitted, ' +
          '.wpcf7-response-output, .wpcf7-mail-sent-ok, .gform_confirmation_message, ' +
          '.elementor-message-success, [data-testid="form-submitted"], [role="alert"], ' +
          '.alert-success, .success-message, .submitted-message, .hs-form-submitted'
        );

        for (const el of successContainers) {
          const txt = (el.innerText || '').toLowerCase();
          for (const sig of signals) {
            if (txt.includes(sig)) {
              return { isSuccess: true, phrase: `Element [${el.className}]: "${txt.trim()}"` };
            }
          }
        }

        for (const sig of signals) {
          if (body.includes(sig)) {
            return { isSuccess: true, phrase: sig };
          }
        }

        if (urlChanged && (current.includes('thank') || current.includes('success') || current.includes('confirm'))) {
          return { isSuccess: true, phrase: 'Redirected to confirmation page: ' + current };
        }

        for (const err of errors) {
          if (body.includes(err)) {
            return { isSuccess: false, isError: true, error: err };
          }
        }

        return { isSuccess: false, isError: false };
      }, SUCCESS_SIGNALS, ERROR_SIGNALS, initialUrl);
    } catch (evalErr) {
      // If context destroyed, check URL
      const currentUrl = page.url();
      if (currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('confirm'))) {
        verification = { isSuccess: true, phrase: 'Redirected to confirmation page: ' + currentUrl };
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (verification.isSuccess) {
      console.log(`[Lead #${lead.id}] ✅ SUBMISSION CONFIRMED: "${verification.phrase}" (${elapsed}s)`);
      saveLeadResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Autofilled & verified: ${verification.phrase})`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'contacted', time: elapsed, result: `Confirmed: ${verification.phrase}` };
    } else {
      let errorMsg = verification.isError ? `Validation error: "${verification.error}"` : 'No explicit confirmation detected post-submission';
      console.log(`[Lead #${lead.id}] ⚠️ Unconfirmed submission: ${errorMsg} (${elapsed}s)`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (${errorMsg})`);
      await page.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: errorMsg };
    }

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Lead #${lead.id}] ❌ Error processing lead: ${err.message}`);
    saveLeadResult(lead.id, 'unable_to_reach', `Checked ${lead.website}: Error during browser automation (${err.message.split('\n')[0]})`);
    try { await page.close(); } catch (e) {}
    return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: `Error: ${err.message}` };
  }
}

async function runBatch(limit = 10, concurrency = 3) {
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE status = 'not_contacted' AND website IS NOT NULL AND website != '' ORDER BY id ASC LIMIT ?`).all(limit);

  if (leads.length === 0) {
    console.log('No uncontacted leads remaining in the database!');
    return;
  }

  console.log(`\n🚀 Launching Puppeteer Browser Engine for ${leads.length} leads with concurrency = ${concurrency}...`);

  const browser = await puppeteer.launch({
    executablePath: fs.existsSync(CHROME_PATH) ? CHROME_PATH : undefined,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1280,800'
    ]
  });

  const results = [];
  const queue = [...leads];

  async function worker(workerId) {
    while (queue.length > 0) {
      const lead = queue.shift();
      if (!lead) break;
      const res = await processLeadInBrowser(browser, lead);
      results.push(res);
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  await browser.close();

  console.log(`\n========================================`);
  console.log(`🏁 Batch Completed: ${results.length} Leads Processed`);
  console.log(`========================================`);
  console.table(results);

  const contactedCount = results.filter(r => r.status === 'contacted').length;
  const unableCount = results.filter(r => r.status === 'unable_to_reach').length;
  console.log(`Successfully Verified & Contacted: ${contactedCount}`);
  console.log(`Unable to Reach / Blocked / Errors: ${unableCount}`);
}

const args = process.argv.slice(2);
const limit = parseInt(args[0] || '10', 10);
const concurrency = parseInt(args[1] || '3', 10);

runBatch(limit, concurrency);
