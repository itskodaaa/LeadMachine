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
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

const SUCCESS_SIGNALS = [
  'thank you', 'thanks for contacting', 'thanks for reaching out',
  'message has been sent', 'we have received your', 'we will contact you',
  'will get back to you', 'submission was successful', 'submitted successfully',
  'in touch shortly', 'inquiry received', 'form received', 'successfully submitted',
  'your message was sent', 'we will be in touch', 'sent successfully',
  'request received', 'message sent', 'message received'
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT notes FROM leads WHERE id = ?');

function saveResult(id, status, note) {
  const current = getStmt.get(id);
  const parts = (current?.notes || '').split(' | ').filter(p => !p.includes('No explicit confirmation'));
  parts.push(note);
  const newNotes = parts.join(' | ');
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    logStmt.run(id, status === 'contacted' ? 'sent' : 'bounced', note);
  })();
}

async function typeInField(page, selector, text) {
  try {
    await page.click(selector, { clickCount: 3 });
    await page.keyboard.type(text, { delay: 30 });
    await page.evaluate(sel => {
      const el = document.querySelector(sel);
      if (el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, selector);
  } catch(e) {}
}

// ─── Lead #3724: Fabrication Associates Inc (Wix) ───────────────────────────
async function submit3724(browser) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('\n=== #3724 Fabrication Associates Inc (fai6.com) ===');
  try {
    await page.goto('https://www.fai6.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Wix form fields
    await typeInField(page, '#input_comp-kf6sic29', PROFILE.fullName);
    await typeInField(page, '#input_comp-kf6sic2j', PROFILE.email);
    await typeInField(page, '#input_comp-kf6sic2s', PROFILE.phone);
    await typeInField(page, '#input_comp-kf6sic32', '100 Main St, Chicago, IL 60601');
    await typeInField(page, '#input_comp-kf6sic3c', PROFILE.subject);
    await typeInField(page, '#textarea_comp-kf6sic3m', PROFILE.message);
    console.log('  Fields filled.');
    await new Promise(r => setTimeout(r, 1000));

    const initialUrl = page.url();

    // Click Send button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const send = btns.find(b => (b.innerText || '').toLowerCase().trim() === 'send');
      if (send) send.click();
      else {
        const form = document.querySelector('form');
        if (form) { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit(); }
      }
    });
    console.log('  Submit clicked.');
    await new Promise(r => setTimeout(r, 5000));

    // Check confirmation
    const currentUrl = page.url();
    const bodyText = (await page.evaluate(() => document.body?.innerText || '')).toLowerCase();
    const matched = SUCCESS_SIGNALS.find(s => bodyText.includes(s));
    const urlChanged = currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success'));

    if (matched || urlChanged) {
      const phrase = matched ? `"${matched}"` : `Redirect to ${currentUrl}`;
      console.log(`  ✅ CONFIRMED: ${phrase}`);
      saveResult(3724, 'contacted', `Contact form: https://www.fai6.com/contact-us (Autofilled & verified: ${phrase})`);
    } else {
      // Check for Wix-specific success element
      const wixSuccess = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="form-submitted"], .submitted-message, .success-message, [class*="success"]');
        return el ? el.innerText : null;
      });
      if (wixSuccess) {
        console.log(`  ✅ CONFIRMED via element: "${wixSuccess}"`);
        saveResult(3724, 'contacted', `Contact form: https://www.fai6.com/contact-us (Autofilled & verified: "${wixSuccess.substring(0,80)}")`);
      } else {
        console.log(`  ⚠️ No confirmation detected. Body snippet: ${bodyText.substring(0, 200)}`);
        saveResult(3724, 'unable_to_reach', 'Contact form: https://www.fai6.com/contact-us (Wix form submitted; no success confirmation detected)');
      }
    }
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(3724, 'unable_to_reach', `Contact form: https://www.fai6.com/contact-us (Error: ${e.message.split('\n')[0]})`);
  } finally {
    await page.close();
  }
}

