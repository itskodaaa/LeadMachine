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
}

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });

  // 1. #3317 Assured Engineering Concepts, LLC
  console.log('\n--- Processing #3317 Assured Engineering Concepts ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://assuredeng.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Godaddy website builder inputs:
    const nameInput = await page.$('input[data-aid="CONTACT_FORM_NAME"], #input1');
    const emailInput = await page.$('input[data-aid="CONTACT_FORM_EMAIL"], #input2');
    const msgInput = await page.$('textarea[data-aid="CONTACT_FORM_MESSAGE"], textarea');
    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"], button[type="submit"]');

    if (nameInput && emailInput && msgInput && submitBtn) {
      await nameInput.type(OUTREACH_PROFILE.fullName);
      await emailInput.type(OUTREACH_PROFILE.email);
      await msgInput.type(OUTREACH_PROFILE.message);

      console.log('Clicking Assured Engineering submit button...');
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 4000));

      const successMsg = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('[data-aid*="SUCCESS"], .alert-success, div, p, span'));
        for (const el of els) {
          const txt = el.innerText.trim();
          if (/thank you|message sent|we('ll| will) get back|thanks for contacting/i.test(txt) && txt.length < 200) {
            return txt;
          }
        }
        return null;
      });

      console.log('Assured Engineering Result:', successMsg);
      if (successMsg) {
        saveLeadResult(3317, 'contacted', `Contact form: https://assuredeng.com/ (Autofilled & verified: "${successMsg}")`);
        console.log('✅ #3317 marked contacted!');
      } else {
        const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 400));
        console.log('Body snippet after submit:', bodySnippet);
      }
    } else {
      console.log('Could not find all form inputs for Assured Engineering');
    }
    await page.close();
  } catch (e) {
    console.error('Error on #3317:', e.message);
  }

  // 2. #3314 Consultant Engineering, Inc.
  console.log('\n--- Processing #3314 Consultant Engineering, Inc. ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://cei-az.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Scroll down to contact section
    await page.evaluate(() => {
      const el = document.querySelector('#contact, form');
      if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    const nameInput = await page.$('input[name="contact_name"]');
    const emailInput = await page.$('input[name="contact_email"]');
    const subjInput = await page.$('input[name="contact_subject"]');
    const commInput = await page.$('textarea[name="contact_comment"]');
    const submitBtn = await page.$('input[name="contact_submit"]');

    if (nameInput && emailInput && commInput && submitBtn) {
      await nameInput.type(OUTREACH_PROFILE.fullName);
      await emailInput.type(OUTREACH_PROFILE.email);
      if (subjInput) await subjInput.type(OUTREACH_PROFILE.subject);
      await commInput.type(OUTREACH_PROFILE.message);

      console.log('Submitting CEI form...');
      let responseLogged = null;
      page.on('response', async resp => {
        if (resp.request().method() === 'POST' || resp.url().includes('cei-az.com')) {
          try {
            const txt = await resp.text();
            if (txt.includes('thank') || txt.includes('success') || txt.includes('sent') || txt.includes('error')) {
              responseLogged = txt;
            }
          } catch (_) {}
        }
      });

      await Promise.all([
        page.waitForNavigation({ timeout: 6000 }).catch(() => {}),
        submitBtn.click()
      ]);
      await new Promise(r => setTimeout(r, 4000));

      const resultText = await page.evaluate(() => {
        const text = document.body.innerText;
        const matches = text.match(/(thank you[^\.\n]*[\.\n]|message has been sent|we will contact you|in touch shortly)/i);
        return matches ? matches[0] : null;
      });

      console.log('CEI Result text:', resultText, 'Response logged:', responseLogged?.slice(0, 150));
      if (resultText) {
        saveLeadResult(3314, 'contacted', `Contact form: https://cei-az.com/#contact (Autofilled & verified: "${resultText.trim()}")`);
        console.log('✅ #3314 marked contacted!');
      } else {
        const formMsg = await page.evaluate(() => {
          const form = document.querySelector('form');
          return form ? form.innerText : document.body.innerText.slice(0, 300);
        });
        console.log('CEI form area text after submit:', formMsg);
      }
    }
    await page.close();
  } catch (e) {
    console.error('Error on #3314:', e.message);
  }

  // 3. #3311 Professional Consulting Engineers, LLC
  console.log('\n--- Processing #3311 Professional Consulting Engineers ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://pce-az.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form
    const nameEl = await page.$('input[name="name"]');
    const emailEl = await page.$('input[name="email"]');
    const phoneEl = await page.$('input[name="phone"]');
    const compEl = await page.$('input[name="company"]');
    const msgEl = await page.$('textarea[name="message"]');

    if (nameEl && emailEl && msgEl) {
      await nameEl.type(OUTREACH_PROFILE.fullName);
      await emailEl.type(OUTREACH_PROFILE.email);
      if (phoneEl) await phoneEl.type(OUTREACH_PROFILE.phone);
      if (compEl) await compEl.type(OUTREACH_PROFILE.company);

      // Select service if there's a custom dropdown
      await page.evaluate(() => {
        const select = document.querySelector('select');
        if (select && select.options.length > 1) {
          select.selectedIndex = 1;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // If it's a custom button dropdown
        const btn = document.querySelector('button:has-text("Select a service"), [aria-haspopup="listbox"]');
        if (btn) {
          btn.click();
        }
      });
      await new Promise(r => setTimeout(r, 500));
      await page.evaluate(() => {
        const opt = document.querySelector('[role="option"], li, ul button');
        if (opt) opt.click();
      });

      await msgEl.type(OUTREACH_PROFILE.message);

      // Listen to api/network calls
      let postResponse = null;
      page.on('response', async resp => {
        if (resp.request().method() === 'POST') {
          try {
            postResponse = { status: resp.status(), text: (await resp.text()).slice(0, 300) };
          } catch (_) {}
        }
      });

      const submitBtn = await page.$('button[type="submit"]');
      if (submitBtn) {
        console.log('Clicking PCE submit button...');
        await submitBtn.click();
      }
      await new Promise(r => setTimeout(r, 4000));

      console.log('PCE POST Response:', JSON.stringify(postResponse));
      const pceResult = await page.evaluate(() => {
        const matches = Array.from(document.querySelectorAll('*'))
          .map(e => e.innerText ? e.innerText.trim() : '')
          .filter(t => /thank|received|sent|successfully|error|required/i.test(t) && t.length < 150);
        return matches;
      });
      console.log('PCE Messages found:', pceResult);

      const success = pceResult.find(m => /thank|received|sent|successfully/i.test(m) && !/cookie/i.test(m));
      if (success) {
        saveLeadResult(3311, 'contacted', `Contact form: https://pce-az.com/contact (Autofilled & verified: "${success}")`);
        console.log('✅ #3311 marked contacted!');
      }
    }
    await page.close();
  } catch (e) {
    console.error('Error on #3311:', e.message);
  }

  // 4. #3312 UES (teamues.com)
  console.log('\n--- Processing #3312 UES ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://www.teamues.com/contact-ues/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Dismiss cookie banner
    await page.evaluate(() => {
      const b = document.querySelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Check recaptcha on UES
    const recaptchaInfo = await page.evaluate(() => {
      const g = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], .wpforms-recaptcha-container');
      const forms = document.querySelector('form.wpforms-form');
      return {
        hasCaptcha: !!g,
        captchaHtml: g ? g.outerHTML : null,
        formClasses: forms ? forms.className : null
      };
    });
    console.log('UES Recaptcha info:', recaptchaInfo);

    await page.type('input[name="wpforms[fields][0][first]"]', OUTREACH_PROFILE.firstName);
    await page.type('input[name="wpforms[fields][0][last]"]', OUTREACH_PROFILE.lastName);
    await page.type('input[name="wpforms[fields][3]"]', OUTREACH_PROFILE.company);
    await page.type('input[name="wpforms[fields][4]"]', OUTREACH_PROFILE.phone);
    await page.type('input[name="wpforms[fields][1]"]', OUTREACH_PROFILE.email);
    await page.type('textarea[name="wpforms[fields][2]"]', OUTREACH_PROFILE.message);

    // Click radio
    await page.evaluate(() => {
      const r = document.querySelector('input[type="radio"]');
      if (r) r.click();
    });

    let uesPost = null;
    page.on('response', async resp => {
      if (resp.request().method() === 'POST' && resp.url().includes('admin-ajax.php')) {
        try {
          uesPost = { status: resp.status(), text: (await resp.text()).slice(0, 300) };
        } catch (_) {}
      }
    });

    const submitBtn = await page.$('button[name="wpforms[submit]"], #wpforms-submit-6792');
    if (submitBtn) {
      console.log('Submitting UES form...');
      await submitBtn.click();
    }
    await new Promise(r => setTimeout(r, 4000));

    console.log('UES AJAX Response:', JSON.stringify(uesPost));
    const uesConfirmation = await page.evaluate(() => {
      const c = document.querySelector('.wpforms-confirmation-container-full, .wpforms-confirmation-container');
      const err = document.querySelector('.wpforms-error-container, label.wpforms-error');
      return { conf: c ? c.innerText.trim() : null, err: err ? err.innerText.trim() : null };
    });
    console.log('UES Confirmation:', uesConfirmation);

    if (uesConfirmation.conf) {
      saveLeadResult(3312, 'contacted', `Contact form: https://www.teamues.com/contact-ues/ (Autofilled & verified: "${uesConfirmation.conf}")`);
      console.log('✅ #3312 marked contacted!');
    }
    await page.close();
  } catch (e) {
    console.error('Error on #3312:', e.message);
  }

  // 5. #3316 Terracon Consultants, Inc.
  console.log('\n--- Processing #3316 Terracon Consultants ---');
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('https://www.terracon.com/about/contact/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    // Inspect form and recaptcha
    const info = await page.evaluate(() => {
      const sel = document.querySelector('#form-picker');
      const forms = Array.from(document.querySelectorAll('form.gform_wrapper, form')).map(f => ({
        id: f.id,
        classes: f.className,
        hasCaptcha: !!f.querySelector('.ginput_recaptchav3, .g-recaptcha, iframe[src*="recaptcha"]')
      }));
      return { hasPicker: !!sel, forms };
    });
    console.log('Terracon Info:', JSON.stringify(info, null, 2));
    await page.close();
  } catch (e) {
    console.error('Error on #3316:', e.message);
  }

  await browser.close();
}

run();
