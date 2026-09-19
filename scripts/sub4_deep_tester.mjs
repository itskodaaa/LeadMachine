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
  message: `Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you.`
};

async function testPepe() {
  console.log('\n--- Testing Lead #4150: Pepe Engineering ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.pepe-engineering.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    
    // Fill Wix form
    const res = await page.evaluate((p) => {
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

      const nameInput = document.getElementById('input_comp-keb8k3qf') || document.querySelector('input[name="name-*"]');
      const emailInput = document.getElementById('input_comp-keb8k3qq') || document.querySelector('input[name="email"]');
      const subjectInput = document.getElementById('input_comp-keb8k3qv') || document.querySelector('input[name="subject"]');
      const msgInput = document.getElementById('textarea_comp-keb8k3qz') || document.querySelector('textarea');

      if (nameInput) setNativeValue(nameInput, p.fullName);
      if (emailInput) setNativeValue(emailInput, p.email);
      if (subjectInput) setNativeValue(subjectInput, p.subject);
      if (msgInput) setNativeValue(msgInput, p.message);

      return {
        name: nameInput?.value,
        email: emailInput?.value,
        subject: subjectInput?.value,
        msg: msgInput?.value
      };
    }, PROFILE);

    console.log('Pepe filled:', res);
    await new Promise(r => setTimeout(r, 1000));

    // Click submit
    const submitClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const sub = btns.find(b => /submit|send/i.test(b.innerText || ''));
      if (sub) {
        sub.scrollIntoView();
        sub.click();
        return sub.innerText;
      }
      return null;
    });
    console.log('Pepe submit clicked:', submitClicked);
    await new Promise(r => setTimeout(r, 6000));

    const checkRes = await page.evaluate(() => {
      return {
        text: document.body.innerText.slice(0, 1000),
        messages: Array.from(document.querySelectorAll('[data-testid="form-message"], [class*="message"], [role="alert"]')).map(m => m.innerText)
      };
    });
    console.log('Pepe result messages:', checkRes.messages);
    if (/thank/i.test(checkRes.text) || checkRes.messages.some(m => /thank|sent|submit/i.test(m))) {
      console.log('PEPE CONFIRMED!');
    }
  } catch (e) {
    console.log('Pepe error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testJarvis() {
  console.log('\n--- Testing Lead #4152: Jarvis Civil Engineering ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.jarvisciveng.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    const res = await page.evaluate((p) => {
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

      const nameInput = document.getElementById('input_comp-ktvqke2h1') || document.querySelector('input[name="name"]');
      const emailInput = document.getElementById('input_comp-ktvqke2t') || document.querySelector('input[name="email"]');
      const phoneInput = document.getElementById('input_comp-ktvqoud3') || document.querySelector('input[name="phone"]');
      const msgInput = document.getElementById('textarea_comp-ktvqke2u2') || document.querySelector('textarea');
      const checkbox = document.querySelector('input[type="checkbox"]');

      if (nameInput) setNativeValue(nameInput, p.fullName);
      if (emailInput) setNativeValue(emailInput, p.email);
      if (phoneInput) setNativeValue(phoneInput, p.phone);
      if (msgInput) setNativeValue(msgInput, p.message);
      if (checkbox) {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        checkbox.click();
      }

      return {
        name: nameInput?.value,
        email: emailInput?.value,
        phone: phoneInput?.value,
        msg: msgInput?.value,
        checkboxChecked: checkbox?.checked
      };
    }, PROFILE);

    console.log('Jarvis filled:', res);
    await new Promise(r => setTimeout(r, 1000));

    const submitClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const sub = btns.find(b => /submit|send/i.test(b.innerText || ''));
      if (sub) {
        sub.scrollIntoView();
        sub.click();
        return sub.innerText;
      }
      return null;
    });
    console.log('Jarvis submit clicked:', submitClicked);
    await new Promise(r => setTimeout(r, 6000));

    const checkRes = await page.evaluate(() => {
      return {
        text: document.body.innerText.slice(0, 1000),
        messages: Array.from(document.querySelectorAll('[data-testid="form-message"], [class*="message"], [role="alert"]')).map(m => m.innerText)
      };
    });
    console.log('Jarvis result messages:', checkRes.messages);
    if (/thank/i.test(checkRes.text) || checkRes.messages.some(m => /thank|sent|submit/i.test(m))) {
      console.log('JARVIS CONFIRMED!');
    }
  } catch (e) {
    console.log('Jarvis error:', e.message);
  } finally {
    await browser.close();
  }
}

async function testMezga() {
  console.log('\n--- Testing Lead #4156: MEZGA Consulting Engineering ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://mezgaconsulting.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.type('#email_form_field_480506', PROFILE.fullName);
    await page.type('#email_form_field_480507', PROFILE.email);
    await page.type('#email_form_field_480508', PROFILE.phone);
    await page.type('#email_form_field_480509', PROFILE.message);

    console.log('Mezga form typed. Submitting...');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.click('input[type="submit"]')
    ]);

    await new Promise(r => setTimeout(r, 3000));
    console.log('Mezga page URL after submit:', page.url());
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Mezga body text snippet:', bodyText.slice(0, 500));
  } catch (e) {
    console.log('Mezga error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await testPepe();
  await testJarvis();
  await testMezga();
}

main();
