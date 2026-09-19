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

const SUCCESS_SIGNALS = [
  'thank you',
  'thanks for contacting',
  'thanks for reaching out',
  'message has been sent',
  'we have received your',
  'we will contact you',
  'will get back to you',
  'submission was successful',
  'submitted successfully',
  'in touch shortly',
  'inquiry received',
  'form received',
  'successfully submitted',
  'your message was sent',
  'we will be in touch',
  'sent successfully'
];

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

function normalizeUrl(url) {
  if (!url) return null;
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

async function processLeadRobust(lead) {
  const rawUrl = normalizeUrl(lead.website);
  console.log(`\n========================================\n[Agent-5] 🌐 Checking: #${lead.id} ${lead.company_name} (${rawUrl})`);
  
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_BIN,
      headless: 'new',
      timeout: 30000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,800']
    });
  } catch (err) {
    console.error(`Browser launch error for #${lead.id}:`, err.message);
    saveLeadResult(lead.id, 'unable_to_reach', `Browser launch error: ${err.message}`);
    return;
  }

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    let loaded = false;
    try {
      await page.goto(rawUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      loaded = true;
    } catch (e) {
      if (rawUrl.startsWith('https://')) {
        try {
          await page.goto(rawUrl.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 15000 });
          loaded = true;
        } catch (err) {}
      }
    }

    if (!loaded) {
      console.log(`[Agent-5] ❌ #${lead.id} Inaccessible`);
      saveLeadResult(lead.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
      await browser.close();
      return;
    }

    // Check WAF
    const pageTitle = (await page.title()).toLowerCase();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (pageTitle.includes('attention required') || pageTitle.includes('just a moment') || bodyText.includes('checking your browser')) {
      console.log(`[Agent-5] ⚠️ #${lead.id} Security WAF Block`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: Blocked by Security WAF`);
      await browser.close();
      return;
    }

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
      console.log(`[Agent-5] ℹ️ #${lead.id} No form found`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${contactPageUrl}: No online web form found`);
      await browser.close();
      return;
    }

    if (detection.captchaName) {
      console.log(`[Agent-5] ⚠️ #${lead.id} Captcha: ${detection.captchaName}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (Autofilled; blocked by ${detection.captchaName})`);
      await browser.close();
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

    const verification = await page.evaluate((signals) => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      for (const sig of signals) {
        if (body.includes(sig)) {
          return { isSuccess: true, phrase: sig };
        }
      }
      return { isSuccess: false };
    }, SUCCESS_SIGNALS);

    if (verification.isSuccess) {
      console.log(`[Agent-5] ✅ #${lead.id} SUBMISSION CONFIRMED: "${verification.phrase}"`);
      saveLeadResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Autofilled & verified: ${verification.phrase})`);
    } else {
      console.log(`[Agent-5] ⚠️ #${lead.id} Unconfirmed`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (No explicit confirmation detected post-submission)`);
    }

  } catch (err) {
    console.error(`[Agent-5] ❌ #${lead.id} Error:`, err.message);
    saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${err.message.split('\n')[0]}`);
  } finally {
    try { await browser.close(); } catch (e) {}
  }
}

async function main() {
  const leadIds = [334, 336, 344, 346, 347, 348, 349];
  const placeholders = leadIds.map(() => '?').join(',');
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

  for (const lead of leads) {
    await processLeadRobust(lead);
  }

  console.log('\nAll remaining Batch 5 leads processed!');
}

main();
