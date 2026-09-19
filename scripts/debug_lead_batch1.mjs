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

const leads = [
  { id: 4556, company: 'Hurley & Stewart', url: 'https://hurleystewart.com' },
  { id: 4557, company: 'US Engineering Corporation', url: 'https://usengineeringcorp.com' },
  { id: 4558, company: 'Land & Resource Engineering', url: 'https://lremi.com' },
  { id: 4559, company: 'Exxel Engineering Inc', url: 'https://exxelengineering.com' },
  { id: 4560, company: 'SOMAT Engineering, Inc.', url: 'https://somateng.com' },
  { id: 4561, company: 'Hoffman Consultants', url: 'https://hoffmanconsultants.com' },
  { id: 4562, company: 'Mid Michigan Engineering & Survey Co.', url: 'https://midmieng.com' },
  { id: 4563, company: 'Century A & E Facilities Design', url: 'https://centuryae.com' },
  { id: 4564, company: 'Grand Rapids Construction, LLC', url: 'https://grandrapidsconstruction.com' },
  { id: 4565, company: 'Gateway Engineering Inc', url: 'https://gateway-engineering.com' },
];

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

async function inspectAndProcessLead(browser, lead) {
  console.log(`\n========================================\n[Lead #${lead.id}] ${lead.company} (${lead.url})`);
  const page = await browser.newPage();
  let dialogMessage = null;
  page.on('dialog', async d => {
    dialogMessage = d.message();
    console.log(`[Lead #${lead.id}] Dialog appeared: ${dialogMessage}`);
    await d.accept().catch(() => {});
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    let loaded = false;
    const urlsToTry = [lead.url];
    if (!lead.url.includes('www.')) urlsToTry.push(lead.url.replace('://', '://www.'));
    urlsToTry.push(lead.url.replace('https://', 'http://'));
    if (!lead.url.includes('www.')) urlsToTry.push(lead.url.replace('https://', 'http://www.'));

    for (const u of urlsToTry) {
      try {
        console.log(`  Trying to navigate: ${u}`);
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 15000 });
        loaded = true;
        break;
      } catch (e) {
        console.log(`  Failed ${u}: ${e.message}`);
      }
    }

    if (!loaded) {
      console.log(`  RESULT: Inaccessible`);
      return { id: lead.id, company: lead.company, status: 'unable_to_reach', result: 'Site Inaccessible / Connection Timeout' };
    }

    console.log(`  Navigated to: ${page.url()} | Title: ${await page.title()}`);

    // Check contact page link
    const findContactUrl = async () => {
      return await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const keywords = ['contact', 'get-in-touch', 'inquire', 'reach-us', 'quote', 'contact-us', 'contact_us'];
        for (const k of keywords) {
          const m = links.find(a => {
            const h = (a.getAttribute('href') || '').toLowerCase();
            const t = (a.innerText || '').toLowerCase().trim();
            return (t.includes(k) || h.includes(k)) && !h.startsWith('mailto:') && !h.startsWith('tel:') && !h.startsWith('javascript:');
          });
          if (m) return m.href;
        }
        return null;
      });
    };

    let formInfo = await checkForm(page);
    if (!formInfo.hasInputs) {
      const contactUrl = await findContactUrl();
      if (contactUrl && contactUrl !== page.url()) {
        console.log(`  Found contact link: ${contactUrl}. Navigating...`);
        try {
          await page.goto(contactUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          formInfo = await checkForm(page);
        } catch (e) {
          console.log(`  Could not navigate to contact page: ${e.message}`);
        }
      }
    }

    console.log(`  Form status: hasInputs=${formInfo.hasInputs}, inputsCount=${formInfo.inputsCount}, captcha=${formInfo.captcha}`);
    if (formInfo.emails.length > 0) {
      console.log(`  Direct emails on page: ${formInfo.emails.join(', ')}`);
    }

    if (!formInfo.hasInputs) {
      const note = `Checked ${page.url()}: No web form found.${formInfo.emails.length ? ' Direct emails: ' + formInfo.emails.join(', ') : ''}`;
      console.log(`  RESULT: No Web Form Found`);
      return { id: lead.id, company: lead.company, status: 'unable_to_reach', result: note };
    }

    if (formInfo.captcha) {
      const note = `Contact form: ${page.url()} (Autofill possible, but blocked by ${formInfo.captcha})`;
      console.log(`  RESULT: Blocked by ${formInfo.captcha}`);
      return { id: lead.id, company: lead.company, status: 'unable_to_reach', result: note };
    }

    // Inspect fields
    console.log(`  Fields found:`, formInfo.fieldsSummary);

    // Fill form
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const labelFor = el.id ? (document.querySelector('label[for="' + el.id + '"]')?.innerText || '').toLowerCase() : '';
        const fieldContainer = el.closest('.gfield, .form-group, .field, .elementor-field-group, .wpforms-field, [class*="field"], p');
        const containerLabel = (fieldContainer?.querySelector('label')?.innerText || '').toLowerCase();
        const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || el.getAttribute('data-placeholder') || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder} ${labelText} ${containerLabel} ${labelFor} ${ariaLabel}`;

        if (['file', 'hidden', 'submit', 'button', 'reset'].includes(type)) continue;

        // Skip honeypots
        if (name.includes('gotcha') || name.includes('honeypot') || name.includes('[hp]') || id.includes('hp') || name === 'website' || (el.offsetWidth === 0 && el.offsetHeight === 0 && el.type !== 'hidden')) {
          continue;
        }

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('notes') || combined.includes('project')) {
          el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
          el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'tel' || combined.includes('phone') || combined.includes('tel') || combined.includes('cell')) {
          el.value = p.phone;
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
        } else if (combined.includes('subject') || combined.includes('topic')) {
          el.value = p.subject;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('city')) {
          el.value = p.city;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('zip') || combined.includes('postal')) {
          el.value = p.zip;
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

    console.log(`  Autofill completed. Submitting...`);
    const initialUrl = page.url();

    // Submit button click
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button'));
      const submitKeywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message', 'inquire'];
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || '').toLowerCase().trim();
        const type = (btn.getAttribute('type') || '').toLowerCase();
        if (type === 'submit' || submitKeywords.some(k => text.includes(k))) {
          btn.click();
          return `Clicked button: ${text || type}`;
        }
      }
      const form = document.querySelector('form');
      if (form) {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
        return 'Submitted form via requestSubmit';
      }
      return 'No submit element found';
    });

    console.log(`  Submit action: ${clickResult}`);

    // Wait for response/navigation
    await new Promise(r => setTimeout(r, 6000));

    // Check result
    const verification = await page.evaluate((initUrl) => {
      const currentUrl = window.location.href;
      const text = document.body ? document.body.innerText : '';
      const textLower = text.toLowerCase();

      // Check validation error messages
      const errors = [];
      const errorEls = document.querySelectorAll('.error, .is-error, .wpcf7-not-valid-tip, .gfield_description_validation_error, [aria-invalid="true"]');
      for (const el of errorEls) {
        if (el.innerText.trim()) errors.push(el.innerText.trim());
      }

      const SUCCESS_SIGNALS = [
        'thank you', 'thanks for contacting', 'thanks for reaching out',
        'message has been sent', 'we have received your', 'we will contact you',
        'will get back to you', 'submission was successful', 'submitted successfully',
        'in touch shortly', 'inquiry received', 'form received', 'successfully submitted',
        'your message was sent', 'we will be in touch', 'sent successfully'
      ];

      for (const s of SUCCESS_SIGNALS) {
        if (textLower.includes(s)) {
          return { success: true, reason: s, currentUrl, errors };
        }
      }

      if (currentUrl !== initUrl && (currentUrl.includes('thank') || currentUrl.includes('success'))) {
        return { success: true, reason: 'Redirected to ' + currentUrl, currentUrl, errors };
      }

      return { success: false, reason: 'No confirmation text found', currentUrl, errors, snippet: text.slice(0, 300) };
    }, initialUrl);

    if (dialogMessage) {
      console.log(`  Alert dialog detected: ${dialogMessage}`);
      if (/thank|received|sent|success/i.test(dialogMessage)) {
        return { id: lead.id, company: lead.company, status: 'contacted', result: `Alert confirmed: ${dialogMessage}` };
      }
    }

    if (verification.success) {
      console.log(`  RESULT: Contacted! (${verification.reason})`);
      return { id: lead.id, company: lead.company, status: 'contacted', result: `Contact form: ${page.url()} (Autofilled & verified: ${verification.reason})` };
    } else {
      console.log(`  RESULT: Unable to confirm (${verification.reason}). Errors: ${verification.errors.join('; ')}`);
      let detail = `Contact form: ${page.url()} (Submission attempted; ${verification.errors.length ? 'Errors: ' + verification.errors.join(', ') : 'no confirmation detected'})`;
      return { id: lead.id, company: lead.company, status: 'unable_to_reach', result: detail };
    }

  } catch (err) {
    console.error(`  Exception: ${err.message}`);
    return { id: lead.id, company: lead.company, status: 'unable_to_reach', result: `Error: ${err.message}` };
  } finally {
    try { await page.close(); } catch (_) {}
  }
}

async function checkForm(page) {
  return await page.evaluate(() => {
    const forms = Array.from(document.querySelectorAll('form') || []);
    const container = forms.find(f => f.querySelectorAll('input, textarea').length >= 2) || document.body;

    const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
    let captcha = null;
    if (captchas.length > 0) {
      const src = captchas[0].getAttribute('src') || '';
      const cls = captchas[0].className || '';
      if (src.includes('recaptcha') || cls.includes('recaptcha')) captcha = 'Google reCAPTCHA';
      else if (src.includes('hcaptcha') || cls.includes('hcaptcha')) captcha = 'hCaptcha';
      else if (src.includes('turnstile') || cls.includes('turnstile')) captcha = 'Cloudflare Turnstile';
      else captcha = 'Captcha Challenge';
    }

    const inputs = Array.from(container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
    const fieldsSummary = inputs.map(i => `${i.tagName.toLowerCase()}[type=${i.type || ''}, name=${i.name || ''}, id=${i.id || ''}, placeholder="${i.placeholder || ''}"]`);

    const mailtoLinks = Array.from(document.querySelectorAll('a[href^="mailto:"]')).map(a => a.href.replace('mailto:', '').split('?')[0].trim());
    const uniqueEmails = [...new Set(mailtoLinks.filter(e => e.includes('@')))];

    return {
      hasInputs: inputs.length >= 2,
      inputsCount: inputs.length,
      captcha,
      fieldsSummary,
      emails: uniqueEmails
    };
  });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];
  for (const lead of leads) {
    const res = await inspectAndProcessLead(browser, lead);
    results.push(res);
  }

  await browser.close();

  console.log('\n================ FINAL DIAGNOSTIC RESULTS ================');
  console.table(results);
}

run();
