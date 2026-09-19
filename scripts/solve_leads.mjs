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
  zip: '60601',
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
  console.log(`[DB] Saved Lead #${id} as ${status}: ${note}`);
}

async function solveGetInc(browser) {
  console.log('\n--- Processing Lead #4075: Global Engineering & Technology, Inc. ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://getinc.org/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Type into fields
  await page.type('input[name="text-707"]', OUTREACH_PROFILE.fullName, { delay: 30 });
  await page.type('input[name="email-761"]', OUTREACH_PROFILE.email, { delay: 30 });
  await page.type('input[name="tel-733"]', OUTREACH_PROFILE.phone, { delay: 30 });
  await page.type('textarea[name="textarea-648"]', OUTREACH_PROFILE.message, { delay: 10 });

  // Wait 1s
  await new Promise(r => setTimeout(r, 1000));

  // Submit button
  const submitBtn = await page.$('button[type="submit"].case-btn');
  if (submitBtn) {
    console.log('Clicking Send Message button...');
    await submitBtn.click();
  } else {
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(btn => btn.innerText.includes('Send Message'));
      if (b) b.click();
    });
  }

  // Wait for response
  await new Promise(r => setTimeout(r, 5000));
  const result = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    return output ? output.innerText : document.body.innerText;
  });

  console.log('Result text:', result.slice(0, 200));
  if (/thank you|message has been sent|sent successfully/i.test(result)) {
    saveLeadResult(4075, 'contacted', `Contact form: https://getinc.org/contact-us/ (Autofilled & verified: ${result.trim()})`);
  } else {
    saveLeadResult(4075, 'unable_to_reach', `Contact form: https://getinc.org/contact-us/ (Response: ${result.slice(0, 100).trim()})`);
  }
  await page.close();
}

async function solveCastillo(browser) {
  console.log('\n--- Processing Lead #4076: Castillo Engineering, Inc ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://castilloeng.com', { waitUntil: 'networkidle2', timeout: 30000 });

  // Fill Wix form
  await page.type('#input_comp-keec03tp', OUTREACH_PROFILE.fullName, { delay: 30 });
  await page.type('#input_comp-keec03u2', OUTREACH_PROFILE.email, { delay: 30 });
  await page.type('#input_comp-keec03u6', OUTREACH_PROFILE.subject, { delay: 30 });
  await page.type('#input_comp-keec03ub', OUTREACH_PROFILE.phone, { delay: 30 });
  await page.type('#textarea_comp-keec03uf', OUTREACH_PROFILE.message, { delay: 10 });

  await new Promise(r => setTimeout(r, 1000));

  // Find Send button
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const sendBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'send');
    if (sendBtn) {
      sendBtn.click();
      return true;
    }
    return false;
  });
  console.log('Clicked send button:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const confirmation = await page.evaluate(() => {
    const msgs = document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]');
    for (const m of msgs) {
      if (m.innerText.trim()) return m.innerText.trim();
    }
    return document.body.innerText;
  });

  console.log('Castillo confirmation snippet:', confirmation.slice(0, 250));
  if (/thanks for submitting|thank you|message has been sent|received your message/i.test(confirmation)) {
    saveLeadResult(4076, 'contacted', `Contact form: https://castilloeng.com (Autofilled & verified: ${confirmation.slice(0, 100).trim()})`);
  } else {
    saveLeadResult(4076, 'unable_to_reach', `Contact form: https://castilloeng.com (Post-submission state: ${confirmation.slice(0, 100).trim()})`);
  }
  await page.close();
}

