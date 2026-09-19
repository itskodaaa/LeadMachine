import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function test() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://psinternationalsupply.net/', { waitUntil: 'networkidle2', timeout: 30000 });

    // Click contact us or scroll to form
    await page.evaluate(() => {
      const form = document.querySelectorAll('form')[1];
      if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    await new Promise(r => setTimeout(r, 1000));

    // Get input elements
    const inputs = await page.$$('form:nth-of-type(2) input[type="text"], form:nth-of-type(2) textarea');
    console.log('Found inputs in form 2:', inputs.length);

    // Click and type using puppeteer keyboard
    if (inputs.length >= 3) {
      // inputs[0] is _app_id (hidden-like or first text)
      // let's check which is Name and which is Email
      for (const input of inputs) {
        const info = await page.evaluate(el => ({
          id: el.id,
          name: el.name,
          placeholder: el.placeholder,
          ariaLabel: el.getAttribute('aria-label'),
          tag: el.tagName
        }), input);
        console.log('Field info:', info);
      }
    }

    // Use native prototype value setter for React GoDaddy form
    await page.evaluate(() => {
      function setNativeValue(element, value) {
        const proto = element.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        valueSetter.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const form = document.querySelectorAll('form')[1];
      const nameInput = form.querySelector('input[id*="input45"], input[aria-label*="Name"]') || form.querySelectorAll('input[type="text"]')[1];
      const emailInput = form.querySelector('input[id*="input46"], input[aria-label*="Email"]') || form.querySelectorAll('input[type="text"]')[2];
      const msgInput = form.querySelector('textarea');

      if (nameInput) setNativeValue(nameInput, 'Pamela Jameson');
      if (emailInput) setNativeValue(emailInput, 'pamela.jameson@nortiheastprecision.com');
      if (msgInput) setNativeValue(msgInput, 'Hello, I am reaching out to express our interest in your sheet metal fabrication services and would appreciate the opportunity to explore a potential business relationship. Kindly contact us at your earliest convenience.');
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking Send...');
    await page.evaluate(() => {
      const form = document.querySelectorAll('form')[1];
      const btn = form.querySelector('button, input[type="submit"]');
      if (btn) btn.click();
    });

    console.log('Waiting 7 seconds for response...');
    await new Promise(r => setTimeout(r, 7000));

    const result = await page.evaluate(() => {
      const form = document.querySelectorAll('form')[1];
      const alerts = Array.from(document.querySelectorAll('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS"], [role="alert"], [class*="notification"], [class*="success"]')).map(el => el.innerText);
      const formText = form ? form.innerText : '';
      return { alerts, formText };
    });

    console.log('Result for #1847:', result);

    if (result.formText.includes('Thank') || result.alerts.some(a => /thank/i.test(a))) {
      const note = `Contact form: https://psinternationalsupply.net/ (Autofilled & verified: ${result.alerts.join(' ') || result.formText})`;
      db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(note, 'contacted', 1847);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(1847, 'sent', note);
      console.log('Updated DB for #1847: contacted');
    }

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    await browser.close();
  }
}

test();
