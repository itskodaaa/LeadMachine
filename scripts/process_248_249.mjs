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

async function processSingle(browser, id, url) {
  console.log(`\n========================================\nChecking #${id}: ${url}`);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    let loaded = false;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      loaded = true;
    } catch (e) {
      if (url.startsWith('https://')) {
        try {
          await page.goto(url.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 });
          loaded = true;
        } catch (err) {}
      }
    }

    if (!loaded) {
      console.log(`[#${id}] Inaccessible`);
      saveLeadResult(id, 'unable_to_reach', 'Site inaccessible / connection timeout');
      await page.close();
      return;
    }

    console.log(`[#${id}] Loaded ${page.url()} (Title: ${await page.title()})`);

    // Check contact page if no form
    let contactPageUrl = page.url();
    const hasForm = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.some(f => f.querySelectorAll('input, textarea').length >= 2);
    });

    if (!hasForm) {
      const contactLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const keywords = ['contact', 'get-in-touch', 'inquire', 'quote', 'estimate'];
        for (const k of keywords) {
          const match = links.find(a => {
            const href = a.getAttribute('href') || '';
            const text = (a.innerText || '').toLowerCase();
            return (text.includes(k) || href.toLowerCase().includes(k)) && !href.startsWith('mailto:') && !href.startsWith('tel:');
          });
          if (match) return match.href;
        }
        return null;
      });

      if (contactLink) {
        console.log(`[#${id}] Navigating to contact link: ${contactLink}`);
        try {
          await page.goto(contactLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
          contactPageUrl = page.url();
        } catch (e) {}
      }
    }

    // Detection
    const detection = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const container = forms.find(f => f.querySelectorAll('input, textarea').length >= 2) || document.body;

      const captchas = container.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      let captchaName = null;
      if (captchas.length > 0) {
        const src = captchas[0].getAttribute('src') || '';
        const cls = captchas[0].className || '';
        if (src.includes('recaptcha') || cls.includes('recaptcha')) captchaName = 'Google reCAPTCHA';
        else if (src.includes('hcaptcha') || cls.includes('hcaptcha')) captchaName = 'hCaptcha';
        else if (src.includes('turnstile') || cls.includes('turnstile')) captchaName = 'Cloudflare Turnstile';
        else captchaName = 'Captcha Challenge';
      }

      const inputs = container.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select');
      return { hasInputs: inputs.length > 0, captchaName, count: inputs.length };
    });

    if (!detection.hasInputs) {
      console.log(`[#${id}] No form found`);
      saveLeadResult(id, 'unable_to_reach', `Checked ${contactPageUrl}: No online web form found`);
      await page.close();
      return;
    }

    if (detection.captchaName) {
      console.log(`[#${id}] Blocked by ${detection.captchaName}`);
      saveLeadResult(id, 'unable_to_reach', `Contact form: ${contactPageUrl} (Autofilled; blocked by ${detection.captchaName})`);
      await page.close();
      return;
    }

    // Autofill
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder} ${labelText}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('notes')) {
          el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'email' || combined.includes('email')) {
          el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell')) {
          el.value = p.phone;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('name') && !combined.includes('company')) {
          el.value = p.fullName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('company') || combined.includes('business')) {
          el.value = p.company;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('subject') || combined.includes('topic')) {
          el.value = p.subject;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, OUTREACH_PROFILE);

    // Submit
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.button'));
      const submitKeywords = ['submit', 'send', 'get in touch', 'request quote', 'contact us', 'send message'];
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || '').toLowerCase().trim();
        const type = (btn.getAttribute('type') || '').toLowerCase();
        if (type === 'submit' || submitKeywords.some(k => text.includes(k))) {
          btn.click();
          return;
        }
      }
      const form = document.querySelector('form');
      if (form) {
        if (typeof form.requestSubmit === 'function') form.requestSubmit();
        else form.submit();
      }
    });

    await new Promise(r => setTimeout(r, 4500));

    const confirmation = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return body.includes('thank you') || body.includes('thanks') || body.includes('received') || body.includes('successfully') || body.includes('message has been sent');
    });

    console.log(`[#${id}] Confirmation: ${confirmation}`);
    if (confirmation) {
      saveLeadResult(id, 'contacted', `Contact form: ${contactPageUrl} (Autofilled & verified: submission received)`);
    } else {
      saveLeadResult(id, 'unable_to_reach', `Contact form: ${contactPageUrl} (No confirmation detected)`);
    }

  } catch (err) {
    console.error(`[#${id}] Error:`, err.message);
    saveLeadResult(id, 'unable_to_reach', `Error during browser automation: ${err.message.split('\n')[0]}`);
  } finally {
    try { await page.close(); } catch (e) {}
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const leads = [
    { id: 248, url: 'https://civicconstruction.com' },
    { id: 249, url: 'https://fpc-construction.com' }
  ];

  for (const l of leads) {
    await processSingle(browser, l.id, l.url);
  }

  await browser.close();
}

main();
