/**
 * Targeted Wix form submitter for Sub5 Batch 18 unconfirmed leads
 * Uses keyboard + click approach for Wix forms
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson'
};

const SUCCESS_SIGNALS = ['thank you','thanks for contacting','thanks for reaching out','message has been sent','we have received your','we will contact you','will get back to you','submission was successful','submitted successfully','in touch shortly','inquiry received','form received','successfully submitted','your message was sent','we will be in touch','sent successfully','request received','quote requested'];

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

async function typeIntoField(page, selector, text) {
  try {
    const el = await page.$(selector);
    if (!el) return false;
    await el.click({ clickCount: 3 });
    await el.type(text, { delay: 30 });
    await page.keyboard.press('Tab');
    await new Promise(r => setTimeout(r, 200));
    return true;
  } catch (e) {
    return false;
  }
}

async function submitWixForm(browser, lead, url, firstInputSel, lastInputSel, emailSel, phoneSel, messageSel, submitLabel) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch (_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log(`\n[${lead.id}] === ${lead.company} ===`);

  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
  } catch (e) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch (e2) {}
  }

  await new Promise(r => setTimeout(r, 2000));

  // Fill using Puppeteer type (triggers React/Wix events properly)
  const fields = [
    { sel: firstInputSel, val: PROFILE.firstName },
    { sel: lastInputSel, val: PROFILE.lastName },
    { sel: emailSel, val: PROFILE.email },
    { sel: phoneSel, val: PROFILE.phone },
    { sel: messageSel, val: PROFILE.message },
  ];

  for (const f of fields) {
    if (f.sel) {
      await typeIntoField(page, f.sel, f.val);
    }
  }

  // Also try filling name/company via page.evaluate as fallback
  await page.evaluate((p) => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea'));
    for (const el of inputs) {
      const name = (el.getAttribute('name') || '').toLowerCase();
      const id = (el.getAttribute('id') || '').toLowerCase();
      const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
      const combined = `${name} ${id} ${placeholder}`;
      
      const setVal = (v) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                                       Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
        if (nativeInputValueSetter && nativeInputValueSetter.set) {
          nativeInputValueSetter.set.call(el, v);
        } else {
          el.value = v;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };
      
      if (el.value) continue; // Already filled via typeIntoField
      
      if (combined.includes('job') || combined.includes('title')) setVal('Procurement Manager');
      else if (combined.includes('company') || combined.includes('business')) setVal(p.company);
      else if (combined.includes('subject') || combined.includes('topic')) setVal(p.subject);
      else if (combined.includes('address') && !combined.includes('email')) setVal('100 Main St, Chicago IL 60601');
      else if (combined.includes('first') || combined.includes('fname')) setVal(p.firstName);
      else if (combined.includes('last') || combined.includes('lname')) setVal(p.lastName);
    }
  }, PROFILE);

  await new Promise(r => setTimeout(r, 1000));

  const initUrl = page.url();

  // Click submit button
  try {
    await page.evaluate((label) => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a.button, [data-testid*="submit"], [aria-label*="submit"], [aria-label*="send"]'));
      const keywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message', label];
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || btn.getAttribute('aria-label') || '').toLowerCase().trim();
        const type = (btn.getAttribute('type') || '').toLowerCase();
        if (type === 'submit' || keywords.some(k => k && text.includes(k.toLowerCase()))) {
          btn.click();
          return;
        }
      }
      // fallback
      const form = document.querySelector('form');
      if (form && typeof form.requestSubmit === 'function') form.requestSubmit();
      else if (form) form.submit();
    }, submitLabel || '');
  } catch (e) {}

  await new Promise(r => setTimeout(r, 5000));

  // Check for success
  let success = false;
  let phrase = '';
  try {
    const result = await page.evaluate((signals, initUrl) => {
      const body = (document.body?.innerText || '').toLowerCase();
      const currentUrl = window.location.href;
      const urlChanged = currentUrl !== initUrl && !currentUrl.includes('#');

      // Check specific success containers
      const containers = document.querySelectorAll('[class*="success"], [class*="confirm"], [class*="thank"], [role="alert"], [data-testid*="success"], .wixui-form__success-message');
      for (const c of containers) {
        const txt = (c.innerText || '').toLowerCase();
        for (const s of signals) {
          if (txt.includes(s)) return { success: true, phrase: `DOM[${c.tagName}.${c.className?.substring(0,40)}]: "${txt.substring(0,100)}"` };
        }
      }
      for (const s of signals) {
        if (body.includes(s)) return { success: true, phrase: s };
      }
      if (urlChanged && (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('confirm'))) {
        return { success: true, phrase: `URL redirect: ${currentUrl}` };
      }
      return { success: false, phrase: '', bodySnippet: body.substring(0, 300) };
    }, SUCCESS_SIGNALS, initUrl);

    success = result.success;
    phrase = result.phrase;
    if (!success) console.log(`    Body snippet: ${result.bodySnippet}`);
  } catch (e) {
    const curUrl = page.url();
    if (curUrl !== initUrl && (curUrl.includes('thank') || curUrl.includes('success'))) {
      success = true;
      phrase = `URL redirect: ${curUrl}`;
    }
  }

  if (success) {
    console.log(`    ✅ CONFIRMED: ${phrase}`);
    saveLeadResult(lead.id, 'contacted', `Contact form: ${url} (Autofilled & verified: ${phrase})`);
  } else {
    console.log(`    ⚠️ Unconfirmed / submission may be silent`);
    saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${url} (Autofilled via Wix-targeted; no confirmation detected)`);
  }

  await page.close();
  return success;
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,900']
  });

  // #5135 Authentic Machining — only has email signup, no real contact form
  console.log('\n[5135] Authentic Machining Inc — updating to unable_to_reach (only RSS/email signup form found)');
  saveLeadResult(5135, 'unable_to_reach', 'Contact form: https://authenticmachining.com/ (Only RSS email subscription form found, no real contact form)');

  // #5129 Advanced Tech Machining (atmachining.us) — Wix form
  await submitWixForm(browser,
    { id: 5129, company: 'Advanced Tech Machining' },
    'https://www.atmachining.us/contact',
    '[name="your-name"]', null,
    '[name="email"]', null,
    '#textarea_comp-m8xfpjl13',
    null
  );

  // #5130 AJ Solutions Machining — Wix form (first form)
  await submitWixForm(browser,
    { id: 5130, company: 'AJ Solutions Machining' },
    'https://www.ajsolutionsmachining.com/',
    '[name="first-name"]', '[name="last-name"]',
    '[name="email"]', '[name="phone"]',
    '#textarea_comp-kl7l4lpp',
    'submit'
  );

  // #5131 HD Machining LLC — generic form with _app_id
  await submitWixForm(browser,
    { id: 5131, company: 'HD MACHINING LLC' },
    'https://hdmachinings.com/',
    '#input98145', '#input98146',
    null, null,
    null,
    'submit'
  );

  // #5132 J&R Machining — Wix form
  await submitWixForm(browser,
    { id: 5132, company: 'J&R Machining' },
    'https://www.jrmachining.com/contact',
    '[name="first-name"]', '[name="last-name"]',
    '[name="email"]', '[name="phone"]',
    '#textarea_comp-kpo3xcjr1',
    'submit'
  );

  // #5138 Alta Design & Manufacturing — Wix form
  await submitWixForm(browser,
    { id: 5138, company: 'Alta Design & Manufacturing Inc' },
    'https://www.alta-eng.com/contact',
    '[name="name"]', null,
    '[name="email"]', '[name="phone"]',
    '#textarea_comp-kk4l47381',
    'submit'
  );

  await browser.close();
  console.log('\n=== All targeted submissions complete ===');
}

run().catch(console.error);
