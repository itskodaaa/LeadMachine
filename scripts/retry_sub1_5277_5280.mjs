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

const SUCCESS_SIGNALS = [
  'thank you','thanks for contacting','thanks for reaching out','message has been sent',
  'we have received your','we will contact you','will get back to you','submission was successful',
  'submitted successfully','in touch shortly','inquiry received','form received',
  'successfully submitted','your message was sent','we will be in touch','sent successfully',
  'request received','quote requested','message sent','your message has been'
];

async function tryEpicEngineeringNW(browser) {
  console.log('\n========== #5277 Epic Engineering Northwest (Wix) ==========');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.epicengineeringnw.com/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('  Loaded homepage. Waiting for form...');
    await new Promise(r => setTimeout(r, 3000));

    // Check for form
    const formData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map(f => ({
        inputs: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
          type: i.type || i.tagName, name: i.name, placeholder: i.placeholder
        }))
      }));
    });
    console.log('  Forms:', JSON.stringify(formData));

    // Fill fields
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]), textarea'));
      for (const el of inputs) {
        const ph = (el.placeholder || '').toLowerCase();
        const nm = (el.name || '').toLowerCase();
        const tp = (el.type || '').toLowerCase();
        if (tp === 'email' || ph.includes('email') || nm.includes('email')) {
          el.value = p.email;
        } else if (el.tagName.toLowerCase() === 'textarea' || ph.includes('message') || nm.includes('message')) {
          el.value = p.message;
        } else if (ph.includes('name') || nm.includes('name')) {
          el.value = p.fullName;
        } else if (ph.includes('phone') || tp === 'tel') {
          el.value = p.phone;
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    console.log('  Fields filled. Submitting...');
    const preUrl = page.url();

    // Use Promise.race to catch both navigation and timeout
    let navOccurred = false;
    try {
      await Promise.race([
        page.evaluate(() => {
          const btn = document.querySelector('button[type="submit"], input[type="submit"]');
          if (btn) { btn.click(); return; }
          const form = document.querySelector('form');
          if (form) { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit(); }
        }),
        new Promise(r => setTimeout(r, 500))
      ]);
      // Wait for potential navigation or AJAX response
      await Promise.race([
        page.waitForNavigation({ timeout: 8000 }).then(() => { navOccurred = true; }),
        new Promise(r => setTimeout(r, 8000))
      ]);
    } catch(e) {
      navOccurred = true; // navigation destroyed context
      console.log('  Navigation occurred during submit (context destroyed)');
    }

    await new Promise(r => setTimeout(r, 3000));
    let postUrl, postBody;
    try {
      postUrl = page.url();
      postBody = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    } catch(e) {
      postUrl = 'navigation occurred';
      postBody = '';
    }

    console.log(`  Post-submit URL: ${postUrl}`);
    const found = SUCCESS_SIGNALS.find(s => postBody.includes(s));
    console.log(`  Success signal: ${found || 'NONE'}`);
    console.log(`  Body: ${postBody.substring(0, 300)}`);

    if (found || navOccurred) {
      const note = found
        ? `Contact form: https://www.epicengineeringnw.com/ (Wix form filled & submitted; confirmed: "${found}")`
        : `Contact form: https://www.epicengineeringnw.com/ (Wix form filled & submitted; navigation occurred - likely delivered, unconfirmable)`;
      const status = found ? 'contacted' : 'unable_to_reach';
      saveLeadResult(5277, status, note);
      console.log(`  -> Saved as: ${status}`);
    }

  } catch(e) {
    console.log('  Error:', e.message);
  }
  await page.close().catch(_=>{});
}

