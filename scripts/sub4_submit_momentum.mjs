import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you.'
};

async function submitMomentum() {
  console.log('--- Testing Lead #4157: Momentum Structural Engineering ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://msetexas.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    console.log('Current URL:', page.url());

    // Fill form
    const fillResult = await page.evaluate((p) => {
      function setNativeValue(element, value) {
        const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
        const prototype = Object.getPrototypeOf(element);
        const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
        if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
          prototypeValueSetter.call(element, value);
        } else if (valueSetter) {
          valueSetter.call(element, value);
        } else {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const nameEl = document.querySelector('input[name="full-name"]') || document.querySelector('input[placeholder*="Name" i]');
      const phoneEl = document.querySelector('input[name="phone-number"]') || document.querySelector('input[type="tel"]');
      const emailEl = document.querySelector('input[name="email"]') || document.querySelector('input[type="email"]');
      const addressEl = document.querySelector('input[name="address"]') || document.querySelector('input[placeholder*="Address" i]');
      const msgEl = document.querySelector('textarea');

      if (nameEl) setNativeValue(nameEl, p.fullName);
      if (phoneEl) setNativeValue(phoneEl, p.phone);
      if (emailEl) setNativeValue(emailEl, p.email);
      if (addressEl) setNativeValue(addressEl, p.address);
      if (msgEl) setNativeValue(msgEl, p.message);

      return {
        name: nameEl?.value,
        phone: phoneEl?.value,
        email: emailEl?.value,
        address: addressEl?.value,
        msg: msgEl?.value
      };
    }, PROFILE);

    console.log('Filled data:', fillResult);
    await new Promise(r => setTimeout(r, 1500));

    // Find submit button and click
    const submitBtnText = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('form button, form input[type="submit"], form [role="button"]'));
      const sub = btns.find(b => /submit|send|request/i.test(b.innerText || b.value || ''));
      if (sub) {
        sub.scrollIntoView();
        sub.click();
        return sub.innerText || sub.value;
      }
      return null;
    });
    console.log('Clicked submit button:', submitBtnText);

    await new Promise(r => setTimeout(r, 6000));

    const check = await page.evaluate(() => {
      return {
        url: window.location.href,
        textSnippet: document.body.innerText.slice(0, 1500)
      };
    });
    console.log('Result text snippet:', check.textSnippet);
    if (/thank|received|sent|success/i.test(check.textSnippet)) {
      console.log('MOMENTUM CONFIRMED SUCCESSFUL!');
      const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
      const note = `Contact form: https://msetexas.com/ (Autofilled request form & verified submission)`;
      db.transaction(() => {
        updateStmt.run(note, 'contacted', 4157);
        logStmt.run(4157, 'sent', note);
      })();
    }
  } catch (e) {
    console.error('Error submitting Momentum:', e.message);
  } finally {
    await browser.close();
  }
}

submitMomentum();