// ─── Lead #3727: Carrington Engineering Sales (Wix) ─────────────────────────
async function submit3727(browser) {
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('\n=== #3727 Carrington Engineering Sales (carringtoninc.com) ===');
  try {
    await page.goto('https://www.carringtoninc.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Navigate to contact section if needed
    const contactLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const m = links.find(a => (a.innerText || '').toLowerCase().includes('contact') && !a.href.includes('mailto'));
      return m ? m.href : null;
    });
    if (contactLink && !contactLink.includes('carringtoninc.com/#') && contactLink !== page.url()) {
      await page.goto(contactLink, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, 2000));
    }

    const contactUrl = page.url();
    console.log(`  Contact URL: ${contactUrl}`);

    // Wix field IDs from deep inspect
    const fields = [
      { id: 'form-field-input-ac4d9fe5-3335-4d28-4313-25c36b8ca49f-comp-mn50p37w-', value: PROFILE.firstName },
      { id: 'form-field-input-37876b7a-1b3f-4762-0d59-4b46267a96fb-comp-mn50p37w-', value: PROFILE.lastName },
      { id: 'form-field-input-72c31e8a-91f8-49e5-1be7-aec9a0dc6c88-comp-mn50p37w-', value: PROFILE.email },
      { id: 'form-field-input-b470ea4c-b8ac-4839-17a6-92358e49dff3-comp-mn50p37w-', value: PROFILE.phone },
      { id: 'form-field-input-956adee8-7a51-4935-065d-4b4e2bb370e3-comp-mn50p37w-', value: PROFILE.company },
      { id: 'form-field-input-d060dea3-e849-497b-3bb9-9d64edc332eb-comp-mn50p37w-', value: PROFILE.subject },
      { id: 'form-field-input-fb1e289d-6a1f-49e5-b714-dc43fe7240e3-comp-mn50p37w-', value: PROFILE.message },
    ];

    for (const f of fields) {
      await typeInField(page, `#${f.id}`, f.value);
    }
    console.log('  Fields filled.');
    await new Promise(r => setTimeout(r, 1000));

    const initialUrl = page.url();

    // Click Send button (not Upload File)
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const send = btns.find(b => (b.innerText || '').toLowerCase().trim() === 'send');
      if (send) send.click();
      else {
        const form = document.querySelector('form');
        if (form) { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit(); }
      }
    });
    console.log('  Submit clicked.');
    await new Promise(r => setTimeout(r, 5000));

    const currentUrl = page.url();
    const bodyText = (await page.evaluate(() => document.body?.innerText || '')).toLowerCase();
    const matched = SUCCESS_SIGNALS.find(s => bodyText.includes(s));
    const urlChanged = currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success'));

    if (matched || urlChanged) {
      const phrase = matched ? `"${matched}"` : `Redirect to ${currentUrl}`;
      console.log(`  ✅ CONFIRMED: ${phrase}`);
      saveResult(3727, 'contacted', `Contact form: ${contactUrl} (Autofilled & verified: ${phrase})`);
    } else {
      const wixSuccess = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="form-submitted"], .submitted-message, .success-message, [class*="success"]');
        return el ? el.innerText : null;
      });
      if (wixSuccess) {
        console.log(`  ✅ CONFIRMED via element: "${wixSuccess}"`);
        saveResult(3727, 'contacted', `Contact form: ${contactUrl} (Autofilled & verified: "${wixSuccess.substring(0,80)}")`);
      } else {
        console.log(`  ⚠️ No confirmation detected. Body snippet: ${bodyText.substring(0, 200)}`);
        saveResult(3727, 'unable_to_reach', `Contact form: ${contactUrl} (Wix form submitted; no success confirmation detected)`);
      }
    }
  } catch(e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(3727, 'unable_to_reach', `Contact form: https://www.carringtoninc.com/ (Error: ${e.message.split('\n')[0]})`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,900']
  });

  await submit3724(browser);
  await submit3727(browser);

  await browser.close();
  console.log('\n✅ Targeted retry complete.');
})();
