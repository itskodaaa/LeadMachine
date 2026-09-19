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

async function testPCE() {
  console.log('\n================ testing #3311 PCE ================');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.goto('https://pce-az.com/contact', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  // Dismiss cookie banner if any
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const acc = btns.find(b => b.innerText.includes('Accept'));
    if (acc) acc.click();
  });

  page.on('request', req => {
    if (req.method() === 'POST') console.log(`PCE Request POST: ${req.url()} [payload: ${req.postData()?.slice(0, 100)}]`);
  });
  page.on('response', async resp => {
    if (resp.request().method() === 'POST' || resp.url().includes('contact') || resp.url().includes('api')) {
      try {
        console.log(`PCE Response [${resp.status()}]: ${resp.url()} -> ${(await resp.text()).slice(0, 200)}`);
      } catch (_) {}
    }
  });

  await page.type('input[name="name"]', OUTREACH_PROFILE.fullName);
  await page.type('input[name="email"]', OUTREACH_PROFILE.email);
  await page.type('input[name="phone"]', OUTREACH_PROFILE.phone);
  await page.type('input[name="company"]', OUTREACH_PROFILE.company);

  // Check service field
  const serviceDetails = await page.evaluate(() => {
    const s = document.querySelector('select[name="service"], select');
    const b = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('service'));
    return {
      hasSelect: !!s,
      selectOptions: s ? Array.from(s.options).map(o => o.text) : null,
      buttonText: b ? b.innerText : null
    };
  });
  console.log('Service details:', serviceDetails);

  if (serviceDetails.hasSelect) {
    await page.select('select', 'Consultation Services');
  }

  await page.type('textarea[name="message"]', OUTREACH_PROFILE.message);

  console.log('Clicking Send Message button...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Send Message'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 5000));
  const postSubmitText = await page.evaluate(() => {
    const form = document.querySelector('form');
    return {
      formText: form ? form.innerText : null,
      alerts: Array.from(document.querySelectorAll('[role="alert"], .alert, .success, p, h3, h4'))
        .map(e => e.innerText.trim())
        .filter(t => /thank|received|sent|success|fail|error/i.test(t))
    };
  });
  console.log('Post submit text:', postSubmitText);

  await browser.close();
}

async function testCEI() {
  console.log('\n================ testing #3314 CEI ================');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.goto('https://cei-az.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  const formMeta = await page.evaluate(() => {
    const f = document.querySelector('form[action*="contact"], form');
    return {
      action: f?.action,
      method: f?.method,
      html: f?.outerHTML.slice(0, 500)
    };
  });
  console.log('CEI Form Meta:', formMeta);

  page.on('request', req => {
    if (req.method() === 'POST') console.log(`CEI Request POST: ${req.url()} [data: ${req.postData()}]`);
  });
  page.on('response', async resp => {
    if (resp.request().method() === 'POST' || resp.url().includes('contact')) {
      try {
        console.log(`CEI Response [${resp.status()}]: ${resp.url()} -> ${(await resp.text()).slice(0, 300)}`);
      } catch (_) {}
    }
  });

  await page.type('input[name="contact_name"]', OUTREACH_PROFILE.fullName);
  await page.type('input[name="contact_email"]', OUTREACH_PROFILE.email);
  await page.type('input[name="contact_subject"]', OUTREACH_PROFILE.subject);
  await page.type('textarea[name="contact_comment"]', OUTREACH_PROFILE.message);

  console.log('Submitting CEI form...');
  await page.evaluate(() => {
    const f = document.querySelector('form');
    if (f) {
      const btn = f.querySelector('input[type="submit"]');
      if (btn) btn.click();
      else f.submit();
    }
  });

  await new Promise(r => setTimeout(r, 5000));
  const ceiText = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*'))
      .map(e => e.innerText ? e.innerText.trim() : '')
      .filter(t => /thank|message|sent|received|error|fail/i.test(t) && t.length < 150);
  });
  console.log('CEI post-submit texts:', ceiText);

  await browser.close();
}

async function testAssured() {
  console.log('\n================ testing #3317 Assured Engineering ================');
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.goto('https://assuredeng.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  page.on('request', req => {
    if (req.method() === 'POST') console.log(`Assured Request POST: ${req.url()} [data: ${req.postData()?.slice(0, 100)}]`);
  });
  page.on('response', async resp => {
    if (resp.request().method() === 'POST' || resp.url().includes('contact') || resp.url().includes('api')) {
      try {
        console.log(`Assured Response [${resp.status()}]: ${resp.url()} -> ${(await resp.text()).slice(0, 300)}`);
      } catch (_) {}
    }
  });

  // Check captcha on Assured
  const captchaCheck = await page.evaluate(() => {
    const captchas = document.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], [data-sitekey]');
    return { count: captchas.length, htmls: Array.from(captchas).map(c => c.outerHTML) };
  });
  console.log('Assured Captchas:', captchaCheck);

  const nameInput = await page.$('input[data-aid="CONTACT_FORM_NAME"], #input1');
  const emailInput = await page.$('input[data-aid="CONTACT_FORM_EMAIL"], #input2');
  const msgInput = await page.$('textarea[data-aid="CONTACT_FORM_MESSAGE"], textarea');

  if (nameInput && emailInput && msgInput) {
    await nameInput.click();
    await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 30 });
    await emailInput.click();
    await emailInput.type(OUTREACH_PROFILE.email, { delay: 30 });
    await msgInput.click();
    await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Clicking SEND button...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'SEND');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 5000));

    const result = await page.evaluate(() => {
      const allText = document.body.innerText;
      const elements = Array.from(document.querySelectorAll('[data-aid*="CONFIRM"], [data-aid*="SUCCESS"], [data-aid*="MESSAGE"], [role="status"], [role="alert"], div, p, span'))
        .map(e => e.innerText.trim())
        .filter(t => /thank|sent|success|message|received/i.test(t) && t.length < 200 && !t.includes('Excellence in engineering'));
      return { elements: Array.from(new Set(elements)), snippet: allText.slice(0, 500) };
    });
    console.log('Assured post-submit result:', result);
  }

  await browser.close();
}

async function main() {
  await testPCE();
  await testCEI();
  await testAssured();
}

main();
