/**
 * Targeted retry for Sub-Agent 3 unconfirmed leads:
 *   #5315 Rose City Electric Co  (rosecityelectricco.com) - CF7
 *   #5317 Phoenix                (phoenixpdx.com)         - JS form
 *   #5318 Portland Electrical    (portlandelectrical.com) - WP form
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const P = {
  fullName: 'Pamela Jameson', firstName: 'Pamela', lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com', phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const SUCCESS_SIGNALS = ['thank you','thanks for contacting','thanks for reaching out','message has been sent','we have received your','we will contact you','will get back to you','submission was successful','submitted successfully','in touch shortly','inquiry received','form received','successfully submitted','your message was sent','we will be in touch','sent successfully','request received','message sent','your message has been'];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt   = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt   = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function save(id, status, note) {
  const cur = getStmt.get(id);
  const merged = cur?.notes ? cur.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(merged, status, id);
    logStmt.run(id, status === 'contacted' ? 'sent' : 'bounced', note);
  })();
  console.log(`  💾 Saved #${id}: ${status} — ${note}`);
}

async function fillForm(page) {
  await page.evaluate((p) => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
    for (const el of inputs) {
      const type = (el.getAttribute('type') || el.tagName).toLowerCase();
      if (['file','hidden','submit','button','reset','checkbox','radio'].includes(type)) continue;
      // Skip honeypot
      const name = (el.getAttribute('name') || '').toLowerCase();
      const id   = (el.getAttribute('id') || '').toLowerCase();
      if (el.closest('.gform_validation_container') || el.closest('.wpforms-field-hp') ||
          name.includes('gotcha') || name.includes('honeypot') ||
          (el.offsetWidth === 0 && el.offsetHeight === 0)) continue;

      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      const fieldLabel  = (() => {
        const fc = el.closest('.gfield,.form-group,.field,.elementor-field-group,.wpforms-field,[class*="field"]');
        return (fc?.querySelector('label')?.innerText || '').toLowerCase();
      })();
      const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
      const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
      const combined  = `${name} ${id} ${placeholder} ${labelText} ${fieldLabel} ${ariaLabel}`;

      const set = (v) => {
        el.value = v;
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur',   { bubbles: true }));
      };

      if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description')) {
        set(p.message);
      } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
        set(p.email);
      } else if (type === 'tel' || combined.includes('phone') || combined.includes('tel') || combined.includes('mobile')) {
        set(p.phone);
      } else if (combined.includes('first') || combined.includes('fname')) {
        set(p.firstName);
      } else if (combined.includes('last') || combined.includes('lname')) {
        set(p.lastName);
      } else if (combined.includes('name') && !combined.includes('company')) {
        set(p.fullName);
      } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
        set(p.company);
      } else if (combined.includes('subject') || combined.includes('topic')) {
        set(p.subject);
      } else if (el.tagName.toLowerCase() === 'select' && el.options.length > 1) {
        el.selectedIndex = 1;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, P);
}

function checkSuccess(page, signals) {
  return page.evaluate((signals) => {
    const body = (document.body?.innerText || '').toLowerCase();
    // Check specific success containers
    const containers = document.querySelectorAll(
      '.wpcf7-response-output,.wpcf7-mail-sent-ok,.gform_confirmation_message,' +
      '.elementor-message-success,.form-submission-message,.sqs-form-submitted,' +
      '.alert-success,.success-message,[role="alert"],.submitted-message'
    );
    for (const c of containers) {
      const t = (c.innerText || '').toLowerCase();
      for (const s of signals) if (t.includes(s)) return { ok: true, phrase: `[${c.className}]: "${t.trim().substring(0, 120)}"` };
    }
    for (const s of signals) if (body.includes(s)) return { ok: true, phrase: s };
    const url = window.location.href;
    if (url.includes('thank') || url.includes('success') || url.includes('confirm')) return { ok: true, phrase: 'URL: ' + url };
    return { ok: false };
  }, signals);
}

// ──────────────────────────────────────────────────────────────────
// Lead #5315 — Rose City Electric (CF7 form on homepage)
// ──────────────────────────────────────────────────────────────────
async function doRoseCity(browser) {
  const id = 5315;
  console.log('\n🔵 [#5315] Rose City Electric — CF7 retry');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://rosecityelectricco.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    await fillForm(page);
    const initialUrl = page.url();
    // Submit via CF7 form
    await page.evaluate(() => {
      const form = document.querySelector('form[action*="wpcf7"]');
      if (form) {
        const btn = form.querySelector('button[type=submit], input[type=submit]');
        if (btn) btn.click();
        else form.requestSubmit ? form.requestSubmit() : form.submit();
      }
    });
    await new Promise(r => setTimeout(r, 5000));

    const v = await checkSuccess(page, SUCCESS_SIGNALS);
    if (v.ok) {
      console.log(`  ✅ Confirmed: ${v.phrase}`);
      save(id, 'contacted', `Contact form: https://rosecityelectricco.com/ (CF7 retry; confirmed: ${v.phrase})`);
    } else {
      // Check CF7 AJAX response text
      const cf7Text = await page.evaluate(() => {
        const r = document.querySelector('.wpcf7-response-output');
        return r ? r.innerText : '';
      });
      console.log(`  ⚠️ Not confirmed. CF7 output: "${cf7Text}"`);
      save(id, 'unable_to_reach', `Contact form: https://rosecityelectricco.com/ (CF7; no explicit confirmation — "${cf7Text}")`);
    }
  } catch(e) {
    console.log(`  ❌ Error: ${e.message}`);
    save(id, 'unable_to_reach', `Retry error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ──────────────────────────────────────────────────────────────────
// Lead #5317 — Phoenix (JS/REST form on /contact)
// ──────────────────────────────────────────────────────────────────
async function doPhoenix(browser) {
  const id = 5317;
  console.log('\n🔵 [#5317] Phoenix Electric — /contact retry');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });

  // Monitor network for form submission responses
  const networkResponses = [];
  page.on('response', async (resp) => {
    const url = resp.url();
    if (resp.request().method() !== 'GET' || url.includes('form') || url.includes('contact') || url.includes('mail')) {
      try {
        const ct = resp.headers()['content-type'] || '';
        if (ct.includes('json') || ct.includes('text')) {
          const body = await resp.text().catch(() => '');
          if (body.length < 2000) networkResponses.push({ url, status: resp.status(), body });
        }
      } catch(_) {}
    }
  });

  try {
    await page.goto('https://www.phoenixpdx.com/contact', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Log all form fields first
    const formFields = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        action: typeof f.action === 'string' ? f.action : String(f.action),
        method: f.method,
        fields: Array.from(f.querySelectorAll('input,textarea,select')).map(el => ({
          tag: el.tagName, type: el.type, name: el.name, id: el.id,
          placeholder: el.placeholder, class: el.className.substring(0,50)
        }))
      }));
    });
    console.log('  Form fields:', JSON.stringify(formFields, null, 2));

    await fillForm(page);

    // Try clicking submit button
    const initialUrl = page.url();
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[type=submit], input[type=submit], button'));
      const submitBtn = btns.find(b => {
        const t = (b.innerText || b.value || '').toLowerCase();
        return b.type === 'submit' || t.includes('submit') || t.includes('send') || t.includes('contact');
      });
      if (submitBtn) submitBtn.click();
      else {
        const f = document.querySelector('form');
        if (f) f.requestSubmit ? f.requestSubmit() : f.submit();
      }
    });

    await new Promise(r => setTimeout(r, 6000));
    const v = await checkSuccess(page, SUCCESS_SIGNALS);
    console.log(`  Network responses: ${JSON.stringify(networkResponses)}`);

    if (v.ok) {
      console.log(`  ✅ Confirmed: ${v.phrase}`);
      save(id, 'contacted', `Contact form: https://www.phoenixpdx.com/contact (retry confirmed: ${v.phrase})`);
    } else {
      const pageText = await page.evaluate(() => document.body?.innerText?.substring(0, 400) || '');
      console.log(`  ⚠️ No confirmation. Page text: ${pageText.substring(0,300)}`);
      save(id, 'unable_to_reach', `Contact form: https://www.phoenixpdx.com/contact (retry; no confirmation detected)`);
    }
  } catch(e) {
    console.log(`  ❌ Error: ${e.message}`);
    save(id, 'unable_to_reach', `Retry error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ──────────────────────────────────────────────────────────────────
// Lead #5318 — Portland Electrical Construction (/contact-us/)
// ──────────────────────────────────────────────────────────────────
async function doPortlandElectrical(browser) {
  const id = 5318;
  console.log('\n🔵 [#5318] Portland Electrical — /contact-us/ retry');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });

  try {
    await page.goto('https://portlandelectrical.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check for iframe captcha first
    const captchaCheck = await page.evaluate(() => ({
      recaptcha: !!document.querySelector('.g-recaptcha, [data-sitekey], iframe[src*="recaptcha"]'),
      hcaptcha: !!document.querySelector('iframe[src*="hcaptcha"]'),
      turnstile: !!document.querySelector('[class*="turnstile"], iframe[src*="turnstile"]'),
      formCount: document.querySelectorAll('form').length,
      errorMsg: (document.querySelector('.wpcf7-not-valid-tip, .wpcf7-response-output')?.innerText || ''),
      fields: Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]),textarea')).map(el => ({
        name: el.name, id: el.id, type: el.type, placeholder: el.placeholder
      }))
    }));
    console.log('  Captcha/form check:', JSON.stringify(captchaCheck, null, 2));

    await fillForm(page);
    const initialUrl = page.url();

    // Click submit
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[type=submit], input[type=submit], button'));
      const sb = btns.find(b => b.type === 'submit' || (b.innerText || '').toLowerCase().includes('send') || (b.innerText || '').toLowerCase().includes('submit'));
      if (sb) sb.click();
      else {
        const f = document.querySelector('form');
        if (f) f.requestSubmit ? f.requestSubmit() : f.submit();
      }
    });
    await new Promise(r => setTimeout(r, 6000));

    const v = await checkSuccess(page, SUCCESS_SIGNALS);
    if (v.ok) {
      console.log(`  ✅ Confirmed: ${v.phrase}`);
      save(id, 'contacted', `Contact form: https://portlandelectrical.com/contact-us/ (retry confirmed: ${v.phrase})`);
    } else {
      const errText = await page.evaluate(() => {
        const e = document.querySelector('.wpcf7-response-output, .wpcf7-not-valid-tip, [class*="error"], [class*="invalid"]');
        return e ? e.innerText : (document.body?.innerText?.substring(0, 300) || '');
      });
      console.log(`  ⚠️ No confirmation. Error text: "${errText.substring(0,200)}"`);
      save(id, 'unable_to_reach', `Contact form: https://portlandelectrical.com/contact-us/ (retry; "${errText.substring(0,100)}")`);
    }
  } catch(e) {
    console.log(`  ❌ Error: ${e.message}`);
    save(id, 'unable_to_reach', `Retry error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ──────────────────────────────────────────────────────────────────
// Update definitive unable_to_reach for confirmed dead-ends
// ──────────────────────────────────────────────────────────────────
function updateDefinitive() {
  const definitive = [
    { id: 5309, note: 'Contact form: https://www.westsideelectric.com/contact (blocked by reCAPTCHA on all form variants)' },
    { id: 5311, note: 'Site returns 403 Forbidden — site inaccessible' },
    { id: 5316, note: 'Site loaded but has no contact forms and no contact page links' },
    { id: 5319, note: 'Contact page (badgerelectricinc.com/contact.html) is static HTML — no web form' },
    { id: 5320, note: 'Contact page (kclengineering.com/contact) shows only office locations — no web form' },
  ];
  for (const d of definitive) {
    save(d.id, 'unable_to_reach', d.note);
    console.log(`  📌 Confirmed unable_to_reach for #${d.id}`);
  }
}

async function main() {
  console.log('\n🚀 Sub-Agent 3 Retry Run — leads 5315, 5317, 5318 + definitive closes\n');

  updateDefinitive();

  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--ignore-certificate-errors','--window-size=1280,800']
  });

  await doRoseCity(browser);
  await doPhoenix(browser);
  await doPortlandElectrical(browser);

  await browser.close();
  console.log('\n✅ Retry run complete.');
}

main().catch(console.error);
