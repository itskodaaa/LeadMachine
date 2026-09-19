import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
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
  console.log(`[DB UPDATED] #${id} -> status: ${status}, note: ${note}`);
}

async function testApex(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4065: Apex Engineering (GoDaddy Form)');
  const page = await browser.newPage();
  try {
    await page.goto('https://thestructurals.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Find input labels
    const labels = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('form input[type="text"], form textarea'));
      return inputs.map(i => {
        const container = i.closest('div');
        return {
          id: i.id,
          placeholder: i.placeholder,
          text: container ? container.innerText : ''
        };
      });
    });
    console.log('Apex form fields:', labels);

    // Fill form
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('form input[type="text"]'));
      // Typically GoDaddy order: Name, Email, Phone
      // Let's inspect each container text
      for (const input of inputs) {
        if (input.name === '_app_id') continue;
        const container = input.closest('div')?.innerText.toLowerCase() || '';
        if (container.includes('name') || (!container.includes('email') && !container.includes('phone') && !inputs.indexOf(input))) {
          input.value = p.fullName;
        } else if (container.includes('email') || (!container.includes('phone') && inputs.indexOf(input) === 2)) {
          input.value = p.email;
        } else if (container.includes('phone') || inputs.indexOf(input) === 3) {
          input.value = p.phone;
        } else {
          input.value = p.fullName;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const ta = document.querySelector('form textarea');
      if (ta) {
        ta.value = p.message;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, OUTREACH);

    console.log('Apex form filled. Clicking submit button...');
    const submitBtn = await page.$('form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submit clicked. Waiting 6s for response...');
      await new Promise(r => setTimeout(r, 6000));

      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Apex post-submission text snippet:', pageText.slice(0, 500));

      if (/thank you|message sent|thanks for reaching out|we'll be in touch|we have received/i.test(pageText)) {
        console.log('✅ Apex Engineering SUCCESS!');
        saveLeadResult(4065, 'contacted', 'Contact form: https://thestructurals.com/ (Autofilled & verified: Thank you message confirmed)');
      } else {
        console.log('Apex unconfirmed, checking errors...');
        const errorText = await page.evaluate(() => {
          const errs = Array.from(document.querySelectorAll('.error, [role="alert"], [class*="error"]'));
          return errs.map(e => e.innerText).join('; ');
        });
        console.log('Apex error text:', errorText);
        saveLeadResult(4065, 'unable_to_reach', `Contact form: https://thestructurals.com/ (Submission completed; ${errorText || 'No explicit confirmation text'})`);
      }
    }
  } catch (e) {
    console.log('Apex error:', e.message);
  } finally {
    await page.close();
  }
}

async function testFraga(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4068: Fraga Engineers (Wix Form)');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.fragaeng.com/contact', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill Wix form
    await page.evaluate((p) => {
      const nameInp = document.querySelector('#input_comp-kf5xnn7q') || document.querySelector('input[name="name-*"]');
      const emailInp = document.querySelector('#input_comp-kf5xnn88') || document.querySelector('input[name="email"]');
      const phoneInp = document.querySelector('#input_comp-kf5xnn8d') || document.querySelector('input[name="phone"]');
      const subjInp = document.querySelector('#input_comp-kf5xnn8j') || document.querySelector('input[name="subject"]');
      const msgInp = document.querySelector('#textarea_comp-kf5xnn8o') || document.querySelector('textarea');

      function setVal(el, val) {
        if (!el) return;
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      setVal(nameInp, p.fullName);
      setVal(emailInp, p.email);
      setVal(phoneInp, p.phone);
      setVal(subjInp, p.subject);
      setVal(msgInp, p.message);
    }, OUTREACH);

    console.log('Fraga Wix form filled. Clicking submit button...');
    const submitBtn = await page.$('button[data-testid="buttonElement"], form.wixui-form button[type="submit"], form.wixui-form button');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submit clicked. Waiting 7s for response...');
      await new Promise(r => setTimeout(r, 7000));

      const wixResult = await page.evaluate(() => {
        const body = document.body.innerText;
        const successMsg = document.querySelector('[data-testid="messageline"], [class*="notifications"], [class*="success"]');
        return {
          bodySnippet: body.slice(0, 300),
          successText: successMsg ? successMsg.innerText : null,
          hasThanks: /thanks for submitting|thank you|message has been sent/i.test(body)
        };
      });
      console.log('Fraga result:', wixResult);

      if (wixResult.hasThanks || (wixResult.successText && /thank|success/i.test(wixResult.successText))) {
        console.log('✅ Fraga Engineers SUCCESS!');
        saveLeadResult(4068, 'contacted', 'Contact form: https://www.fragaeng.com/contact (Autofilled & verified: Wix submission confirmed)');
      } else {
        saveLeadResult(4068, 'unable_to_reach', 'Contact form: https://www.fragaeng.com/contact (Wix form submitted; awaiting confirmation banner)');
      }
    }
  } catch (e) {
    console.log('Fraga error:', e.message);
  } finally {
    await page.close();
  }
}

