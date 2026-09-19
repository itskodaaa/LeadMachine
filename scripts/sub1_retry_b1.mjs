/**
 * Sub-Agent 1 — Batch 1 Targeted Retry
 * Sites: #5080 JL Precision (AJAX form), #5081 Uni Precision (Wix),
 *        #5086 Accura Precision (Squarespace), #5087 MMX Machining (g7 WP form)
 *        #5089 Master Precision (WP CF7 + image CAPTCHA -> mark blocked)
 *        #5083 Precision Polymer Eng (all forms have CAPTCHA -> skip)
 *        #5085 JF Precision (image CAPTCHA -> skip)
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
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  title: 'Procurement Manager',
  quantity: '50',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveResult(id, status, note) {
  const cur = getStmt.get(id);
  const newNotes = cur?.notes ? cur.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    logStmt.run(id, status === 'contacted' ? 'sent' : 'bounced', note);
  })();
  console.log(`[DB] #${id} → ${status}: ${note}`);
}

async function typeInto(page, selector, value) {
  try {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.type(value, { delay: 30 });
  } catch (_) {}
}

// ─── #5080 JL Precision ────────────────────────────────────────────────────
async function submit5080(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  console.log('\n[5080] Navigating to JL Precision contact page...');
  try {
    await page.goto('https://www.jlprecision.com/contact.html', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill first name
    await typeInto(page, 'input[name="_u109612560739676018[first]"]', P.firstName);
    await typeInto(page, 'input[name="_u109612560739676018[last]"]', P.lastName);
    await typeInto(page, 'input[name="_u272858966794417205"]', P.email);
    await typeInto(page, 'textarea[name="_u543973125333538292"]', P.message);

    console.log('[5080] Fields filled. Submitting...');
    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"], button');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 5000));

    const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    const url = page.url();
    console.log('[5080] Post-submit URL:', url);
    console.log('[5080] Body snippet:', body.substring(0, 300));

    const successKeywords = ['thank you', 'thanks', 'received', 'sent', 'success', 'will contact', 'submitted'];
    const confirmed = successKeywords.some(k => body.includes(k));
    if (confirmed) {
      const phrase = successKeywords.find(k => body.includes(k));
      saveResult(5080, 'contacted', `Contact form: https://www.jlprecision.com/contact.html (Autofilled & verified: "${phrase}")`);
      console.log('[5080] ✅ CONFIRMED');
    } else {
      saveResult(5080, 'unable_to_reach', `Contact form: https://www.jlprecision.com/contact.html (Form filled & submitted via AJAX; no explicit confirmation text detected)`);
      console.log('[5080] ⚠️ Unconfirmed - no success signal');
    }
  } catch(e) {
    console.log('[5080] Error:', e.message);
    saveResult(5080, 'unable_to_reach', `Error during retry: ${e.message}`);
  }
  await page.close();
}

// ─── #5081 Uni Precision (Wix) ─────────────────────────────────────────────
async function submit5081(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  console.log('\n[5081] Navigating to Uni Precision contact page...');
  try {
    await page.goto('https://www.uniprecision.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Wix form fields - fill by ID
    await typeInto(page, '#input_comp-k6l5v54r1', P.fullName);
    await new Promise(r => setTimeout(r, 300));
    await typeInto(page, '#input_comp-k6l5v558', P.email);
    await new Promise(r => setTimeout(r, 300));
    await typeInto(page, '#input_comp-k6l5v55p', P.company);
    await new Promise(r => setTimeout(r, 300));
    await typeInto(page, '#textarea_comp-k6l5v568', P.message);
    await new Promise(r => setTimeout(r, 300));

    // Trigger React events
    await page.evaluate((p) => {
      const inputs = [
        { id: 'input_comp-k6l5v54r1', val: p.fullName },
        { id: 'input_comp-k6l5v558', val: p.email },
        { id: 'input_comp-k6l5v55p', val: p.company },
        { id: 'textarea_comp-k6l5v568', val: p.message }
      ];
      for (const { id, val } of inputs) {
        const el = document.getElementById(id);
        if (el) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') ||
                               Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value');
          if (nativeSetter) nativeSetter.set.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }, P);

    console.log('[5081] Fields filled. Clicking submit...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sub = btns.find(b => (b.innerText || '').toLowerCase().includes('submit'));
      if (sub) sub.click();
      else {
        const form = document.querySelector('form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      }
    });
    await new Promise(r => setTimeout(r, 6000));

    const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    console.log('[5081] Post-submit body snippet:', body.substring(0, 400));

    const successKeywords = ['thank you', 'thanks', 'received', 'sent', 'success', 'submitted', 'get back'];
    const confirmed = successKeywords.some(k => body.includes(k));
    if (confirmed) {
      const phrase = successKeywords.find(k => body.includes(k));
      saveResult(5081, 'contacted', `Contact form: https://www.uniprecision.com/contact (Autofilled & verified: "${phrase}")`);
      console.log('[5081] ✅ CONFIRMED');
    } else {
      saveResult(5081, 'unable_to_reach', `Contact form: https://www.uniprecision.com/contact (Wix form filled & submitted; no confirmation detected)`);
      console.log('[5081] ⚠️ Unconfirmed');
    }
  } catch(e) {
    console.log('[5081] Error:', e.message);
    saveResult(5081, 'unable_to_reach', `Error during retry: ${e.message}`);
  }
  await page.close();
}

// ─── #5086 Accura Precision (Squarespace) ──────────────────────────────────
async function submit5086(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  console.log('\n[5086] Navigating to Accura Precision quote page...');
  try {
    await page.goto('https://www.accuraprecisioninc.com/schedule-appointment', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Squarespace form - fill by ID
    await typeInto(page, '#name-yui_3_17_2_1_1468861630898_9352-fname-field', P.firstName);
    await typeInto(page, '#name-yui_3_17_2_1_1468861630898_9352-lname-field', P.lastName);
    await typeInto(page, '#text-yui_3_17_2_1_1468861630898_10119-field', P.company);
    await typeInto(page, '#text-yui_3_17_2_1_1468861630898_22552-field', P.title);
    await typeInto(page, '#email-yui_3_17_2_1_1468861630898_9691-field', P.email);
    await typeInto(page, '#phone-yui_3_17_2_1_1505932090853_135084-input-field', P.phone);
    await typeInto(page, '#textarea-yui_3_17_2_1_1468861630898_10547-field', P.message);
    await typeInto(page, '#number-yui_3_17_2_1_1505932090853_140181-field', P.quantity);

    // Check the first checkbox (Prototype)
    try {
      const checkboxes = await page.$$('input[type="checkbox"]');
      if (checkboxes.length > 0) await checkboxes[0].click();
    } catch(_) {}

    // Select first radio (Standard lead time)
    try {
      const radios = await page.$$('input[type="radio"]');
      if (radios.length > 0) await radios[0].click();
    } catch(_) {}

    console.log('[5086] Fields filled. Submitting...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 7000));

    const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    const url = page.url();
    console.log('[5086] Post-submit URL:', url);
    console.log('[5086] Body snippet:', body.substring(0, 400));

    const successKeywords = ['thank you', 'thanks', 'received', 'sent', 'success', 'submitted'];
    const confirmed = successKeywords.some(k => body.includes(k));
    if (confirmed) {
      const phrase = successKeywords.find(k => body.includes(k));
      saveResult(5086, 'contacted', `Contact form: https://www.accuraprecisioninc.com/schedule-appointment (Autofilled & verified: "${phrase}")`);
      console.log('[5086] ✅ CONFIRMED');
    } else {
      saveResult(5086, 'unable_to_reach', `Contact form: https://www.accuraprecisioninc.com/schedule-appointment (Squarespace form filled & submitted; no confirmation detected)`);
      console.log('[5086] ⚠️ Unconfirmed');
    }
  } catch(e) {
    console.log('[5086] Error:', e.message);
    saveResult(5086, 'unable_to_reach', `Error during retry: ${e.message}`);
  }
  await page.close();
}

// ─── #5087 MMX Machining (WordPress g7 form) ───────────────────────────────
async function submit5087(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  console.log('\n[5087] Navigating to MMX Machining contact page...');
  try {
    await page.goto('https://mmxmachining.com/?page_id=7', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    await typeInto(page, '#g7-name', P.fullName);
    await typeInto(page, '#g7-email', P.email);
    await typeInto(page, '#contact-form-comment-g7-message', P.message);

    // Dispatch events
    await page.evaluate((p) => {
      [
        ['#g7-name', p.fullName],
        ['#g7-email', p.email],
        ['#contact-form-comment-g7-message', p.message]
      ].forEach(([sel, val]) => {
        const el = document.querySelector(sel);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, P);

    console.log('[5087] Fields filled. Submitting...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"], button');
      if (btn) btn.click();
      else {
        const form = document.querySelector('form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      }
    });
    await new Promise(r => setTimeout(r, 6000));

    const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    const url = page.url();
    console.log('[5087] Post-submit URL:', url);
    console.log('[5087] Body snippet:', body.substring(0, 500));

    const successKeywords = ['thank you', 'thanks', 'received', 'sent', 'success', 'submitted', 'message sent', 'will be in touch'];
    const confirmed = successKeywords.some(k => body.includes(k));
    if (confirmed) {
      const phrase = successKeywords.find(k => body.includes(k));
      saveResult(5087, 'contacted', `Contact form: https://mmxmachining.com/?page_id=7 (Autofilled & verified: "${phrase}")`);
      console.log('[5087] ✅ CONFIRMED');
    } else {
      saveResult(5087, 'unable_to_reach', `Contact form: https://mmxmachining.com/?page_id=7 (WordPress g7 form filled & submitted; no confirmation detected)`);
      console.log('[5087] ⚠️ Unconfirmed');
    }
  } catch(e) {
    console.log('[5087] Error:', e.message);
    saveResult(5087, 'unable_to_reach', `Error during retry: ${e.message}`);
  }
  await page.close();
}

// ─── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  // Immediately mark the CAPTCHA-blocked sites
  saveResult(5083, 'unable_to_reach', 'Contact form: https://www.prepol.com/contact/ (Form found but blocked by CAPTCHA on all available forms)');
  saveResult(5085, 'unable_to_reach', 'Contact form: https://www.jfprecision.com/project-request-form/ (WP CF7 form with image CAPTCHA challenge — cannot bypass)');
  saveResult(5089, 'unable_to_reach', 'Contact form: https://master-precision.com/contact/ (WP CF7 with image CAPTCHA field "captcha-email" — cannot bypass)');
  console.log('[DB] ⚠️ #5083, #5085, #5089 → unable_to_reach (CAPTCHA-blocked)');

  // Also update #5082 — only mailto
  saveResult(5082, 'unable_to_reach', 'Contact page: https://www.rapidprecision.us/contact — no web form; only mailto/phone contacts available');
  console.log('[DB] ⚠️ #5082 → unable_to_reach (mailto only)');

  // Retry sites with real forms
  await submit5080(browser);
  await submit5081(browser);
  await submit5086(browser);
  await submit5087(browser);

  await browser.close();
  console.log('\n✅ Retry complete.');
}

main().catch(console.error);