async function tryTandMDesign(browser) {
  console.log('\n========== #5280 T&M Design Inc. (Elementor/WordPress) ==========');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_){} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.tandmdesign.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    console.log('  Loaded contact page. URL:', page.url());
    await new Promise(r => setTimeout(r, 2000));

    // Inspect form more carefully
    const formDetail = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return {
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
          type: i.type || i.tagName,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder,
          value: i.value
        })),
        hasElementor: !!document.querySelector('.elementor-form, [data-form_id]'),
        formId: form.querySelector('[name="form_id"]')?.value,
        postId: form.querySelector('[name="post_id"]')?.value
      };
    });
    console.log('  Form detail:', JSON.stringify(formDetail, null, 2));

    // Click each field individually with keyboard events (Elementor forms need this)
    await page.click('#form-field-name');
    await page.type('#form-field-name', PROFILE.fullName, { delay: 50 });
    await page.click('#form-field-email');
    await page.type('#form-field-email', PROFILE.email, { delay: 50 });
    await page.click('#form-field-field_cc9f897');
    await page.type('#form-field-field_cc9f897', PROFILE.subject, { delay: 50 });
    await page.click('#form-field-message');
    await page.type('#form-field-message', PROFILE.message, { delay: 20 });

    console.log('  Fields typed. Clicking submit...');

    // Intercept AJAX response
    let ajaxResponse = null;
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('admin-ajax') || url.includes('contact-us') || url.includes('wp-json')) {
        try {
          const text = await response.text();
          if (text.length < 5000) {
            ajaxResponse = { url, status: response.status(), body: text };
            console.log(`  AJAX response: ${url} [${response.status()}] -> ${text.substring(0, 200)}`);
          }
        } catch(_) {}
      }
    });

    const preUrl = page.url();
    // Click submit button
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], .elementor-button[type="submit"]');
      if (btn) btn.click();
      else {
        const form = document.querySelector('form');
        if (form) { if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit(); }
      }
    });

    await new Promise(r => setTimeout(r, 6000));

    const postUrl = page.url();
    const postBody = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
    console.log(`  Post-submit URL: ${postUrl} (changed: ${preUrl !== postUrl})`);
    const found = SUCCESS_SIGNALS.find(s => postBody.includes(s));
    console.log(`  Success signal: ${found || 'NONE'}`);
    console.log(`  Body: ${postBody.substring(0, 500)}`);

    // Check for Elementor success message
    const elementorSuccess = await page.evaluate(() => {
      const msg = document.querySelector('.elementor-message-success, .elementor-message, [data-testid="form-success"], .wpcf7-response-output');
      return msg ? msg.innerText.trim() : null;
    });
    console.log('  Elementor success element:', elementorSuccess);

    const isSuccess = found || (ajaxResponse && (ajaxResponse.body.includes('success') || ajaxResponse.body.includes('thank'))) || elementorSuccess;
    if (isSuccess) {
      const phrase = found || elementorSuccess || (ajaxResponse ? `AJAX success: ${ajaxResponse.body.substring(0,80)}` : '');
      saveLeadResult(5280, 'contacted', `Contact form: https://www.tandmdesign.com/contact-us/ (Elementor form filled & submitted; confirmed: "${phrase}")`);
      console.log('  -> Saved as: contacted');
    } else {
      saveLeadResult(5280, 'unable_to_reach', `Contact form: https://www.tandmdesign.com/contact-us/ (Elementor form - no AJAX confirmation detected; may require server-side verification)`);
      console.log('  -> Saved as: unable_to_reach');
    }
  } catch(e) {
    console.log('  Error:', e.message);
    saveLeadResult(5280, 'unable_to_reach', `Contact form: https://www.tandmdesign.com/contact-us/ (Elementor form error: ${e.message.split('\n')[0]})`);
  }
  await page.close().catch(_=>{});
}

// Update refined notes for 5276 and 5283
function updateRefinedNotes() {
  console.log('\n--- Updating refined DB notes for #5276 and #5283 ---');

  // 5276: reCAPTCHA confirmed by deep inspect
  const r5276 = getStmt.get(5276);
  const note5276 = 'Contact form: https://www.pccstructurals.com/contact-us/ (Autofilled; blocked by Google reCAPTCHA - form requires captcha completion)';
  updateStmt.run(note5276, 'unable_to_reach', 5276);
  logStmt.run(5276, 'bounced', note5276);
  console.log('  #5276 updated: reCAPTCHA block confirmed');

  // 5283: PHP server errors
  const note5283 = 'Contact form: https://kicengineering.com/contact.php (Form submitted but server returned PHP errors - undefined index: name/email/comment - broken server-side handler)';
  updateStmt.run(note5283, 'unable_to_reach', 5283);
  logStmt.run(5283, 'bounced', note5283);
  console.log('  #5283 updated: Broken PHP contact handler confirmed');
}

(async () => {
  updateRefinedNotes();

  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--ignore-certificate-errors']
  });

  await tryEpicEngineeringNW(browser);
  await tryTandMDesign(browser);

  await browser.close();
  console.log('\nRetry complete.');
})();
