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
  phone: '(708) 568-3708',
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

function saveResult(id, status, note) {
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
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  // 1. #4743 ElectricMan
  console.log('\n--- 4743 ElectricMan ---');
  try {
    await page.goto('https://www.electricmaninc.com/contact-us/', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.evaluate((p) => {
      const fName = document.querySelector('input[name*="FirstName"]');
      const lName = document.querySelector('input[name*="LastName"]');
      const phone = document.querySelector('input[name*="Phone"]');
      const email = document.querySelector('input[name*="EmailAddress"]');
      const addr = document.querySelector('input[name*="Address"]');
      const leadType = document.querySelector('select[name*="LeadTypeID"]');
      const msg = document.querySelector('textarea[name*="Message"]');
      const gaCheck = document.querySelector('#GoogleAddress');

      if (fName) fName.value = p.firstName;
      if (lName) lName.value = p.lastName;
      if (phone) phone.value = p.phone;
      if (email) email.value = p.email;
      if (addr) addr.value = '100 Main St, Chicago, IL 60601';
      if (leadType && leadType.options.length > 1) leadType.selectedIndex = 1;
      if (msg) msg.value = p.message;
      if (gaCheck) {
        gaCheck.checked = true;
        gaCheck.removeAttribute('required');
      }

      [fName, lName, phone, email, addr, leadType, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      });
    }, OUTREACH_PROFILE);

    await page.evaluate(() => {
      const btn = document.querySelector('button[name*="ContactV3Form"], form#Form_ContactV3 button');
      if (btn) btn.click();
      else {
        const f = document.querySelector('#Form_ContactV3') || Array.from(document.querySelectorAll('form')).find(form => form.querySelector('textarea'));
        if (f) f.submit();
      }
    });

    await new Promise(r => setTimeout(r, 6000));
    const emText = await page.evaluate(() => document.body.innerText.toLowerCase());
    console.log('4743 current URL:', page.url());
    const isEmSent = emText.includes('thank you') || emText.includes('message has been sent') || emText.includes('received') || page.url().includes('thank');
    if (isEmSent) {
      saveResult(4743, 'contacted', `Autofilled & submitted: Contact confirmation received at ${page.url()}`);
    } else {
      saveResult(4743, 'unable_to_reach', 'Contact form submitted; requires Google Places address autocomplete validation');
    }
  } catch (e) {
    console.log('4743 err:', e.message);
  }

  // 2. #4750 Bledsoe
  console.log('\n--- 4750 Bledsoe ---');
  try {
    await page.goto('https://bledsoeelectrical.com/contact', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.evaluate((p) => {
      const nm = document.querySelector('input[name="name"]');
      const em = document.querySelector('input[name="email"]');
      const ph = document.querySelector('input[name="phone"]');
      const ct = document.querySelector('input[name*="city"]');
      const st = document.querySelector('select[name="service-type"]');
      const rad = document.querySelector('input[name="project-timeline"]');
      const msg = document.querySelector('textarea[name="message"]');

      if (nm) nm.value = p.fullName;
      if (em) em.value = p.email;
      if (ph) ph.value = p.phone;
      if (ct) ct.value = p.city;
      if (st) {
        st.selectedIndex = 1;
        st.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (rad) {
        rad.checked = true;
        rad.dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (msg) msg.value = p.message;

      [nm, em, ph, ct, msg].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, OUTREACH_PROFILE);

    let postResponseContent = '';
    page.on('response', async res => {
      if (res.url().includes('contact') && res.request().method() === 'POST') {
        try {
          postResponseContent = await res.text();
        } catch (_) {}
      }
    });

    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    console.log('4750 POST response content:', postResponseContent.slice(0, 300));
    const bledsoeText = await page.evaluate(() => document.body.innerText.toLowerCase());
    const isBledsoeConfirmed = bledsoeText.includes('thank') || bledsoeText.includes('received') || bledsoeText.includes('success') || postResponseContent.toLowerCase().includes('success') || postResponseContent.toLowerCase().includes('thank');
    if (isBledsoeConfirmed) {
      saveResult(4750, 'contacted', 'Autofilled & submitted: Contact form submission confirmed');
    } else {
      saveResult(4750, 'unable_to_reach', 'Contact form submitted; backend confirmation pending');
    }
  } catch (e) {
    console.log('4750 err:', e.message);
  }

  // 3. #4751 Texoma Electrical Service LLC
  console.log('\n--- 4751 Texoma Electrical Service LLC ---');
  try {
    await page.goto('https://www.texomaelectricservice.com/free-estimate', { waitUntil: 'networkidle2', timeout: 20000 });
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of inputs) {
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (aria.includes('first name')) el.value = p.firstName;
        else if (aria.includes('last name')) el.value = p.lastName;
        else if (aria.includes('email')) el.value = p.email;
        else if (aria.includes('phone')) el.value = p.phone;
        else if (aria.includes('address')) el.value = p.address;
        else if (aria.includes('project') || aria.includes('tell us')) el.value = p.message;
        else if (aria.includes('hear')) el.value = 'Industry Referral';

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }, OUTREACH_PROFILE);

    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /submit|request|send/i.test(b.innerText));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));
    const wixResult = await page.evaluate(() => {
      const b = document.body.innerText.toLowerCase();
      const msgEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS"], .wixui-form__message');
      return {
        hasSuccessText: b.includes('thank you') || b.includes('thanks for submitting') || b.includes('received'),
        msgText: msgEl ? msgEl.innerText : null
      };
    });
    console.log('4751 Wix result:', wixResult);
    if (wixResult.hasSuccessText || wixResult.msgText) {
      saveResult(4751, 'contacted', `Autofilled & submitted Wix estimate form: "${wixResult.msgText || 'Thank you for submitting'}"`);
    } else {
      saveResult(4751, 'unable_to_reach', 'Wix estimate form submitted; awaiting client callback');
    }
  } catch (e) {
    console.log('4751 err:', e.message);
  }

  await browser.close();
}

run();
