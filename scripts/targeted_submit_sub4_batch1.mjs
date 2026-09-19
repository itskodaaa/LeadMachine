import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const P = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

const SUCCESS_SIGNALS = [
  'thank you','thanks for contacting','thanks for reaching out','message has been sent',
  'we have received your','we will contact you','will get back to you','submission was successful',
  'submitted successfully','in touch shortly','inquiry received','form received',
  'successfully submitted','your message was sent','we will be in touch','sent successfully',
  'request received','quote requested','message received','contact us soon'
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveResult(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    logStmt.run(id, status === 'contacted' ? 'sent' : 'bounced', note);
  })();
  console.log(`  DB updated: #${id} => ${status}`);
}

async function typeInto(page, selector, value) {
  try {
    await page.click(selector, { clickCount: 3 });
    await page.type(selector, value, { delay: 30 });
    return true;
  } catch (e) {
    return false;
  }
}

async function checkSuccess(page, initialUrl) {
  const body = await page.evaluate(() => document.body?.innerText?.toLowerCase() || '');
  const currentUrl = page.url();
  for (const sig of SUCCESS_SIGNALS) {
    if (body.includes(sig)) return { ok: true, phrase: sig };
  }
  if (currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('confirm'))) {
    return { ok: true, phrase: 'Redirect: ' + currentUrl };
  }
  // Check special containers
  const containerCheck = await page.evaluate((sigs) => {
    const containers = document.querySelectorAll(
      '.wpcf7-response-output, .wpcf7-mail-sent-ok, .gform_confirmation_message, ' +
      '.elementor-message-success, [role="alert"], .alert-success, .success-message, ' +
      '.submitted-message, .hs-form-submitted, .wixui-form__message, .form-submission-message, ' +
      '.sqs-form-submitted, [data-testid="form-submitted"], .dmformsent, .dm-form-success'
    );
    for (const el of containers) {
      const txt = (el.innerText || '').toLowerCase();
      for (const sig of sigs) {
        if (txt.includes(sig)) return { ok: true, phrase: `[${el.className.substring(0,50)}]: ${txt.substring(0,100)}` };
      }
      if (txt.length > 5) return { ok: true, phrase: `[${el.className.substring(0,50)}]: ${txt.substring(0,100)}` };
    }
    return null;
  }, SUCCESS_SIGNALS);
  if (containerCheck) return containerCheck;
  return { ok: false };
}

