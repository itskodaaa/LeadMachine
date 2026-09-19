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
  'thanks for contacting',
  'thanks for reaching out',
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
  'this field is required',
  'is a required field',
  'please enter a valid',
  'an error occurred while sending'
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  const baseNotes = current?.notes ? current.notes.split(' | ')[0] : '';
  const newNotes = baseNotes ? `${baseNotes} | ${note}` : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB UPDATED] #${id}: status=${status}, note=${note}`);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    ]
  });

  const targets = [
    { id: 3975, name: 'U.S. Structures Engineering Group; Inc.', urls: ['http://usstructuresinc.com/contact/', 'https://usstructuresinc.com/contact/'] },
    { id: 3976, name: 'Ambro Inc', urls: ['https://www.ambroeng.com/contact', 'https://www.ambroeng.com/'] },
    { id: 3977, name: 'RAS Engineering', urls: ['https://www.rascompany.com/contact-us', 'https://www.rascompany.com/'] },
    { id: 3978, name: 'Sunrise Structural Engineering', urls: ['https://www.miamistructuralengineering.com/contact.html', 'https://www.miamistructuralengineering.com/'] },
    { id: 3980, name: 'Mimik Solutions LLC', urls: ['https://mimikfl.com/'] },
    { id: 3983, name: 'O’Donnell & Naccarato', urls: ['https://www.o-n.com/contact/', 'https://www.o-n.com/'] }
  ];

  for (const t of targets) {
    console.log(`\n========================================`);
    console.log(`Processing #${t.id}: ${t.name}`);

    let page;
    try {
      page = await browser.newPage();
      page.on('dialog', async d => { console.log(`[#${t.id}] Dialog:`, d.message()); await d.dismiss(); });
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

      let loadedUrl = null;
      for (const u of t.urls) {
        try {
          console.log(`[#${t.id}] Navigating to ${u}...`);
          await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 20000 });
          loadedUrl = page.url();
          console.log(`[#${t.id}] Loaded: ${loadedUrl}`);
          break;
        } catch (e) {
          console.log(`[#${t.id}] Failed ${u}: ${e.message}`);
        }
      }

      if (!loadedUrl) {
        console.log(`[#${t.id}] Inaccessible`);
        saveLeadResult(t.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
        await page.close();
        continue;
      }

      await new Promise(r => setTimeout(r, 2000));

      // Check contact link if no inputs on current page
      let inputCount = await page.evaluate(() => document.querySelectorAll('input:not([type="hidden"]), textarea').length);
      if (inputCount < 2) {
        console.log(`[#${t.id}] Less than 2 inputs on ${loadedUrl}, searching for contact link...`);
        const contactHref = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href]'));
          for (const a of links) {
            const text = (a.innerText || '').toLowerCase();
            const href = (a.getAttribute('href') || '').toLowerCase();
            if ((text.includes('contact') || href.includes('contact')) && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
              return a.href;
            }
          }
          return null;
        });

        if (contactHref && contactHref !== loadedUrl) {
          console.log(`[#${t.id}] Found contact page: ${contactHref}`);
          try {
            await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 20000 });
            loadedUrl = page.url();
            await new Promise(r => setTimeout(r, 2000));
          } catch (e) {
            console.log(`[#${t.id}] Failed navigating to contact page:`, e.message);
          }
        }
      }

      // Check captchas, inputs, etc.
      const pageDetails = await page.evaluate(() => {
        const text = document.body ? document.body.innerText.toLowerCase() : '';
        const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
        let captchaName = null;
        if (captchas.length > 0) {
          const src = captchas[0].getAttribute('src') || '';
          const cls = captchas[0].className || '';
          if (src.includes('recaptcha') || cls.includes('recaptcha')) captchaName = 'Google reCAPTCHA';
          else if (src.includes('hcaptcha') || cls.includes('hcaptcha')) captchaName = 'hCaptcha';
          else if (src.includes('turnstile') || cls.includes('turnstile')) captchaName = 'Cloudflare Turnstile';
          else captchaName = 'Captcha Challenge';
        }

        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
        const emails = (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || []);

        return {
          url: window.location.href,
          inputsCount: inputs.length,
          captchaName,
          emails: [...new Set(emails)]
        };
      });

      console.log(`[#${t.id}] Page Details:`, JSON.stringify(pageDetails, null, 2));

      if (pageDetails.inputsCount < 2) {
        console.log(`[#${t.id}] No online web form found.`);
        const note = pageDetails.emails.length > 0
          ? `Checked ${pageDetails.url}: No online web form found (Direct email available: ${pageDetails.emails[0]})`
          : `Checked ${pageDetails.url}: No online web form found`;
        saveLeadResult(t.id, 'unable_to_reach', note);
        await page.close();
        continue;
      }

      if (pageDetails.captchaName) {
        console.log(`[#${t.id}] Blocked by ${pageDetails.captchaName}`);
        saveLeadResult(t.id, 'unable_to_reach', `Contact form: ${pageDetails.url} (Blocked by ${pageDetails.captchaName})`);
        await page.close();
        continue;
      }

      // Autofill
      console.log(`[#${t.id}] Autofilling form...`);
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        for (const el of inputs) {
          const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
          const name = (el.getAttribute('name') || '').toLowerCase();
          const id = (el.getAttribute('id') || '').toLowerCase();
          const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
          const labelFor = el.id ? (document.querySelector('label[for="' + el.id + '"]')?.innerText || '').toLowerCase() : '';
          const fieldContainer = el.closest('.gfield, .form-group, .field, .elementor-field-group, .wpforms-field, [class*="field"]');
          const containerLabel = (fieldContainer?.querySelector('label')?.innerText || '').toLowerCase();
          const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
          const ariaLabel = (el.getAttribute('aria-label') || el.getAttribute('data-placeholder') || '').toLowerCase();
          const dataAid = (el.getAttribute('data-aid') || '').toLowerCase();
          const combined = `${name} ${id} ${placeholder} ${labelText} ${containerLabel} ${labelFor} ${ariaLabel} ${dataAid}`;

          if (type === 'file' || type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset') continue;
          if (name.includes('gotcha') || name.includes('honeypot') || name.includes('[hp]') || id.includes('-field-hp') || el.closest('.gfield--type-honeypot') || el.closest('.gform_validation_container') || el.closest('.wpforms-field-hp') || el.tabIndex === -1 || el.getAttribute('aria-hidden') === 'true' || (el.offsetWidth === 0 && el.offsetHeight === 0 && el.type !== 'hidden')) {
            continue;
          }

          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description') || combined.includes('notes') || combined.includes('how can we help') || combined.includes('help you')) {
            el.value = p.message;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
            el.value = p.email;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
            el.value = type === 'number' ? p.phone.replace(/\D/g, '') : p.phone;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('first') || combined.includes('fname')) {
            el.value = p.firstName;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('last') || combined.includes('lname')) {
            el.value = p.lastName;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('name') && !combined.includes('company')) {
            el.value = p.fullName;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
            el.value = p.company;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('subject') || combined.includes('topic') || combined.includes('title')) {
            el.value = p.subject;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('zip') || combined.includes('postal')) {
            el.value = p.zip;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('city')) {
            el.value = p.city;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (combined.includes('address')) {
            el.value = p.address;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (el.tagName.toLowerCase() === 'select') {
            if (el.options.length > 1) {
              el.selectedIndex = 1;
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
      }, OUTREACH_PROFILE);

      const initialUrl = page.url();
      console.log(`[#${t.id}] Submitting form...`);

      // Attempt submit with safety
      try {
        await Promise.race([
          page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button'));
            const submitKeywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message', 'request a consultation'];
            for (const btn of buttons) {
              const text = (btn.innerText || btn.value || '').toLowerCase().trim();
              const type = (btn.getAttribute('type') || '').toLowerCase();
              if (type === 'submit' || submitKeywords.some(k => text.includes(k))) {
                btn.click();
                return;
              }
            }
            const form = document.querySelector('form');
            if (form) {
              if (typeof form.requestSubmit === 'function') form.requestSubmit();
              else form.submit();
            }
          }),
          new Promise(r => setTimeout(r, 4000))
        ]);
      } catch (e) {
        console.log(`[#${t.id}] Submit action note:`, e.message);
      }

      await new Promise(r => setTimeout(r, 5000));

      let verification = { isSuccess: false, phrase: '' };
      try {
        verification = await page.evaluate((signals, errors, initUrl) => {
          const body = document.body ? document.body.innerText.toLowerCase() : '';
          const current = window.location.href;
          const urlChanged = current !== initUrl && !current.includes('#');

          const successContainers = document.querySelectorAll(
            '.wpforms-confirmation-container, .wixui-form__message, .form-submission-message, .sqs-form-submitted, ' +
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
      } catch (e) {
        console.log(`[#${t.id}] Evaluate error:`, e.message);
      }

      if (verification.isSuccess) {
        console.log(`✅ [#${t.id}] Confirmed: ${verification.phrase}`);
        saveLeadResult(t.id, 'contacted', `Contact form: ${page.url()} (Autofilled & verified: ${verification.phrase})`);
      } else {
        let errorMsg = verification.isError ? `Validation error: "${verification.error}"` : 'No explicit confirmation detected post-submission';
        console.log(`⚠️ [#${t.id}] Unconfirmed: ${errorMsg}`);
        saveLeadResult(t.id, 'unable_to_reach', `Contact form: ${page.url()} (${errorMsg})`);
      }

      await page.close();
    } catch (err) {
      console.log(`[#${t.id}] Error: ${err.message}`);
      if (page) try { await page.close(); } catch (_) {}
    }
  }

  await browser.close();
  console.log(`Finished remaining targets.`);
}

run().catch(console.error);