async function solveOneStop(browser) {
  console.log('\n--- Processing Lead #4074: One Stop Inventing ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://onestopinventing.com', { waitUntil: 'networkidle2', timeout: 30000 });

  // Examine gform_1 fields
  const fields = await page.evaluate(() => {
    const form = document.querySelector('#gform_1');
    if (!form) return null;
    return Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
      name: i.name,
      id: i.id,
      type: i.type,
      placeholder: i.placeholder,
      visible: i.offsetWidth > 0 && i.offsetHeight > 0,
      label: i.closest('.gfield')?.querySelector('label')?.innerText || ''
    }));
  });
  console.log('One Stop Inventing form fields:', fields);

  // If there are inputs, let's type properly into visible fields
  if (fields) {
    for (const f of fields) {
      if (!f.visible || f.type === 'hidden' || f.type === 'submit') continue;
      const label = f.label.toLowerCase();
      const name = f.name.toLowerCase();
      const selector = `#${f.id}`;

      if (label.includes('first') || name.includes('first')) {
        await page.type(selector, OUTREACH_PROFILE.firstName, { delay: 20 });
      } else if (label.includes('last') || name.includes('last')) {
        await page.type(selector, OUTREACH_PROFILE.lastName, { delay: 20 });
      } else if (label.includes('name') || name.includes('name')) {
        await page.type(selector, OUTREACH_PROFILE.fullName, { delay: 20 });
      } else if (label.includes('email') || name.includes('email')) {
        await page.type(selector, OUTREACH_PROFILE.email, { delay: 20 });
      } else if (label.includes('phone') || name.includes('phone')) {
        await page.type(selector, OUTREACH_PROFILE.phone, { delay: 20 });
      } else if (label.includes('message') || label.includes('comment') || label.includes('tell') || f.type === 'textarea') {
        await page.type(selector, OUTREACH_PROFILE.message, { delay: 10 });
      } else if (label.includes('company') || name.includes('company')) {
        await page.type(selector, OUTREACH_PROFILE.company, { delay: 20 });
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    const submitBtn = await page.$('#gform_submit_button_1, #gform_1 input[type="submit"], #gform_1 button[type="submit"]');
    if (submitBtn) {
      console.log('Clicking gform_1 submit...');
      await submitBtn.click();
    }
    await new Promise(r => setTimeout(r, 5000));

    const confirmation = await page.evaluate(() => {
      const conf = document.querySelector('.gform_confirmation_message, #gforms_confirmation_message_1, .gform_validation_errors');
      if (conf) return conf.innerText.trim();
      return document.body.innerText;
    });

    console.log('One Stop Inventing confirmation snippet:', confirmation.slice(0, 200));
    if (/thank you|thanks for contacting|received your/i.test(confirmation)) {
      saveLeadResult(4074, 'contacted', `Contact form: https://onestopinventing.com (Autofilled & verified: ${confirmation.slice(0, 100).trim()})`);
    } else {
      saveLeadResult(4074, 'unable_to_reach', `Contact form: https://onestopinventing.com (Post-submission response: ${confirmation.slice(0, 100).trim()})`);
    }
  }

  await page.close();
}

async function solveGoDaddy(browser, leadId, url, companyName) {
  console.log(`\n--- Processing Lead #${leadId}: ${companyName} (${url}) ---`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // On GoDaddy sites, inputs are controlled React components.
  // We can find input fields with data-aid or aria-label or placeholder
  const filled = await page.evaluate((p) => {
    function setReactInput(input, value) {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const nativeTextAreaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (input.tagName.toLowerCase() === 'textarea' && nativeTextAreaSetter) {
        nativeTextAreaSetter.call(input, value);
      } else if (nativeInputValueSetter) {
        nativeInputValueSetter.call(input, value);
      } else {
        input.value = value;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    const form = document.querySelector('form[data-ux="Form"]');
    if (!form) return false;

    const inputs = form.querySelectorAll('input:not([type="hidden"]), textarea');
    for (const input of inputs) {
      const aid = (input.getAttribute('data-aid') || '').toLowerCase();
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      const aria = (input.getAttribute('aria-label') || '').toLowerCase();
      const name = (input.getAttribute('name') || '').toLowerCase();
      const combined = `${aid} ${placeholder} ${aria} ${name}`;

      if (input.tagName.toLowerCase() === 'textarea' || combined.includes('message')) {
        setReactInput(input, p.message);
      } else if (combined.includes('name')) {
        setReactInput(input, p.fullName);
      } else if (combined.includes('email')) {
        setReactInput(input, p.email);
      } else if (combined.includes('phone')) {
        setReactInput(input, p.phone);
      }
    }
    return true;
  }, OUTREACH_PROFILE);

  console.log('GoDaddy form filled:', filled);
  await new Promise(r => setTimeout(r, 1000));

  // Click submit button
  const submitClicked = await page.evaluate(() => {
    const form = document.querySelector('form[data-ux="Form"]');
    if (!form) return false;
    const btn = form.querySelector('button[type="submit"], [data-aid*="SUBMIT"], button');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('GoDaddy submit clicked:', submitClicked);
  await new Promise(r => setTimeout(r, 5000));

  const confirmation = await page.evaluate(() => {
    const successBox = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS_MESSAGE_REND"], [data-ux="Alert"]');
    if (successBox) return successBox.innerText.trim();
    return document.body.innerText;
  });

  console.log('GoDaddy response snippet:', confirmation.slice(0, 200));
  if (/thank you|thank you for reaching out|we will get back to you|message sent/i.test(confirmation)) {
    saveLeadResult(leadId, 'contacted', `Contact form: ${url} (Autofilled & verified: ${confirmation.slice(0, 100).trim()})`);
  } else {
    saveLeadResult(leadId, 'unable_to_reach', `Contact form: ${url} (Unconfirmed post-submit: ${confirmation.slice(0, 100).trim()})`);
  }

  await page.close();
}

async function solveJdMiami(browser) {
  console.log('\n--- Processing Lead #4077: JD-MIAMI ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.jd-miami.com/contact-us8cfb270c', { waitUntil: 'networkidle2', timeout: 30000 });

  const fields = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return null;
    return Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
      name: i.name,
      id: i.id,
      type: i.type,
      placeholder: i.placeholder,
      label: i.closest('.dmforminput')?.querySelector('label')?.innerText || ''
    }));
  });
  console.log('JD-Miami fields:', fields);

  if (fields) {
    for (const f of fields) {
      const label = f.label.toLowerCase();
      const sel = `#${f.id}`;
      if (label.includes('name')) {
        await page.type(sel, OUTREACH_PROFILE.fullName, { delay: 20 });
      } else if (label.includes('email')) {
        await page.type(sel, OUTREACH_PROFILE.email, { delay: 20 });
      } else if (label.includes('phone')) {
        await page.type(sel, OUTREACH_PROFILE.phone, { delay: 20 });
      } else if (label.includes('message') || f.type === 'textarea') {
        await page.type(sel, OUTREACH_PROFILE.message, { delay: 10 });
      }
    }

    await new Promise(r => setTimeout(r, 1000));
    await page.evaluate(() => {
      const form = document.querySelector('form');
      const btn = form.querySelector('input[type="submit"], button');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));
    const confirmation = await page.evaluate(() => {
      const resp = document.querySelector('.dmform-response, [role="alert"], .alert');
      if (resp) return resp.innerText.trim();
      return document.body.innerText;
    });

    console.log('JD-Miami confirmation snippet:', confirmation.slice(0, 200));
    if (/thank you|we received your message|in touch shortly|sent/i.test(confirmation)) {
      saveLeadResult(4077, 'contacted', `Contact form: https://www.jd-miami.com/contact-us8cfb270c (Autofilled & verified: ${confirmation.slice(0, 100).trim()})`);
    } else {
      saveLeadResult(4077, 'unable_to_reach', `Contact form: https://www.jd-miami.com/contact-us8cfb270c (${confirmation.slice(0, 100).trim()})`);
    }
  }

  await page.close();
}

async function solveAnce(browser) {
  console.log('\n--- Processing Lead #4073: ANCE Engineering Inc ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://anceengineering.com', { waitUntil: 'networkidle2', timeout: 30000 });

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href]')).map(a => ({ text: a.innerText.trim(), href: a.href }));
  });
  console.log('ANCE links:', links.slice(0, 15));

  // Check footer or contact info
  const text = await page.evaluate(() => document.body.innerText);
  console.log('ANCE body text snippet:', text.slice(0, 300));
  saveLeadResult(4073, 'unable_to_reach', 'Checked https://anceengineering.com: Online store / catalog only, no general contact inquiry form found');
  await page.close();
}

async function solveEthos(browser) {
  console.log('\n--- Processing Lead #4081: Ethos Engineering ---');
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://ethosengineering.square.site', { waitUntil: 'networkidle2', timeout: 30000 });

  const text = await page.evaluate(() => document.body.innerText);
  console.log('Ethos Engineering body text snippet:', text.slice(0, 300));
  saveLeadResult(4081, 'unable_to_reach', 'Checked https://ethosengineering.square.site: Square site storefront with no contact or inquiry form');
  await page.close();
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await solveGetInc(browser);
    await solveCastillo(browser);
    await solveOneStop(browser);
    await solveGoDaddy(browser, 4079, 'https://protek.engineering', 'Protek Engineering');
    await solveGoDaddy(browser, 4080, 'https://egscfl.com', 'EGSC Engineering Consultants, Inc.');
    await solveJdMiami(browser);
    await solveAnce(browser);
    await solveEthos(browser);
  } finally {
    await browser.close();
  }
}

main().catch(err => console.error(err));
