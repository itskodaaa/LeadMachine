import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

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
  message: 'Hello, I am reaching out to express our interest in your precision machining and custom fabrication services. Please arrange for a representative to contact us regarding collaboration and upcoming project quotes. Thank you, Pamela Jameson.'
};

async function test4606() {
  console.log('\n--- 4606 Capitol Company ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.capitolcompany.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(i => ({
        name: i.name, id: i.id, type: i.type, placeholder: i.placeholder,
        label: i.closest('div')?.innerText?.slice(0, 50) || ''
      }));
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]')).map(b => ({
        tag: b.tagName, text: b.innerText, type: b.getAttribute('type'), cls: b.className
      }));
      return { action: form.action, inputs, buttons };
    });
    console.log('Form 4606 info:', JSON.stringify(formInfo, null, 2));

    // Fill form
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
      for (const input of inputs) {
        const txt = (input.name + ' ' + input.id + ' ' + input.placeholder + ' ' + (input.closest('div')?.innerText || '')).toLowerCase();
        if (txt.includes('name') && !txt.includes('last')) input.value = p.fullName;
        else if (txt.includes('last')) input.value = p.lastName;
        else if (txt.includes('email')) input.value = p.email;
        else if (txt.includes('phone')) input.value = p.phone;
        else if (txt.includes('message') || input.tagName === 'TEXTAREA') input.value = p.message;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    // Submit
    const btn = await page.$('input[type="submit"], form button, [data-aid*="SUBMIT"]');
    console.log('Submit button found:', !!btn);
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 5000));
      const text = await page.evaluate(() => document.body.innerText);
      console.log('Post submit text snippet:', text.slice(0, 400).replace(/\n+/g, ' '));
      const confirmation = await page.evaluate(() => {
        const el = document.querySelector('.form-submission-message, [role="alert"], .alert-success, .success');
        return el ? el.innerText : null;
      });
      console.log('Confirmation el:', confirmation);
    }
  } catch (e) { console.log('Error 4606:', e.message); }
  finally { await browser.close(); }
}

async function test4608() {
  console.log('\n--- 4608 Affinity Metalworks ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.affinitymetalworks.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Find all buttons on page
    const buttons = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, [role="button"], a[class*="button"]')).map(b => ({
        tag: b.tagName,
        text: b.innerText?.trim(),
        ariaLabel: b.getAttribute('aria-label'),
        type: b.getAttribute('type'),
        cls: b.className
      }));
    });
    console.log('Buttons on Affinity:', buttons.filter(b => b.text || b.ariaLabel));

    // Type into the fields
    const fn = await page.$('input[aria-label="First name"]');
    const ln = await page.$('input[aria-label="Last name"]');
    const em = await page.$('input[aria-label="Email"]');
    const ph = await page.$('input[aria-label*="Phone"]');
    const msg = await page.$('textarea[aria-label*="Tell us"]');

    if (fn) await fn.type(PROFILE.firstName, { delay: 15 });
    if (ln) await ln.type(PROFILE.lastName, { delay: 15 });
    if (em) await em.type(PROFILE.email, { delay: 15 });
    if (ph) await ph.type(PROFILE.phone, { delay: 15 });
    if (msg) await msg.type(PROFILE.message, { delay: 10 });

    // Look for button with text "Request a free quote" or similar
    const btn = await page.$('button[aria-label="Request a free quote"], button.wixui-button');
    console.log('Affinity submit button element:', !!btn);
    if (btn) {
      await btn.click();
      await new Promise(r => setTimeout(r, 5000));
      const res = await page.evaluate(() => {
        const alerts = Array.from(document.querySelectorAll('[data-testid="form-submitted"], .wixui-form__message, [role="alert"]')).map(e => e.innerText);
        return { alerts, bodyTail: document.body.innerText.slice(-500).replace(/\n+/g, ' ') };
      });
      console.log('Affinity post submit result:', res);
    }
  } catch (e) { console.log('Error 4608:', e.message); }
  finally { await browser.close(); }
}

async function test4601() {
  console.log('\n--- 4601 Lockhart Metal Services ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://lockhartmetalservice.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Fill visible inputs
    const inputs = await page.$$('form input:not([type="hidden"]):not([style*="display: none"]):not([style*="visibility: hidden"])');
    console.log('Visible inputs count:', inputs.length);
    // In GoDaddy form: index 0 might be the hidden honeypot. Let's find inputs with labels
    await page.evaluate((p) => {
      const labels = Array.from(document.querySelectorAll('label, [data-aid*="LABEL"]'));
      for (const l of labels) {
        const text = l.innerText.toLowerCase();
        const input = l.querySelector('input') || document.getElementById(l.getAttribute('for'));
        if (input) {
          if (text.includes('name')) input.value = p.fullName;
          if (text.includes('email')) input.value = p.email;
          if (text.includes('phone')) input.value = p.phone;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const ta = document.querySelector('form textarea');
      if (ta) {
        ta.value = p.message;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const res = await page.evaluate(() => {
        const notif = document.querySelector('[data-aid*="NOTIFICATION"], [role="alert"]');
        return {
          notifText: notif?.innerText,
          formText: document.querySelector('form')?.innerText.replace(/\n+/g, ' ')
        };
      });
      console.log('Lockhart post-submit:', res);
    }
  } catch (e) { console.log('Error 4601:', e.message); }
  finally { await browser.close(); }
}

async function test4609() {
  console.log('\n--- 4609 K & K Welding LLC ---');
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://kkweldingllc.com/contact-us', { waitUntil: 'networkidle2', timeout: 25000 });
    
    await page.evaluate((p) => {
      const labels = Array.from(document.querySelectorAll('label, [data-aid*="LABEL"]'));
      for (const l of labels) {
        const text = l.innerText.toLowerCase();
        const input = l.querySelector('input') || document.getElementById(l.getAttribute('for'));
        if (input) {
          if (text.includes('name')) input.value = p.fullName;
          if (text.includes('email')) input.value = p.email;
          if (text.includes('phone')) input.value = p.phone;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const ta = document.querySelector('form textarea');
      if (ta) {
        ta.value = p.message;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, PROFILE);

    const submitBtn = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise(r => setTimeout(r, 6000));
      const res = await page.evaluate(() => {
        const notif = document.querySelector('[data-aid*="NOTIFICATION"], [role="alert"]');
        return {
          notifText: notif?.innerText,
          formText: document.querySelector('form')?.innerText.replace(/\n+/g, ' ')
        };
      });
      console.log('KK post-submit:', res);
    }
  } catch (e) { console.log('Error 4609:', e.message); }
  finally { await browser.close(); }
}

async function run() {
  await test4606();
  await test4608();
  await test4601();
  await test4609();
}

run();
