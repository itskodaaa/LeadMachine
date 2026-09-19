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
  'sent successfully',
  'request received',
  'quote requested'
];

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  let cleanBase = current?.notes || '';
  if (cleanBase.includes(' | ')) {
    cleanBase = cleanBase.split(' | ')[0];
  }
  const finalNotes = cleanBase ? cleanBase + ' | ' + note : note;

  db.transaction(() => {
    updateStmt.run(finalNotes, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function safeClose(page) {
  try {
    await Promise.race([
      page.close({ runBeforeUnload: false }),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  } catch (e) {}
}

const TARGETS = [
  {
    id: 574,
    company: 'Gil Engineering Associates Inc',
    urls: ['http://www.gilengineering.com/contact/', 'http://www.gilengineering.com/']
  },
  {
    id: 575,
    company: 'Rodriguez Engineering Laboratories LLC',
    urls: ['https://rodriguezengineeringlaboratories.com/get-in-touch', 'https://rodriguezengineeringlaboratories.com/']
  },
  {
    id: 578,
    company: 'Nazareth Civil',
    urls: ['https://www.nazarethcivil.com/contact-us/', 'https://www.nazarethcivil.com/']
  },
  {
    id: 570,
    company: 'Entech Civil Engineers, Inc.',
    urls: ['https://www.entechcivilengineers.com/contact/', 'https://www.entechcivilengineers.com/']
  },
  {
    id: 572,
    company: 'B2Z Engineering',
    urls: ['https://b2zeng.com/contact/', 'https://b2zeng.com/']
  },
  {
    id: 576,
    company: 'Structural Engineering & Construction',
    urls: ['https://310991samy.com/contact/', 'https://310991samy.com/']
  },
  {
    id: 579,
    company: 'Saiful Bouquet Structural Engineers',
    urls: ['https://www.saifulbouquet.com/contact/get-in-touch/', 'https://www.saifulbouquet.com/']
  },
  {
    id: 573,
    company: 'Alamo Elite Engineers',
    urls: ['https://www.alamoeliteengineers.com/contact-us', 'https://www.alamoeliteengineers.com/']
  }
];

async function runPrecision() {
  console.log('Starting Precision Chromium instance for Batch 4 targets...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    timeout: 60000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1280,800'
    ]
  });

  const summary = [];

  for (const t of TARGETS) {
    console.log(`\n==================================================`);
    console.log(`🎯 Processing Lead #${t.id}: ${t.company}`);
    const t0 = Date.now();
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    let loadedUrl = null;
    for (const u of t.urls) {
      try {
        console.log(`Navigating to ${u}...`);
        await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 16000 });
        loadedUrl = page.url();
        console.log(`Loaded: ${loadedUrl}`);
        break;
      } catch (e) {
        console.log(`Failed navigating to ${u}: ${e.message}`);
      }
    }

    if (!loadedUrl) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`❌ #${t.id} Inaccessible`);
      saveLeadResult(t.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
      await safeClose(page);
      summary.push({ id: t.id, company: t.company, status: 'unable_to_reach', time: elapsed, result: 'Site Inaccessible' });
      continue;
    }

    // Wait a brief moment for dynamic elements
    await new Promise(r => setTimeout(r, 2000));

    // Form & Captcha detection
    const detection = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const form = forms.find(f => f.querySelectorAll('input, textarea').length >= 2) || document.body;

      const captchas = form.querySelectorAll('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .cf-turnstile, [data-sitekey]');
      let captchaName = null;
      if (captchas.length > 0) {
        const src = captchas[0].getAttribute('src') || '';
        const cls = captchas[0].className || '';
        if (src.includes('recaptcha') || cls.includes('recaptcha')) captchaName = 'Google reCAPTCHA';
        else if (src.includes('hcaptcha') || cls.includes('hcaptcha')) captchaName = 'hCaptcha';
        else if (src.includes('turnstile') || cls.includes('turnstile')) captchaName = 'Cloudflare Turnstile';
        else captchaName = 'CAPTCHA challenge';
      }

      const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea');
      return {
        hasInputs: inputs.length >= 2,
        inputCount: inputs.length,
        captchaName
      };
    });

    console.log(`Detection: inputs=${detection.inputCount}, captcha=${detection.captchaName}`);

    if (!detection.hasInputs) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`ℹ️ #${t.id} No online web form found`);
      saveLeadResult(t.id, 'unable_to_reach', `Checked ${loadedUrl}: No online web form found (Direct phone/email contact only)`);
      await safeClose(page);
      summary.push({ id: t.id, company: t.company, status: 'unable_to_reach', time: elapsed, result: 'No online web form found' });
      continue;
    }

    if (detection.captchaName) {
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`⚠️ #${t.id} Blocked by ${detection.captchaName}`);
      saveLeadResult(t.id, 'unable_to_reach', `Contact form: ${loadedUrl} (Autofilled; blocked by ${detection.captchaName})`);
      await safeClose(page);
      summary.push({ id: t.id, company: t.company, status: 'unable_to_reach', time: elapsed, result: `Blocked by ${detection.captchaName}` });
      continue;
    }

    // Populate Pamela Jameson's profile
    console.log(`Autofilling outreach profile for #${t.id}...`);
    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder} ${labelText}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description') || combined.includes('notes')) {
          el.value = p.message;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
          el.value = p.email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (type === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
          el.value = p.phone;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('first') || combined.includes('fname')) {
          el.value = p.firstName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('last') || combined.includes('lname')) {
          el.value = p.lastName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('name') && !combined.includes('company')) {
          el.value = p.fullName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
          el.value = p.company;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (combined.includes('subject') || combined.includes('topic') || combined.includes('title')) {
          el.value = p.subject;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }, OUTREACH_PROFILE);

    // Submit
    console.log(`Submitting form for #${t.id}...`);
    const initialUrl = page.url();
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

    // Verification wait
    await new Promise(r => setTimeout(r, 6000));

    const verification = await page.evaluate((signals, initUrl) => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      const current = window.location.href;
      const urlChanged = current !== initUrl && !current.includes('#');

      const successContainers = document.querySelectorAll(
        '.wixui-form__message, .form-submission-message, .sqs-form-submitted, ' +
        '.wpcf7-response-output, .wpcf7-mail-sent-ok, .gform_confirmation_message, ' +
        '.elementor-message-success, [data-testid="form-submitted"], [role="alert"], ' +
        '.alert-success, .success-message, .submitted-message, .w-form-done, .w-form-done div'
      );

      for (const el of successContainers) {
        const txt = (el.innerText || '').toLowerCase();
        for (const sig of signals) {
          if (txt.includes(sig)) {
            return { isSuccess: true, phrase: `Element [${el.className}]: "${txt.trim().replace(/\s+/g, ' ')}"` };
          }
        }
      }

      for (const sig of signals) {
        if (body.includes(sig)) {
          return { isSuccess: true, phrase: sig };
        }
      }

      if (urlChanged && (current.includes('thank') || current.includes('success') || current.includes('confirm'))) {
        return { isSuccess: true, phrase: 'Redirected to confirmation page: ' + current };
      }

      return { isSuccess: false };
    }, SUCCESS_SIGNALS, initialUrl);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    if (verification.isSuccess) {
      console.log(`✅ #${t.id} SUBMISSION CONFIRMED: "${verification.phrase}" (${elapsed}s)`);
      saveLeadResult(t.id, 'contacted', `Contact form: ${loadedUrl} (Autofilled & verified: ${verification.phrase})`);
      summary.push({ id: t.id, company: t.company, status: 'contacted', time: elapsed, result: `Confirmed: ${verification.phrase}` });
    } else {
      console.log(`⚠️ #${t.id} Form submitted but no explicit confirmation signal detected (${elapsed}s)`);
      saveLeadResult(t.id, 'unable_to_reach', `Contact form: ${loadedUrl} (Form submitted; no explicit confirmation detected)`);
      summary.push({ id: t.id, company: t.company, status: 'unable_to_reach', time: elapsed, result: 'No confirmation signal' });
    }

    await safeClose(page);
  }

  await browser.close();

  console.log('\n================ PRECISION SUMMARY ================');
  console.table(summary);
}

runPrecision().catch(console.error);
