import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you!'
};

async function testJRH(browser) {
  console.log('\n--- Testing #3596 JRH Engineering ---');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.jrhengineering.net/contact-us', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect fields and labels
    const fieldInfo = await page.evaluate(() => {
      const form = document.querySelectorAll('form')[4] || document.querySelector('form');
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      return inputs.map(el => {
        const label = el.closest('label')?.innerText || el.closest('div')?.querySelector('label')?.innerText || el.placeholder || el.getAttribute('aria-label') || '';
        return { tag: el.tagName, type: el.type, id: el.id, name: el.name, placeholder: el.placeholder, label };
      });
    });
    console.log('JRH Form fields:', JSON.stringify(fieldInfo, null, 2));

    // Fill form
    await page.evaluate((p) => {
      const form = document.querySelectorAll('form')[4] || document.querySelector('form');
      const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      
      for (const el of inputs) {
        const id = (el.id || '').toLowerCase();
        const placeholder = (el.placeholder || '').toLowerCase();
        const label = (el.closest('label')?.innerText || el.closest('div')?.querySelector('label')?.innerText || '').toLowerCase();
        const full = `${id} ${placeholder} ${label}`;

        if (el.tagName.toLowerCase() === 'textarea' || full.includes('help') || full.includes('message')) {
          el.value = p.message;
        } else if (el.type === 'email' || full.includes('email')) {
          el.value = p.email;
        } else if (full.includes('phone') || el.type === 'tel' || placeholder.includes('xxx')) {
          el.value = p.phone;
        } else if (full.includes('first') || full.includes('fname')) {
          el.value = p.firstName;
        } else if (full.includes('last') || full.includes('lname')) {
          el.value = p.lastName;
        } else if (full.includes('company')) {
          el.value = p.company;
        } else if (full.includes('city')) {
          el.value = p.city;
        } else if (full.includes('state')) {
          el.value = p.state;
        } else if (full.includes('zip')) {
          el.value = p.zip;
        } else if (full.includes('address') || full.includes('street')) {
          el.value = p.address;
        } else {
          // If first input and unnamed, check position
          if (!el.value) {
            el.value = p.fullName;
          }
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    console.log('Filled JRH form. Looking for submit button...');
    const submitBtn = await page.evaluate(() => {
      const form = document.querySelectorAll('form')[4] || document.querySelector('form');
      const btns = Array.from(form.querySelectorAll('button, input[type="submit"], [role="button"]'));
      return btns.map(b => ({ text: b.innerText, type: b.type, id: b.id, className: b.className }));
    });
    console.log('Submit buttons:', submitBtn);

    // Click submit
    await page.evaluate(() => {
      const form = document.querySelectorAll('form')[4] || document.querySelector('form');
      const btn = form.querySelector('button[type="submit"]') || form.querySelector('button') || form.querySelector('input[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    const postSubmit = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .success, .confirmation, .wixui-form__message')).map(e => e.innerText);
      return { textExcerpt: text.slice(0, 500), alerts };
    });
    console.log('Post submit text:', postSubmit);

  } catch (e) {
    console.log('JRH Error:', e.message);
  } finally {
    await page.close();
  }
}

async function testTyndall(browser) {
  console.log('\n--- Testing #3599 Tyndall Engineering ---');
  const page = await browser.newPage();
  try {
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto('https://www.tyndallengineering.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate((p) => {
      document.querySelector('input[name="first_name"]').value = p.firstName;
      document.querySelector('input[name="last_name"]').value = p.lastName;
      document.querySelector('input[name="email_address"]').value = p.email;
      document.querySelector('input[name="phone_number"]').value = p.phone;
      document.querySelector('textarea[name="message"]').value = p.message;

      ['first_name', 'last_name', 'email_address', 'phone_number'].forEach(n => {
        const el = document.querySelector(`input[name="${n}"]`);
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      const txt = document.querySelector('textarea[name="message"]');
      if (txt) {
        txt.dispatchEvent(new Event('input', { bubbles: true }));
        txt.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    console.log('Filled Tyndall form. Submitting...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') || document.querySelector('input[type="submit"]');
      if (btn) btn.click();
      else {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }
    });

    await new Promise(r => setTimeout(r, 5000));

    const postSubmit = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .fusion-form-response-success, .fusion-alert, .alert-success')).map(e => e.innerText);
      return { url: window.location.href, alerts, hasSuccessMsg: text.toLowerCase().includes('thank') || text.toLowerCase().includes('received') };
    });
    console.log('Tyndall post submit:', postSubmit);

  } catch (e) {
    console.log('Tyndall Error:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await testJRH(browser);
  await testTyndall(browser);

  await browser.close();
}

run();
