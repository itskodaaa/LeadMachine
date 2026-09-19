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
  stateFull: 'Illinois',
  zip: '60601',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function inspectJVA(browser) {
  console.log('\n--- Inspecting 4016: JVA Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://jvaengineering.com/contact-us-2/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Check if reCAPTCHA script or token is on page
    const recaptcha = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      const hasRecaptchaScript = scripts.some(s => s.includes('recaptcha'));
      const gfields = Array.from(document.querySelectorAll('.g-recaptcha, [data-sitekey], input[name*="recaptcha"]'));
      return { hasRecaptchaScript, gfieldsCount: gfields.length };
    });
    console.log('JVA Recaptcha:', recaptcha);

    // Fill form #0
    await page.evaluate((p) => {
      const nameInput = document.querySelector('input[name="your-name"]');
      const emailInput = document.querySelector('input[name="your-email"]');
      const subjectInput = document.querySelector('input[name="your-subject"]');
      const messageInput = document.querySelector('textarea[name="your-message"]');
      if (nameInput) { nameInput.value = p.fullName; nameInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (emailInput) { emailInput.value = p.email; emailInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (subjectInput) { subjectInput.value = p.subject; subjectInput.dispatchEvent(new Event('input', { bubbles: true })); }
      if (messageInput) { messageInput.value = p.message; messageInput.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE);

    console.log('JVA filled, clicking submit...');
    await page.click('form.wpcf7-form input[type="submit"]');

    await new Promise(r => setTimeout(r, 6000));

    const responseOutput = await page.evaluate(() => {
      const output = document.querySelectorAll('.wpcf7-response-output');
      return Array.from(output).map(o => ({ text: o.innerText, class: o.className, display: window.getComputedStyle(o).display }));
    });
    console.log('JVA WPCF7 response output:', responseOutput);
  } catch (e) {
    console.log('JVA error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectGM(browser) {
  console.log('\n--- Inspecting 4019: GM Consulting Engineers ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://gm-ce.net/?q=contact', { waitUntil: 'networkidle2', timeout: 20000 });
    const captchaInfo = await page.evaluate(() => {
      const captchaTitle = document.querySelector('.captcha .fieldset-legend, #edit-captcha-response')?.closest('.captcha')?.innerText || '';
      const captchaImg = document.querySelector('.captcha img')?.src || '';
      return { captchaTitle: captchaTitle.trim().replace(/\s+/g, ' '), captchaImg };
    });
    console.log('GM Consulting Captcha details:', captchaInfo);
  } catch (e) {
    console.log('GM error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectGenesis(browser) {
  console.log('\n--- Inspecting 4022: Genesis Fortune LLC ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.genesisfortune.com/', { waitUntil: 'networkidle2', timeout: 25000 });
    
    // Check form fields
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      return inputs.map(i => ({ id: i.id, name: i.name, type: i.type, placeholder: i.placeholder, value: i.value }));
    });
    console.log('Genesis form fields:', formFields.filter(f => f.type !== 'hidden'));

    // Fill Wix form
    await page.evaluate((p) => {
      const fn = document.querySelector('input[name="first-name"]');
      const ln = document.querySelector('input[name="last-name"]');
      const em = document.querySelector('input[name="email"]');
      const ph = document.querySelector('input[name="phone"]');
      const addr = document.querySelector('input[name="address"]');
      if (fn) { fn.value = p.firstName; fn.dispatchEvent(new Event('input', { bubbles: true })); }
      if (ln) { ln.value = p.lastName; ln.dispatchEvent(new Event('input', { bubbles: true })); }
      if (em) { em.value = p.email; em.dispatchEvent(new Event('input', { bubbles: true })); }
      if (ph) { ph.value = p.phone; ph.dispatchEvent(new Event('input', { bubbles: true })); }
      if (addr) { addr.value = p.address; addr.dispatchEvent(new Event('input', { bubbles: true })); }
    }, OUTREACH_PROFILE);

    console.log('Genesis filled, submitting...');
    const submitBtn = await page.$('button[data-testid="buttonElement"], form button, button:has-text("Submit")');
    if (submitBtn) {
      await submitBtn.click();
    } else {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
        if (btn) btn.click();
      });
    }

    await new Promise(r => setTimeout(r, 6000));

    const wixFeedback = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="message"], [class*="notification"], [class*="success"], [class*="error"]')).map(el => el.innerText);
      const body = document.body ? document.body.innerText : '';
      return { msgs, hasThanks: body.toLowerCase().includes('thank') || body.toLowerCase().includes('sent') || body.toLowerCase().includes('received') };
    });
    console.log('Genesis Wix feedback:', wixFeedback);
  } catch (e) {
    console.log('Genesis error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectDSquared(browser) {
  console.log('\n--- Inspecting 4020: D Squared Engineering ---');
  const page = await browser.newPage();
  try {
    const res = await page.goto('https://d-squaredengineering.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('D Squared status:', res ? res.status() : 'no res', 'URL:', page.url());
    const bodyText = await page.evaluate(() => document.body ? document.body.innerText.trim().slice(0, 300) : '');
    console.log('D Squared text:', bodyText);
  } catch (e) {
    console.log('D Squared error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectRegosa(browser) {
  console.log('\n--- Inspecting 4017: Regosa Engineering Services Inc. ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://regosabuilders.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Regosa URL:', page.url(), 'Title:', await page.title());
    const text = await page.evaluate(() => document.body ? document.body.innerText.trim().slice(0, 500) : '');
    console.log('Regosa text:', text);
  } catch (e) {
    console.log('Regosa error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectRCG(browser) {
  console.log('\n--- Inspecting 4018: RCG USA ---');
  const page = await browser.newPage();
  try {
    const res = await page.goto('https://rcg-usa.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('RCG status:', res ? res.status() : 'no res', 'URL:', page.url());
  } catch (e) {
    console.log('RCG error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectSRM(browser) {
  console.log('\n--- Inspecting 4021: SRM Mechanical Design ---');
  const page = await browser.newPage();
  try {
    await page.goto('http://srmmech.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('SRM URL:', page.url(), 'Title:', await page.title());
  } catch (e) {
    console.log('SRM error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectREng(browser) {
  console.log('\n--- Inspecting 4024: R Engineering ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://www.rengtech.com/new-page', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('REng contact page URL:', page.url(), 'Title:', await page.title());
    const content = await page.evaluate(() => document.body ? document.body.innerText.trim() : '');
    console.log('REng contact page text:', content);
  } catch (e) {
    console.log('REng error:', e.message);
  } finally {
    await page.close();
  }
}

async function inspectRRR(browser) {
  console.log('\n--- Inspecting 4026: RRR repairs & maintenance corp ---');
  const page = await browser.newPage();
  try {
    await page.goto('https://rrrindustrialrepair.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('RRR URL:', page.url(), 'Title:', await page.title());
    const links = await page.evaluate(() => Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText, href: a.href })));
    console.log('RRR links:', links);
  } catch (e) {
    console.log('RRR error:', e.message);
  } finally {
    await page.close();
  }
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  await inspectJVA(browser);
  await inspectGM(browser);
  await inspectGenesis(browser);
  await inspectDSquared(browser);
  await inspectRegosa(browser);
  await inspectRCG(browser);
  await inspectSRM(browser);
  await inspectREng(browser);
  await inspectRRR(browser);

  await browser.close();
}

run().catch(console.error);
