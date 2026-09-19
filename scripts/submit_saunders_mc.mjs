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

  // 1. Lead #2535: Saunders Construction Inc.
  try {
    console.log('\n--- Submitting Lead #2535 Saunders Construction Inc. ---');
    const page = await browser.newPage();
    await page.goto('https://www.saundersinc.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate((profile) => {
      const f1 = document.querySelector('#input_1_7_3');
      const f2 = document.querySelector('#input_1_7_6');
      const f3 = document.querySelector('#input_1_3');
      const f4 = document.querySelector('#input_1_4');
      const f5 = document.querySelector('#input_1_6');
      const f6 = document.querySelector('#input_1_5');

      if (f1) f1.value = profile.first;
      if (f2) f2.value = profile.last;
      if (f3) f3.value = profile.email;
      if (f4) f4.value = profile.phone;
      if (f5) f5.value = 'Collaboration';
      if (f6) f6.value = profile.message;

      // trigger input events
      [f1, f2, f3, f4, f5, f6].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, OUTREACH);

    console.log('Clicking Saunders Gravity Form submit button via evaluate...');
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('#gform_submit_button_1');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Saunders clicked:', clicked);

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const confEl = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message');
        const text = document.body.innerText;
        return {
          confText: confEl ? confEl.innerText : null,
          hasSuccess: /thank you for contacting|received your message|we will be in touch/i.test(text)
        };
      });
      if (res.confText || res.hasSuccess) {
        console.log(`Saunders confirmed at sec ${i+1}:`, res);
        commitStatus(2535, 'contacted', `Confirmed: Gravity Form submitted on saundersinc.com/contact/ (${res.confText || 'Thank you'})`);
        break;
      }
    }
    await page.close();
  } catch (e) {
    console.error('Saunders error:', e.message);
  }

  // 2. Lead #2538: M&C Construction, LLC
  try {
    console.log('\n--- Submitting Lead #2538 M&C Construction, LLC ---');
    const page = await browser.newPage();
    await page.goto('https://www.mendelandcompany.com/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate((profile) => {
      const f1 = document.querySelector('#pwebcontact133_field-firstname');
      const f2 = document.querySelector('#pwebcontact133_field-lastname');
      const f3 = document.querySelector('#pwebcontact133_field-companyname');
      const f4 = document.querySelector('#pwebcontact133_field-phone');
      const f5 = document.querySelector('#pwebcontact133_field-email');
      const f6 = document.querySelector('#pwebcontact133_field-whereisyourprojectlocated');
      const f7 = document.querySelector('#pwebcontact133_field-describeyourproject');
      const f8 = document.querySelector('#pwebcontact133_field-doyouhavefunding');

      if (f1) f1.value = profile.first;
      if (f2) f2.value = profile.last;
      if (f3) f3.value = profile.company;
      if (f4) f4.value = profile.phone;
      if (f5) f5.value = profile.email;
      if (f6) f6.value = 'Denver, CO';
      if (f7) f7.value = profile.message;
      if (f8) f8.value = 'Yes';

      [f1, f2, f3, f4, f5, f6, f7, f8].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }, OUTREACH);

    console.log('Clicking M&C send button...');
    const clickedMC = await page.evaluate(() => {
      const btn = document.querySelector('#pwebcontact133_send');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('M&C clicked:', clickedMC);

    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const res = await page.evaluate(() => {
        const msgEl = document.querySelector('.pwebcontact-msg-success, .pwebcontact-msg, [class*="success"]');
        const text = document.body.innerText;
        return {
          msgText: msgEl ? msgEl.innerText : null,
          hasSuccess: /thank you|received|sent successfully|message has been sent/i.test(text)
        };
      });
      if (res.msgText || res.hasSuccess) {
        console.log(`M&C confirmed at sec ${i+1}:`, res);
        commitStatus(2538, 'contacted', `Confirmed: Form submitted on mendelandcompany.com/contact-us (${res.msgText || 'Success'})`);
        break;
      }
    }
    await page.close();
  } catch (e) {
    console.error('M&C error:', e.message);
  }

  await browser.close();
  console.log('Completed submission for Saunders and M&C.');
}

run();