async function testGEM360(browser) {
  console.log('\n========================================');
  console.log('Testing Lead #4071: GEM360 LLC (Request Quote Form)');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.gem360llc.com/request-quote', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form
    await page.evaluate((p) => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setVal('#first-name', p.firstName);
      setVal('#last-name', p.lastName);
      setVal('#email', p.email);
      setVal('#phone-number', p.phone);
      setVal('#country-region', 'United States');
      setVal('#company', p.company);
      setVal('#job-title', 'Procurement Director');
      setVal('#project-description', p.message);

      // Selects
      const src = document.querySelector('#source');
      if (src && src.options.length > 1) src.selectedIndex = 1;
      const ind = document.querySelector('#industry');
      if (ind && ind.options.length > 1) ind.selectedIndex = 1;
      const srv = document.querySelector('#services');
      if (srv && srv.options.length > 1) srv.selectedIndex = 1;

      // Checkbox consent
      const consent = document.querySelector('#consent');
      if (consent) consent.checked = true;
    }, OUTREACH);

    console.log('GEM360 form filled. Clicking submit button...');
    const submitBtn = await page.$('#gem360-contact-form button[type="submit"], form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submit clicked. Waiting 6s for response...');
      await new Promise(r => setTimeout(r, 6000));

      const pageText = await page.evaluate(() => document.body.innerText);
      const url = page.url();
      console.log('GEM360 URL post-submit:', url);
      console.log('GEM360 snippet:', pageText.slice(0, 400));

      if (/thank you|received your quotation|quote requested|inquiry submitted|successfully/i.test(pageText)) {
        console.log('✅ GEM360 LLC SUCCESS!');
        saveLeadResult(4071, 'contacted', `Contact form: ${url} (Autofilled & verified: Quote request confirmation received)`);
      } else {
        saveLeadResult(4071, 'unable_to_reach', `Contact form: ${url} (Submitted; no explicit confirmation detected)`);
      }
    }
  } catch (e) {
    console.log('GEM360 error:', e.message);
  } finally {
    await page.close();
  }
}

async function testLetsPrototype(browser) {
  console.log('\n========================================');
  console.log("Testing Lead #4064: Let's prototype (Elementor Form)");
  const page = await browser.newPage();
  try {
    await page.goto('https://letsprototype.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    // Fill Elementor form
    await page.evaluate((p) => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      setVal('#form-field-field_d098641', 'Product Engineering & Prototyping');
      setVal('#form-field-nombre', p.firstName);
      setVal('#form-field-apellidos', p.lastName);
      setVal('#form-field-email', p.email);
      setVal('#form-field-FormTelPro2', p.phone);

      const chk = document.querySelector('#form-field-field_3a97302-0') || document.querySelector('input[name="form_fields[field_3a97302]"]');
      if (chk) chk.checked = true;
    }, OUTREACH);

    console.log("Let's prototype form filled. Clicking submit button...");
    const submitBtn = await page.$('form.elementor-form button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      console.log('Submit clicked. Waiting 6s for response...');
      await new Promise(r => setTimeout(r, 6000));

      const elementorMsg = await page.evaluate(() => {
        const msg = document.querySelector('.elementor-message, .elementor-message-success, .elementor-message-danger');
        return {
          text: msg ? msg.innerText : null,
          bodySnippet: document.body.innerText.slice(0, 300)
        };
      });
      console.log("Let's prototype result:", elementorMsg);

      if (elementorMsg.text && /enviado|éxito|gracias|thank|success/i.test(elementorMsg.text)) {
        console.log("✅ Let's prototype SUCCESS!");
        saveLeadResult(4064, 'contacted', `Contact form: https://letsprototype.com/ (Autofilled & verified: ${elementorMsg.text})`);
      } else {
        saveLeadResult(4064, 'unable_to_reach', `Contact form: https://letsprototype.com/ (${elementorMsg.text || 'Elementor form submitted; unconfirmed'})`);
      }
    }
  } catch (e) {
    console.log("Let's prototype error:", e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  await testApex(browser);
  await testFraga(browser);
  await testGEM360(browser);
  await testLetsPrototype(browser);

  await browser.close();
}

run();
