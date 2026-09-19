import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  first: 'Pamela',
  last: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your contracting services and explore potential collaboration on upcoming commercial projects. Kindly arrange for a representative to contact us. Thank you.'
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, notes FROM leads WHERE id = ?');

function commitStatus(id, status, note) {
  const current = getStmt.get(id);
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
  console.log(`[DB COMMIT] Lead #${id} -> status: ${status}, note: ${note}`);
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // ==========================================
  // 1. Lead #2405: TERRA CONTRACTING
  // ==========================================
  try {
    console.log('\n=== Lead #2405: TERRA CONTRACTING ===');
    const page = await browser.newPage();
    await page.goto('https://terracontracting.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Focus & type into each field to be realistic
    const f1 = await page.$('#input_1_1_3');
    if (f1) { await f1.focus(); await page.keyboard.type(OUTREACH.first, { delay: 20 }); }
    const f2 = await page.$('#input_1_1_6');
    if (f2) { await f2.focus(); await page.keyboard.type(OUTREACH.last, { delay: 20 }); }
    const f3 = await page.$('#input_1_2');
    if (f3) { await f3.focus(); await page.keyboard.type(OUTREACH.phone, { delay: 20 }); }
    const f4 = await page.$('#input_1_3');
    if (f4) { await f4.focus(); await page.keyboard.type(OUTREACH.email, { delay: 20 }); }
    const f5 = await page.$('#input_1_4');
    if (f5) { await f5.focus(); await page.keyboard.type(OUTREACH.message, { delay: 10 }); }

    const submitBtn = await page.$('#gform_submit_button_1');
    if (submitBtn) {
      console.log('Submitting Terra Gravity Form...');
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 3000));
      const text = await page.evaluate(() => document.body.innerText);
      const confMsg = await page.evaluate(() => {
        const el = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, #gform_confirmation_wrapper_1');
        return el ? el.innerText : null;
      });
      console.log('Terra confMsg:', confMsg);
      if (confMsg || /thanks for contacting|we have received|thank you for contacting|confirmation/i.test(text)) {
        const msg = confMsg ? confMsg.trim() : 'Thank you confirmation detected';
        commitStatus(2405, 'contacted', `Confirmed: Gravity Form submission received (${msg})`);
      } else {
        console.log('Terra post submission snippet:', text.slice(0, 300));
      }
    }
    await page.close();
  } catch (e) {
    console.error('Terra error:', e.message);
  }

  // ==========================================
  // 2. Lead #2402: Contri Construction Co
  // ==========================================
  try {
    console.log('\n=== Lead #2402: Contri Construction Co ===');
    const page = await browser.newPage();
    await page.goto('https://www.contriconstruction.com/', { waitUntil: 'networkidle2', timeout: 25000 });

    const formDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, button'));
      return inputs.map(i => ({
        tag: i.tagName, type: i.type, name: i.name, id: i.id, placeholder: i.placeholder, text: i.innerText
      }));
    });
    console.log('Contri form elements:', JSON.stringify(formDetails));

    const nameInput = await page.$('input[name*="name" i]');
    const emailInput = await page.$('input[name*="email" i], input[type="email"]');
    const phoneInput = await page.$('input[name*="phone" i], input[type="tel"]');
    const msgInput = await page.$('textarea');

    if (nameInput) {
      await nameInput.focus();
      await page.keyboard.type(OUTREACH.fullName, { delay: 20 });
    }
    if (emailInput) {
      await emailInput.focus();
      await page.keyboard.type(OUTREACH.email, { delay: 20 });
    }
    if (phoneInput) {
      await phoneInput.focus();
      await page.keyboard.type(OUTREACH.phone, { delay: 20 });
    }
    if (msgInput) {
      await msgInput.focus();
      await page.keyboard.type(OUTREACH.message, { delay: 10 });
    }

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => (b.innerText || '').toLowerCase().includes('submit') || (b.innerText || '').toLowerCase().includes('send'));
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking Contri Wix submit button...');
      await submitBtn.asElement().click();

      let success = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const text = document.body.innerText;
          const msg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"], [class*="message"]')?.innerText;
          return {
            hasSuccess: /thanks for submitting|thank you|message received|sent/i.test(text),
            msg
          };
        });
        if (res.hasSuccess || res.msg) {
          console.log(`Contri confirmation found at sec ${i+1}:`, res);
          commitStatus(2402, 'contacted', `Confirmed: Wix form submission received (${res.msg || 'Thanks for submitting'})`);
          success = true;
          break;
        }
      }
      if (!success) {
        console.log('Contri submit finished with no confirmation message.');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Contri error:', e.message);
  }

  // ==========================================
  // 3. Lead #2407: Lanz Construction LLC
  // ==========================================
  try {
    console.log('\n=== Lead #2407: Lanz Construction LLC ===');
    const page = await browser.newPage();
    await page.goto('https://www.lanzconstructionllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });

    const fName = await page.$('input[name="first-name"], #input_comp-kmls1pns');
    const lName = await page.$('input[name="last-name *"], #input_comp-kmls1pnz');
    const phone = await page.$('input[name="phone-number"], #input_comp-kmls1po2');
    const msg = await page.$('textarea');

    if (fName) { await fName.focus(); await page.keyboard.type(OUTREACH.first, { delay: 20 }); }
    if (lName) { await lName.focus(); await page.keyboard.type(OUTREACH.last, { delay: 20 }); }
    if (phone) { await phone.focus(); await page.keyboard.type(OUTREACH.phone, { delay: 20 }); }
    if (msg) { await msg.focus(); await page.keyboard.type(OUTREACH.message, { delay: 10 }); }

    const submitBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => (b.innerText || '').toLowerCase().includes('submit'));
    });

    if (submitBtn && submitBtn.asElement()) {
      console.log('Clicking Lanz Wix submit button...');
      await submitBtn.asElement().click();

      let success = false;
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const text = document.body.innerText;
          const msg = document.querySelector('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')?.innerText;
          return {
            hasSuccess: /thanks for submitting|thank you|message received|sent/i.test(text),
            msg
          };
        });
        if (res.hasSuccess || res.msg) {
          console.log(`Lanz confirmation found at sec ${i+1}:`, res);
          commitStatus(2407, 'contacted', `Confirmed: Wix form submission received (${res.msg || 'Thanks for submitting'})`);
          success = true;
          break;
        }
      }
      if (!success) {
        console.log('Lanz submit finished with no confirmation message.');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Lanz error:', e.message);
  }

  // ==========================================
  // 4. Lead #2410: H & M Unlimited Inc.
  // ==========================================
  try {
    console.log('\n=== Lead #2410: H & M Unlimited Inc. ===');
    const page = await browser.newPage();
    await page.goto('https://hmunlimitedinc.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect all form fields and labels in detail
    const formMeta = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input, select, textarea'));
      return inputs.map(i => ({
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        value: i.value,
        ariaRequired: i.getAttribute('aria-required')
      }));
    });
    console.log('H & M Form Meta:', formMeta);

    // Let's type into all required fields
    const inputs = await page.$$('form.wpcf7-form input:not([type="hidden"]), form.wpcf7-form textarea');
    for (const input of inputs) {
      const meta = await page.evaluate(el => ({
        name: el.name,
        placeholder: el.placeholder,
        type: el.type
      }), input);

      if (meta.type === 'submit') continue;

      if (meta.placeholder.includes('Name')) {
        await input.focus();
        await page.keyboard.type(OUTREACH.fullName, { delay: 10 });
      } else if (meta.placeholder.includes('Service')) {
        await input.focus();
        await page.keyboard.type('Commercial Painting & Remodeling', { delay: 10 });
      } else if (meta.placeholder.includes('Email') || meta.type === 'email') {
        await input.focus();
        await page.keyboard.type(OUTREACH.email, { delay: 10 });
      } else if (meta.placeholder.includes('Square Footage')) {
        await input.focus();
        await page.keyboard.type('5000', { delay: 10 });
      } else if (meta.placeholder.includes('Phone') || meta.name.includes('number')) {
        await input.focus();
        await page.keyboard.type('7085683708', { delay: 10 });
      } else if (meta.type === 'date') {
        await page.evaluate(el => el.value = '2026-10-15', input);
      } else if (meta.type === 'textarea') {
        await input.focus();
        await page.keyboard.type(OUTREACH.message, { delay: 5 });
      }
    }

    const cf7Submit = await page.$('form.wpcf7-form input[type="submit"]');
    if (cf7Submit) {
      console.log('Clicking H & M CF7 submit...');
      await cf7Submit.click();
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const res = await page.evaluate(() => {
          const el = document.querySelector('.wpcf7-response-output');
          return el ? el.innerText.trim() : null;
        });
        if (res) {
          console.log(`H & M response at sec ${i+1}: ${res}`);
          if (/thank you|received|sent|success/i.test(res)) {
            commitStatus(2410, 'contacted', `Confirmed WP CF7: ${res}`);
            break;
          }
        }
      }
    }
    await page.close();
  } catch (e) {
    console.error('H & M error:', e.message);
  }

  await browser.close();
  console.log('\n--- Script finished ---');
}

run();
