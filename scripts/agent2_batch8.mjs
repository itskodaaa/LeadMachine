import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
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
  'quote requested',
  'your message has been submitted'
];

const ERROR_SIGNALS = [
  'there was a problem',
  'please fix the errors',
  'invalid captcha',
  'recaptcha verification failed',
  'please enter a valid',
  'an error occurred while sending'
];

function recordResult(id, status, notes) {
  db.transaction(() => {
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, notes, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(id, action, notes);
  })();
}

function normalizeUrl(url) {
  if (!url) return null;
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

async function processSingleLead(lead) {
  const start = Date.now();
  console.log(`\n========================================\n[Agent-2] Processing #${lead.id}: ${lead.company_name} (${lead.website})`);

  let browser = null;
  let page = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_BIN,
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 850 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    const rawUrl = normalizeUrl(lead.website);
    let loaded = false;

    try {
      await page.goto(rawUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      loaded = true;
    } catch (e) {
      if (rawUrl.startsWith('https://')) {
        const httpUrl = rawUrl.replace('https://', 'http://');
        try {
          await page.goto(httpUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
          loaded = true;
        } catch (err) {}
      }
    }

    if (!loaded) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`❌ #${lead.id} Inaccessible (${elapsed}s)`);
      recordResult(lead.id, 'unable_to_reach', `Site inaccessible / connection timeout`);
      await browser.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Site Inaccessible' };
    }

    // Check WAF / Cloudflare
    const pageTitle = (await page.title()).toLowerCase();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (pageTitle.includes('attention required') || pageTitle.includes('just a moment') || bodyText.includes('checking your browser') || bodyText.includes('cf-turnstile-wrapper')) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`⚠️ #${lead.id} Blocked by Security WAF (${elapsed}s)`);
      recordResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: Blocked by Security WAF`);
      await browser.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Security WAF Block' };
    }

    // Check contact page if no form on current page
    let contactPageUrl = page.url();
    const hasForm = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea');
      return inputs.length >= 2;
    });

    if (!hasForm) {
      const contactHref = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const keywords = ['contact', 'get-in-touch', 'inquire', 'request-quote', 'quote', 'estimate', 'rfq', 'connect'];
        for (const k of keywords) {
          const match = links.find(a => {
            const href = a.getAttribute('href') || '';
            const text = (a.innerText || '').toLowerCase();
            return (text.includes(k) || href.toLowerCase().includes(k)) && !href.startsWith('mailto:') && !href.startsWith('tel:');
          });
          if (match) return match.href;
        }
        return null;
      });

      if (contactHref) {
        try {
          await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 15000 });
          contactPageUrl = page.url();
        } catch (e) {}
      }
    }

    // Form and Captcha detection
    const detection = await page.evaluate(() => {
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

      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
      return {
        captchaName,
        inputCount: inputs.length,
        inputs: inputs.map(i => ({
          tag: i.tagName,
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          required: i.required
        }))
      };
    });

    console.log(`Detected fields (${detection.inputCount}):`, detection.inputs);

    if (detection.inputCount === 0) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`ℹ️ #${lead.id} No form found on ${contactPageUrl} (${elapsed}s)`);
      recordResult(lead.id, 'unable_to_reach', `Checked ${contactPageUrl}: No online web form found`);
      await browser.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'No Web Form Found' };
    }

    if (detection.captchaName) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`⚠️ #${lead.id} Blocked by Captcha: ${detection.captchaName} (${elapsed}s)`);
      recordResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (Autofilled; blocked by ${detection.captchaName})`);
      await browser.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: `Blocked by ${detection.captchaName}` };
    }

    // Autofill
    console.log('Populating fields with Pamela Jameson outreach profile...');
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder} ${labelText}`;

        // Skip honeypots
        if (name.includes('honeypot') || name.includes('ak_hp') || id.includes('honeypot') || id.includes('hp_')) {
          el.value = '';
          continue;
        }

        if (type === 'radio' || type === 'checkbox') {
          if (el.required || combined.includes('agree') || combined.includes('terms') || combined.includes('general') || combined.includes('inquiry')) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
            el.dispatchEvent(new Event('click', { bubbles: true }));
          }
          continue;
        }

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description') || combined.includes('notes')) {
          el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
          el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
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

    await new Promise(r => setTimeout(r, 1000));

    // Submit
    console.log('Submitting form...');
    const initUrl = page.url();
    await page.evaluate(() => {
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
    });

    console.log('Waiting for post-submission response (7s)...');
    await new Promise(r => setTimeout(r, 7000));

    // Evaluate response
    const verification = await page.evaluate((signals, errors, initialUrl) => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      const current = window.location.href;
      const urlChanged = current !== initialUrl && !current.includes('#');

      const successContainers = document.querySelectorAll(
        '.wixui-form__message, .form-submission-message, .sqs-form-submitted, ' +
        '.wpcf7-response-output, .wpcf7-mail-sent-ok, .gform_confirmation_message, ' +
        '.elementor-message-success, [data-testid="form-submitted"], [role="alert"], ' +
        '.alert-success, .success-message, .submitted-message, .hs-form-submitted, ' +
        '.form-success, .w-form-done, .ff-message-success'
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
    }, SUCCESS_SIGNALS, ERROR_SIGNALS, initUrl);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (verification.isSuccess) {
      console.log(`✅ #${lead.id} CONFIRMED SUCCESS: "${verification.phrase}" (${elapsed}s)`);
      recordResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Autofilled & verified: ${verification.phrase})`);
      await browser.close();
      return { id: lead.id, company: lead.company_name, status: 'contacted', time: elapsed, result: `Confirmed: ${verification.phrase}` };
    } else {
      const detail = verification.isError ? `Validation error: "${verification.error}"` : 'No explicit confirmation detected post-submission';
      console.log(`⚠️ #${lead.id} Unconfirmed: ${detail} (${elapsed}s)`);
      recordResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (${detail})`);
      await browser.close();
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: detail };
    }

  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`❌ #${lead.id} Error: ${err.message} (${elapsed}s)`);
    recordResult(lead.id, 'unable_to_reach', `Site inaccessible: ${err.message}`);
    if (browser) { try { await browser.close(); } catch (e) {} }
    return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: `Error: ${err.message}` };
  }
}

async function main() {
  const leadIds = [689, 690, 691, 692, 693, 696, 697, 698, 700, 701];
  console.log(`\n🚀 [Agent-2] Starting Batch 8 processor for leads: ${leadIds.join(', ')}...`);

  const placeholders = leadIds.map(() => '?').join(',');
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

  const results = [];
  for (const lead of leads) {
    const res = await processSingleLead(lead);
    results.push(res);
  }

  console.log('\n========================================');
  console.log('🏁 [Agent-2] Batch 8 Completed:');
  console.table(results);
}

main().catch(console.error);