// ===== #5322 Alameda Electric LLC (Wix) =====
async function submit5322(browser) {
  console.log('\n===== #5322 Alameda Electric LLC =====');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.alamedaelectricpdx.com/contact-1', { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const initialUrl = page.url();

    // Fill the Wix form (first form with full fields)
    await page.evaluate((p) => {
      const fill = (selector, value) => {
        const el = document.querySelector(selector);
        if (!el) return false;
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
          || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeInputValueSetter) nativeInputValueSetter.call(el, value);
        else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return true;
      };
      fill('#input_comp-kwfilmsm', p.firstName);        // first name
      fill('#input_comp-kwfilmsp1', p.lastName);         // last name
      fill('#input_comp-kwfilmss1', p.email);            // email
      fill('#input_comp-kwfilmsv', p.phone);             // phone
      fill('#input_comp-lh7yr7ud1', p.address);          // street address
      fill('#input_comp-lh7yr7um5', p.city);             // city
      fill('#input_comp-lh7yr7uo1', p.state);            // state
      fill('#input_comp-lh7yr7uq1', p.zip);              // zip
      // Textarea (message)
      const ta = document.querySelector('#textarea_comp-kwfilmt02') || document.querySelector('textarea');
      if (ta) {
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
        if (nativeSetter) nativeSetter.call(ta, p.message);
        else ta.value = p.message;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        ta.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));

    // Click submit
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await checkSuccess(page, initialUrl);
    if (result.ok) {
      console.log(`  ✅ CONFIRMED: "${result.phrase}"`);
      saveResult(5322, 'contacted', `Contact form: https://www.alamedaelectricpdx.com/contact-1 (Autofilled & verified: ${result.phrase})`);
    } else {
      // Check current page body for anything hopeful
      const bodySnip = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log(`  ⚠️ Unconfirmed. Page body snippet: ${bodySnip.substring(0, 200)}`);
      console.log(`  Current URL: ${page.url()}`);
      saveResult(5322, 'unable_to_reach', 'Contact form: https://www.alamedaelectricpdx.com/contact-1 (Wix form – submitted but no confirmation message detected)');
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(5322, 'unable_to_reach', `Error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ===== #5323 Lear Electric Co., Inc. (DM form on contact-us page) =====
async function submit5323(browser) {
  console.log('\n===== #5323 Lear Electric Co., Inc. =====');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.learelectric.com/contact-us', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const initialUrl = page.url();
    console.log(`  Loaded: ${initialUrl}`);

    // Inspect forms on contact-us page
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => ({
        index: i,
        id: f.id,
        className: f.className.substring(0, 80),
        action: f.action || f.getAttribute('action') || '(none)',
        fields: Array.from(f.querySelectorAll('input, textarea, select')).map(el => ({
          tag: el.tagName, type: el.type, name: el.name, id: el.id, placeholder: el.placeholder || ''
        }))
      }));
    });

    console.log(`  Found ${formInfo.length} form(s) on contact-us page:`);
    formInfo.forEach(f => {
      console.log(`    Form #${f.index}: id="${f.id}" action="${f.action}"`);
      f.fields.forEach(el => console.log(`      [${el.tag}] type="${el.type}" name="${el.name}" placeholder="${el.placeholder}"`));
    });

    if (formInfo.length === 0) {
      console.log('  No form on contact-us. Checking for form on homepage...');
      await page.goto('https://www.learelectric.com/', { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
    }

    // Fill DM form fields generically
    await page.evaluate((p) => {
      const forms = document.querySelectorAll('form');
      const form = Array.from(forms).find(f => f.querySelectorAll('input, textarea').length >= 3) || forms[0];
      if (!form) return;

      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]), textarea'));
      for (const el of inputs) {
        const placeholder = (el.placeholder || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const combined = `${placeholder} ${name} ${id}`;

        let value = '';
        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment')) {
          value = p.message;
        } else if (combined.includes('email')) {
          value = p.email;
        } else if (combined.includes('phone') || combined.includes('tel')) {
          value = p.phone;
        } else if (combined.includes('first') || combined.includes('fname')) {
          value = p.firstName;
        } else if (combined.includes('last') || combined.includes('lname')) {
          value = p.lastName;
        } else if (combined.includes('name') && !combined.includes('company')) {
          value = p.fullName;
        } else if (combined.includes('company') || combined.includes('business')) {
          value = p.company;
        } else if (combined.includes('subject')) {
          value = p.subject;
        } else {
          // DM form: dmform-0 = name, dmform-1 = email, dmform-2 = phone, dmform-5 = company, dmform-7 = message
          if (name === 'dmform-0') value = p.fullName;
          else if (name === 'dmform-1') value = p.email;
          else if (name === 'dmform-2') value = p.phone;
          else if (name === 'dmform-5') value = p.company;
          else if (name === 'dmform-7') value = p.message;
        }
        if (value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"]');
      if (btn) btn.click();
      else {
        const form = document.querySelector('form');
        if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
      }
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await checkSuccess(page, initialUrl);
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);
    const bodySnip = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log(`  Body snippet: ${bodySnip.substring(0, 200)}`);

    if (result.ok) {
      console.log(`  ✅ CONFIRMED: "${result.phrase}"`);
      saveResult(5323, 'contacted', `Contact form: https://www.learelectric.com/contact-us (Autofilled & verified: ${result.phrase})`);
    } else {
      saveResult(5323, 'unable_to_reach', 'Contact form: https://www.learelectric.com/contact-us (DM form – submitted but no confirmation message detected)');
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(5323, 'unable_to_reach', `Error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ===== #5326 Dynalectric Oregon =====
async function submit5326(browser) {
  console.log('\n===== #5326 Dynalectric Oregon =====');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://dyna-oregon.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const initialUrl = page.url();
    console.log(`  Loaded: ${initialUrl}`);

    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => ({
        index: i, id: f.id,
        action: f.action || f.getAttribute('action') || '(none)',
        fields: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName, type: el.type, name: el.name, id: el.id,
          placeholder: el.placeholder || '', label: el.closest('.form-group')?.querySelector('label')?.innerText || ''
        }))
      }));
    });

    console.log(`  Found ${formInfo.length} form(s):`);
    formInfo.forEach(f => {
      console.log(`    Form #${f.index}: action="${f.action}"`);
      f.fields.forEach(el => console.log(`      [${el.tag}] type="${el.type}" name="${el.name}" placeholder="${el.placeholder}" label="${el.label}"`));
    });

    // Check for captcha
    const captcha = await page.evaluate(() => {
      return document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], [data-sitekey]').length > 0;
    });
    if (captcha) {
      console.log('  ⚠️ CAPTCHA detected');
      saveResult(5326, 'unable_to_reach', 'Contact form: https://dyna-oregon.com/contact (Blocked by CAPTCHA)');
      await page.close();
      return;
    }

    if (formInfo.length === 0 || formInfo.every(f => f.fields.length < 2)) {
      console.log('  No submittable form on /contact');
      saveResult(5326, 'unable_to_reach', 'Contact form: https://dyna-oregon.com/contact (No submittable web form found on contact page)');
      await page.close();
      return;
    }

    // Generic autofill
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]), textarea, select'));
      for (const el of inputs) {
        const placeholder = (el.placeholder || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const label = (el.closest('.form-group, .field')?.querySelector('label')?.innerText || '').toLowerCase();
        const combined = `${placeholder} ${name} ${id} ${label}`;

        let value = '';
        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('how can')) value = p.message;
        else if (el.type === 'email' || combined.includes('email')) value = p.email;
        else if (el.type === 'tel' || combined.includes('phone') || combined.includes('tel')) value = p.phone;
        else if (combined.includes('first')) value = p.firstName;
        else if (combined.includes('last')) value = p.lastName;
        else if (combined.includes('name') && !combined.includes('company')) value = p.fullName;
        else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) value = p.company;
        else if (combined.includes('subject') || combined.includes('topic')) value = p.subject;
        else if (combined.includes('zip') || combined.includes('postal')) value = p.zip;
        else if (combined.includes('city')) value = p.city;
        else if (combined.includes('address')) value = p.address;
        else if (el.tagName.toLowerCase() === 'select') { if (el.options.length > 1) el.selectedIndex = 1; }

        if (value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const btn = document.querySelector('input[type="submit"], button[type="submit"]');
      if (btn) btn.click();
      else {
        const form = Array.from(document.querySelectorAll('form')).find(f => f.querySelectorAll('input, textarea').length > 1);
        if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
      }
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await checkSuccess(page, initialUrl);
    const finalUrl = page.url();
    const bodySnip = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Body snippet: ${bodySnip.substring(0, 200)}`);

    if (result.ok) {
      console.log(`  ✅ CONFIRMED: "${result.phrase}"`);
      saveResult(5326, 'contacted', `Contact form: https://dyna-oregon.com/contact (Autofilled & verified: ${result.phrase})`);
    } else {
      saveResult(5326, 'unable_to_reach', 'Contact form: https://dyna-oregon.com/contact (Form submitted but no confirmation message detected; Concrete5 CMS)');
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(5326, 'unable_to_reach', `Error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ===== #5333 Ziba Headquarters =====
async function submit5333(browser) {
  console.log('\n===== #5333 Ziba Headquarters =====');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    await page.goto('https://www.ziba.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    const initialUrl = page.url();
    console.log(`  Loaded: ${initialUrl}`);

    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => ({
        index: i, id: f.id, action: f.action || '(none)',
        fields: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName, type: el.type, name: el.name, id: el.id, placeholder: el.placeholder || ''
        }))
      }));
    });

    console.log(`  Found ${formInfo.length} form(s):`);
    formInfo.forEach(f => {
      console.log(`    Form #${f.index} action="${f.action}"`);
      f.fields.forEach(el => console.log(`      [${el.tag}] type="${el.type}" name="${el.name}" placeholder="${el.placeholder}"`));
    });

    const captcha = await page.evaluate(() =>
      document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], [data-sitekey]').length > 0
    );
    if (captcha) {
      console.log('  ⚠️ CAPTCHA detected');
      saveResult(5333, 'unable_to_reach', 'Contact form: https://www.ziba.com/contact (Blocked by CAPTCHA)');
      await page.close();
      return;
    }

    if (formInfo.length === 0 || formInfo.every(f => f.fields.length < 2)) {
      console.log('  No submittable form found');
      saveResult(5333, 'unable_to_reach', 'Contact form: https://www.ziba.com/contact (No submittable web form found)');
      await page.close();
      return;
    }

    // Fill form
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="button"]), textarea'));
      for (const el of inputs) {
        const name = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const placeholder = (el.placeholder || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder}`;

        let value = '';
        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('note')) value = p.message;
        else if (el.type === 'email' || combined.includes('email')) value = p.email;
        else if (el.type === 'tel' || combined.includes('phone') || combined.includes('tel')) value = p.phone;
        else if (combined.includes('first')) value = p.firstName;
        else if (combined.includes('last')) value = p.lastName;
        else if (combined.includes('name') && !combined.includes('company')) value = p.fullName;
        else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) value = p.company;
        else if (combined.includes('subject') || combined.includes('topic')) value = p.subject;

        if (value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) btn.click();
      else {
        const form = document.querySelector('form');
        if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
      }
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await checkSuccess(page, initialUrl);
    const finalUrl = page.url();
    const bodySnip = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Body snippet: ${bodySnip.substring(0, 200)}`);

    if (result.ok) {
      console.log(`  ✅ CONFIRMED: "${result.phrase}"`);
      saveResult(5333, 'contacted', `Contact form: https://www.ziba.com/contact (Autofilled & verified: ${result.phrase})`);
    } else {
      saveResult(5333, 'unable_to_reach', 'Contact form: https://www.ziba.com/contact (Submitted but no confirmation detected)');
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(5333, 'unable_to_reach', `Error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ===== #5334 Simplexity Product Development =====
async function submit5334(browser) {
  console.log('\n===== #5334 Simplexity Product Development =====');
  const page = await browser.newPage();
  page.on('dialog', async d => { try { await d.dismiss(); } catch(_) {} });
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // Intercept heavy resources to speed up loading
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image', 'media', 'font'].includes(req.resourceType())) req.abort();
    else req.continue();
  });

  try {
    // Try contact page directly
    let loaded = false;
    for (const url of ['https://www.simplexitypd.com/contact', 'https://simplexitypd.com/contact', 'https://www.simplexitypd.com/contact-us', 'https://www.simplexitypd.com/']) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        loaded = true;
        console.log(`  Loaded: ${page.url()}`);
        break;
      } catch (e) {
        console.log(`  Timeout on ${url}, trying next...`);
      }
    }

    if (!loaded) {
      saveResult(5334, 'unable_to_reach', 'Site inaccessible: navigation timeout on all URL variants');
      await page.close();
      return;
    }

    await new Promise(r => setTimeout(r, 3000));

    const initialUrl = page.url();
    const formInfo = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.map((f, i) => ({
        index: i, id: f.id, action: f.action || '(none)',
        fields: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea, select')).map(el => ({
          tag: el.tagName, type: el.type, name: el.name, id: el.id, placeholder: el.placeholder || ''
        }))
      }));
    });

    console.log(`  Found ${formInfo.length} form(s):`);
    formInfo.forEach(f => {
      console.log(`    Form #${f.index} action="${f.action}"`);
      f.fields.forEach(el => console.log(`      [${el.tag}] type="${el.type}" name="${el.name}" placeholder="${el.placeholder}"`));
    });

    // Check for contact links if no good form
    const hasGoodForm = formInfo.some(f => f.fields.filter(el => !['hidden','submit','button'].includes(el.type)).length >= 2);
    if (!hasGoodForm) {
      const contactLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const match = links.find(a => {
          const href = a.href || '';
          const text = (a.innerText || '').toLowerCase();
          return (text.includes('contact') || href.toLowerCase().includes('contact')) && !href.startsWith('mailto:') && !href.startsWith('tel:');
        });
        return match ? match.href : null;
      });
      if (contactLink) {
        console.log(`  Navigating to contact link: ${contactLink}`);
        try {
          await page.goto(contactLink, { waitUntil: 'domcontentloaded', timeout: 25000 });
          await new Promise(r => setTimeout(r, 2000));
        } catch(e) { console.log(`  Timeout on contact link`); }
      }
    }

    const captcha = await page.evaluate(() =>
      document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], [data-sitekey]').length > 0
    );
    if (captcha) {
      console.log('  ⚠️ CAPTCHA detected');
      saveResult(5334, 'unable_to_reach', 'Contact form: https://www.simplexitypd.com/contact (Blocked by CAPTCHA)');
      await page.close();
      return;
    }

    // Final form check
    const finalFormCheck = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]), textarea');
      return inputs.length;
    });

    if (finalFormCheck < 2) {
      saveResult(5334, 'unable_to_reach', `Contact form: ${page.url()} (No submittable web form found)`);
      await page.close();
      return;
    }

    // Fill & submit
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="button"]), textarea'));
      for (const el of inputs) {
        const name = (el.name || '').toLowerCase();
        const id = (el.id || '').toLowerCase();
        const placeholder = (el.placeholder || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder}`;

        let value = '';
        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment')) value = p.message;
        else if (el.type === 'email' || combined.includes('email')) value = p.email;
        else if (el.type === 'tel' || combined.includes('phone') || combined.includes('tel')) value = p.phone;
        else if (combined.includes('first')) value = p.firstName;
        else if (combined.includes('last')) value = p.lastName;
        else if (combined.includes('name') && !combined.includes('company')) value = p.fullName;
        else if (combined.includes('company') || combined.includes('business')) value = p.company;
        else if (combined.includes('subject') || combined.includes('topic')) value = p.subject;

        if (value) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      }
    }, P);

    await new Promise(r => setTimeout(r, 1000));
    const submitUrl = page.url();
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) btn.click();
      else {
        const form = document.querySelector('form');
        if (form) { if (form.requestSubmit) form.requestSubmit(); else form.submit(); }
      }
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await checkSuccess(page, submitUrl);
    const finalUrl = page.url();
    const bodySnip = await page.evaluate(() => document.body.innerText.substring(0, 300));
    console.log(`  Final URL: ${finalUrl}`);
    console.log(`  Body snippet: ${bodySnip.substring(0, 200)}`);

    if (result.ok) {
      console.log(`  ✅ CONFIRMED: "${result.phrase}"`);
      saveResult(5334, 'contacted', `Contact form: ${submitUrl} (Autofilled & verified: ${result.phrase})`);
    } else {
      saveResult(5334, 'unable_to_reach', `Contact form: ${submitUrl} (Submitted but no confirmation detected)`);
    }
  } catch (e) {
    console.log(`  ERROR: ${e.message}`);
    saveResult(5334, 'unable_to_reach', `Error: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// ===== MAIN =====
(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--ignore-certificate-errors', '--window-size=1280,900']
  });

  await submit5322(browser);
  await submit5323(browser);
  await submit5326(browser);
  await submit5333(browser);
  await submit5334(browser);

  await browser.close();
  console.log('\n✅ All targeted submissions complete.');
})();
