import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';
import { execSync } from 'child_process';

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
  'thanks for submitting',
  'thanks for getting in touch',
  'message has been sent',
  'message was sent',
  'message was successfully sent',
  'message successfully sent',
  'message received',
  'your message was successfully sent',
  'your message has been sent',
  'we have received your',
  'we have received',
  'we will contact you',
  'we will be in touch',
  'we\'ll be in touch',
  'will get back to you',
  'we will get back to you',
  'we\'ll get back to you',
  'submission was successful',
  'submitted successfully',
  'successfully submitted',
  'successfully sent',
  'was successfully sent',
  'in touch shortly',
  'inquiry received',
  'form received',
  'your inquiry has been',
  'your submission has been',
  'request received',
  'quote requested',
  'we appreciate your',
  'message sent',
  'sent! thank you',
  'thank you for getting in touch',
  'submission received',
  'thank you for contacting us',
  'thank you! your submission has been received',
  'has been received',
  'has been sent'
];

const ERROR_SIGNALS = [
  'there was a problem',
  'please fix the errors',
  'invalid captcha',
  'recaptcha verification failed',
  'this field is required',
  'is a required field',
  'please enter a valid',
  'invalid mobile',
  'invalid phone',
  'invalid number',
  'an error occurred while sending',
  'sender blacklisted',
  'forbidden. sender blacklisted',
  'anti-spam by cleantalk',
  'spam detected'
];

function normalizeUrl(url) {
  if (!url) return null;
  let clean = url.trim();
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = 'https://' + clean;
  }
  return clean;
}

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes FROM leads WHERE id = ?');

function saveLeadResult(id, status, note) {
  const current = getStmt.get(id);
  // Never downgrade an already contacted lead
  const targetStatus = (current?.status === 'contacted') ? 'contacted' : status;
  const newNotes = current?.notes ? current.notes + ' | ' + note : note;
  db.transaction(() => {
    updateStmt.run(newNotes, targetStatus, id);
    const action = targetStatus === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function safeClose(page) {
  try {
    await Promise.race([
      page.close({ runBeforeUnload: false }),
      new Promise(resolve => setTimeout(resolve, 2500))
    ]);
  } catch (e) {}
}

async function takeFailureScreenshot(page, leadId, stage) {
  try {
    const cleanStage = stage.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
    const filename = `./screenshots/failures/lead_${leadId}_${cleanStage}.png`;
    try {
      await page.screenshot({ path: filename, fullPage: true });
    } catch (_) {
      await page.screenshot({ path: filename, fullPage: false });
    }
    return filename;
  } catch (e) {
    return null;
  }
}

async function sanitizePage(page) {
  try {
    await page.evaluate(() => {
      const badLinks = document.querySelectorAll('a[href*="mailto:" i], a[href*="tel:" i], a[href*="@" i]');
      for (const a of badLinks) {
        a.removeAttribute('href');
        a.setAttribute('data-sanitized', 'true');
        a.onclick = (e) => { e.preventDefault(); e.stopImmediatePropagation(); return false; };
      }
      const badForms = document.querySelectorAll('form[action*="mailto:" i]');
      for (const f of badForms) {
        f.removeAttribute('action');
        f.onsubmit = (e) => { e.preventDefault(); e.stopImmediatePropagation(); return false; };
      }
      const badOnclicks = document.querySelectorAll('[onclick*="mailto:" i], [onclick*="tel:" i]');
      for (const el of badOnclicks) {
        el.removeAttribute('onclick');
        el.onclick = (e) => { e.preventDefault(); e.stopImmediatePropagation(); return false; };
      }
    });
  } catch (_) {}
}

async function safeNavigate(page, url) {
  if (!url) return false;
  const cleanUrl = url.trim().toLowerCase();
  if (cleanUrl.startsWith('mailto:') || cleanUrl.startsWith('tel:') || cleanUrl.includes('mailto') || cleanUrl.includes('@')) {
    return false;
  }

  const tryUrls = [url];
  if (!url.includes('www.')) {
    tryUrls.push(url.replace('://', '://www.'));
  }
  if (url.startsWith('https://')) {
    tryUrls.push(url.replace('https://', 'http://'));
    if (!url.includes('www.')) {
      tryUrls.push(url.replace('https://', 'http://www.'));
    }
  }

  for (const u of tryUrls) {
    try {
      await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await sanitizePage(page);
      return true;
    } catch (e) {}
  }
  return false;
}

async function processLead(browser, lead, agentName) {
  const page = await browser.newPage();
  page.on('dialog', async dialog => { try { await dialog.dismiss(); } catch (_) {} });
  await page.setRequestInterception(true);
  const BLOCKED_RESOURCE_TYPES = new Set(['image', 'media', 'font', 'stylesheet', 'imageset']);
  page.on('request', req => {
    const url = req.url().toLowerCase();
    const resourceType = req.resourceType();
    if (url.includes('mailto:') || url.includes('tel:') || url.includes('127.0.0.1:12345')) {
      req.abort().catch(() => {});
    } else if (BLOCKED_RESOURCE_TYPES.has(resourceType)) {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  await page.evaluateOnNewDocument(() => {
    const origOpen = window.open;
    window.open = function(url, ...args) {
      if (typeof url === 'string' && (url.toLowerCase().includes('mailto:') || url.toLowerCase().includes('tel:'))) {
        return null;
      }
      return origOpen.call(this, url, ...args);
    };

    const origAnchorClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      const h = (this.href || this.getAttribute('href') || '').toLowerCase();
      if (h.includes('mailto:') || h.includes('tel:')) {
        return;
      }
      return origAnchorClick.call(this);
    };

    window.addEventListener('click', (e) => {
      let target = e.target;
      while (target && target !== document) {
        const href = (target.getAttribute && (target.getAttribute('href') || target.href) || '').toLowerCase();
        const onclick = (target.getAttribute && target.getAttribute('onclick') || '').toLowerCase();
        if (href.includes('mailto:') || href.includes('tel:') || onclick.includes('mailto:') || onclick.includes('tel:')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
        target = target.parentElement;
      }
    }, true);

    window.addEventListener('submit', (e) => {
      const form = e.target;
      if (form && form.tagName === 'FORM') {
        const action = (form.getAttribute('action') || form.action || '').toLowerCase();
        const onsubmit = (form.getAttribute('onsubmit') || '').toLowerCase();
        if (action.includes('mailto:') || onsubmit.includes('mailto:')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    }, true);
  });

  const startTime = Date.now();
  const rawUrl = normalizeUrl(lead.website);

  const lowUrl = (lead.website || '').toLowerCase();
  const lowName = (lead.company_name || '').toLowerCase();
  if (
    lowUrl.endsWith('.edu') || lowUrl.includes('.edu/') ||
    lowUrl.endsWith('.gov') || lowUrl.includes('.gov/') ||
    lowUrl.includes('mta.info') || lowUrl.includes('wikipedia.org') || lowUrl.includes('linktr.ee') ||
    lowUrl.includes('facebook.com') || lowUrl.includes('instagram.com') || lowUrl.includes('yelp.com') ||
    lowUrl.includes('yellowpages.com') || lowUrl.includes('thumbtack.com') || lowUrl.includes('angi.com') ||
    lowUrl.includes('hyatt.com') || lowUrl.includes('marriott.com') || lowUrl.includes('hilton.com') ||
    lowName.includes('resort') || lowName.includes('hotel') || lowName.includes(' spa') ||
    lowName.includes('high school') || lowName.includes('middle school') || lowName.includes('elementary school')
  ) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${agentName}] 🚫 #${lead.id} Disqualified: Directory / Government / Educational (${elapsed}s)`);
    saveLeadResult(lead.id, 'unable_to_reach', 'Disqualified: Directory / Government / Educational');
    await safeClose(page);
    return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Disqualified' };
  }

  console.log(`[${agentName}] 🌐 Checking: #${lead.id} ${lead.company_name} (${rawUrl})`);

  try {
    const loaded = await safeNavigate(page, rawUrl);
    if (!loaded) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${agentName}] ❌ #${lead.id} Inaccessible (${elapsed}s)`);
      saveLeadResult(lead.id, 'unable_to_reach', 'Site inaccessible / connection timeout');
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Site Inaccessible' };
    }

    // Check WAF / Cloudflare
    const pageTitle = (await page.title()).toLowerCase();
    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    if (pageTitle.includes('attention required') || pageTitle.includes('just a moment') || bodyText.includes('checking your browser') || bodyText.includes('cf-turnstile-wrapper')) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const shot = await takeFailureScreenshot(page, lead.id, 'waf_block');
      console.log(`[${agentName}] ⚠️ #${lead.id} Blocked by Security WAF (${elapsed}s)${shot ? ' [📸 ' + shot + ']' : ''}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${page.url()}: Blocked by Security WAF${shot ? ' (Screenshot: ' + shot + ')' : ''}`);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Security WAF Block' };
    }

    // Dismiss cookie banners, modals, and overlays
    try {
      await page.evaluate(() => {
        // First try removing common cookie consent containers directly
        const cookieSelectors = [
          '#onetrust-consent-sdk', '.cookie-banner', '#cookie-banner', '.widget-cookie-banner',
          '[class*="cookie-banner"]', '[id*="banner"]', '[data-ux="CookieBanner"]', '[class*="cookie"]', '[id*="cookie"]',
          '.gdpr', '#gdpr', '[data-testid*="cookie"]'
        ];
        for (const sel of cookieSelectors) {
          try {
            const els = document.querySelectorAll(sel);
            for (const el of els) {
              if (el && (el.innerText || '').toLowerCase().includes('cookie')) {
                el.remove();
              }
            }
          } catch (_) {}
        }

        const dismissKeywords = ['accept', 'agree', 'allow all', 'decline', 'dismiss', 'close', 'got it', 'i understand', 'continue without accepting'];
        const elements = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], .close, [aria-label*="close" i], [aria-label*="dismiss" i]'));
        for (const el of elements) {
          const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
          const aria = (el.getAttribute('aria-label') || '').toLowerCase();
          if (dismissKeywords.some(k => txt === k || aria === k || txt === k + ' cookies' || aria === k + ' cookies')) {
            try { el.click(); } catch (_) {}
            break;
          }
        }
      });
      await new Promise(r => setTimeout(r, 600));
    } catch (_) {}

    // Check contact page if no form on current page
    let contactPageUrl = page.url();
    const hasForm = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      return forms.some(f => {
        const inputs = Array.from(f.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea'));
        if (inputs.length === 0) return false;
        // Check if it is a search form
        const isSearch = inputs.every(inp => {
          const n = (inp.name || '').toLowerCase();
          const t = (inp.type || '').toLowerCase();
          const p = (inp.placeholder || '').toLowerCase();
          const id = (inp.id || '').toLowerCase();
          return t === 'search' || n === 's' || n.includes('search') || p.includes('search') || id.includes('search');
        });
        if (isSearch) return false;

        // Check if it is a 1-field newsletter subscription form
        if (inputs.length === 1 && (inputs[0].type === 'email' || (inputs[0].name || '').includes('email'))) {
          const submitBtn = f.querySelector('button, input[type="submit"]');
          const btnText = (submitBtn?.innerText || submitBtn?.value || '').toLowerCase();
          if (btnText.includes('subscribe') || btnText.includes('sign up') || btnText.includes('newsletter') || f.innerHTML.toLowerCase().includes('newsletter')) {
            return false;
          }
        }

        const hasEmail = inputs.some(inp => inp.type === 'email' || (inp.name || '').toLowerCase().includes('email') || (inp.placeholder || '').toLowerCase().includes('email'));
        const hasTextarea = f.querySelectorAll('textarea').length > 0;
        return hasEmail || hasTextarea || inputs.length >= 3;
      });
    });

    if (!hasForm) {
      const contactLink = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        const keywords = ['contact', 'get-in-touch', 'inquire', 'request-quote', 'quote', 'estimate'];
        const currentHost = window.location.hostname.replace(/^www\./i, '').toLowerCase();

        for (const k of keywords) {
          const match = links.find(a => {
            const href = (a.getAttribute('href') || a.href || '').trim().toLowerCase();
            const text = (a.innerText || '').trim().toLowerCase();
            if (href.startsWith('mailto:') || href.startsWith('tel:') || href.includes('mailto') || href.includes('@') || text.includes('@')) {
              return false;
            }
            if (!text.includes(k) && !href.includes(k)) {
              return false;
            }
            // Ensure link does not navigate off-domain to third-party templates / theme authors
            try {
              const fullUrl = new URL(a.href || a.getAttribute('href'), window.location.origin);
              const targetHost = fullUrl.hostname.replace(/^www\./i, '').toLowerCase();
              if (targetHost && currentHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost) && !currentHost.endsWith('.' + targetHost)) {
                return false;
              }
            } catch (_) {
              return false;
            }
            return true;
          });
          if (match) {
            const h = match.href || match.getAttribute('href') || '';
            const lowerH = h.toLowerCase();
            if (!lowerH.includes('mailto') && !lowerH.includes('tel') && !lowerH.includes('@')) {
              return h;
            }
          }
        }
        return null;
      });

      if (contactLink && !contactLink.toLowerCase().includes('mailto') && !contactLink.toLowerCase().includes('@')) {
        await safeNavigate(page, contactLink);
        contactPageUrl = page.url();

        // Wait up to 3s for form inputs on hydrated SPA/Wix/React pages
        try {
          await page.waitForSelector('input:not([type="hidden"]), textarea', { timeout: 3000 });
        } catch (_) {}

        // Dismiss cookie banner again on contact page if present
        try {
          await page.evaluate(() => {
            const dismissKeywords = ['accept', 'agree', 'allow all', 'decline', 'dismiss', 'close', 'got it'];
            const elements = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"], .close'));
            for (const el of elements) {
              const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
              if (dismissKeywords.some(k => txt === k || txt === k + ' cookies')) {
                try { el.click(); } catch (_) {}
                break;
              }
            }
          });
          await new Promise(r => setTimeout(r, 600));
        } catch (_) {}
      }
    }

    // Form and Captcha detection with smart contact form scoring
    const detection = await page.evaluate(() => {
      const allForms = Array.from(document.querySelectorAll('form') || []);
      let bestForm = null;
      let maxScore = -1;

      for (const form of allForms) {
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
        if (inputs.length === 0) continue;
        const isSearch = inputs.length === 1 && (inputs[0].name.includes('s') || inputs[0].type === 'search' || (inputs[0].placeholder || '').toLowerCase().includes('search'));
        if (isSearch) continue;

        let score = inputs.length;
        const html = form.innerHTML.toLowerCase();
        if (html.includes('email') || html.includes('mail')) score += 5;
        if (html.includes('phone') || html.includes('tel')) score += 5;
        if (html.includes('message') || html.includes('comment')) score += 5;
        if (score > maxScore) {
          maxScore = score;
          bestForm = form;
        }
      }

      const container = bestForm || document.body;
      if (!container) return { hasInputs: false, captchaName: null, isMailtoOnly: false };

      // Check if this is a mailto fake form
      if (bestForm) {
        const action = (bestForm.getAttribute('action') || '').toLowerCase();
        const onsubmit = (bestForm.getAttribute('onsubmit') || '').toLowerCase();
        if (action.startsWith('mailto:') || onsubmit.includes('mailto:')) {
          return { hasInputs: false, captchaName: null, isMailtoOnly: true };
        }
      }

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
      return { hasInputs: inputs.length > 0, captchaName, isMailtoOnly: false };
    });

    if (detection.isMailtoOnly) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const shot = await takeFailureScreenshot(page, lead.id, 'mailto_only');
      console.log(`[${agentName}] ℹ️ #${lead.id} Form is mailto only (${elapsed}s)${shot ? ' [📸 ' + shot + ']' : ''}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${contactPageUrl}: Form triggers mail client only (no web submission)${shot ? ' (Screenshot: ' + shot + ')' : ''}`);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'Mailto Form Only' };
    }

    if (!detection.hasInputs) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const shot = await takeFailureScreenshot(page, lead.id, 'no_form');
      console.log(`[${agentName}] ℹ️ #${lead.id} No form found (${elapsed}s)${shot ? ' [📸 ' + shot + ']' : ''}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Checked ${contactPageUrl}: No online web form found${shot ? ' (Screenshot: ' + shot + ')' : ''}`);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: 'No Web Form Found' };
    }

    if (detection.captchaName) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const shot = await takeFailureScreenshot(page, lead.id, 'captcha_block');
      console.log(`[${agentName}] ⚠️ #${lead.id} Captcha: ${detection.captchaName} (${elapsed}s)${shot ? ' [📸 ' + shot + ']' : ''}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (Autofilled; blocked by ${detection.captchaName})${shot ? ' (Screenshot: ' + shot + ')' : ''}`);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: `Blocked by ${detection.captchaName}` };
    }

    // Autofill with React-compatible prototype setter and targeted form scoping
    await page.evaluate((p) => {
      const setNativeValue = (element, value) => {
        try {
          const prototype = Object.getPrototypeOf(element);
          const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
          if (prototypeValueSetter) prototypeValueSetter.call(element, value);
          else element.value = value;
        } catch (_) {
          element.value = value;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      // Select target form
      const allForms = Array.from(document.querySelectorAll('form') || []);
      let targetContainer = null;
      let maxScore = -1;
      for (const form of allForms) {
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'));
        if (inputs.length === 0) continue;
        const isSearch = inputs.length === 1 && (inputs[0].name.includes('s') || inputs[0].type === 'search' || (inputs[0].placeholder || '').toLowerCase().includes('search'));
        if (isSearch) continue;
        let score = inputs.length;
        const html = form.innerHTML.toLowerCase();
        if (html.includes('email') || html.includes('mail')) score += 5;
        if (html.includes('phone') || html.includes('tel')) score += 5;
        if (html.includes('message') || html.includes('comment')) score += 5;
        if (score > maxScore) {
          maxScore = score;
          targetContainer = form;
        }
      }
      if (!targetContainer) targetContainer = document.body;

      const inputs = Array.from(targetContainer.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.getAttribute('type') || el.tagName.toLowerCase()).toLowerCase();
        const inputMode = (el.getAttribute('inputmode') || '').toLowerCase();
        const name = (el.getAttribute('name') || '').toLowerCase();
        const id = (el.getAttribute('id') || '').toLowerCase();
        const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
        const labelFor = el.id ? (document.querySelector('label[for="' + el.id + '"]')?.innerText || '').toLowerCase() : '';
        const fieldContainer = el.closest('.gfield, .form-group, .field, .elementor-field-group, .wpforms-field, [data-ux*="Input"], [class*="field"], [data-hook*="form-field"]');
        const containerLabel = (fieldContainer?.querySelector('label')?.innerText || '').toLowerCase();
        const labelText = (el.closest('label')?.innerText || el.previousElementSibling?.innerText || '').toLowerCase();
        const prevPText = (el.closest('p')?.previousElementSibling?.innerText || el.parentElement?.previousElementSibling?.innerText || '').toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || el.getAttribute('data-placeholder') || '').toLowerCase();
        const dataAid = (el.getAttribute('data-aid') || '').toLowerCase();
        const combined = `${name} ${id} ${placeholder} ${labelText} ${containerLabel} ${labelFor} ${ariaLabel} ${dataAid} ${prevPText}`;

        // Skip submit, button, reset, file
        if (type === 'file' || type === 'submit' || type === 'button' || type === 'reset') {
          continue;
        }

        // Checkbox opt-in or required checkbox
        if (type === 'checkbox') {
          if (!el.checked && (combined.includes('agree') || combined.includes('terms') || combined.includes('privacy') || combined.includes('consent') || combined.includes('opt-in') || el.required)) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          continue;
        }

        // Radio buttons: select first in group if required
        if (type === 'radio') {
          if (el.required && !el.checked) {
            el.checked = true;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          continue;
        }

        // Skip honeypots
        if (name.includes('gotcha') || name.includes('honeypot') || name.includes('[hp]') || id.includes('-field-hp') || name === 'website' || (name === 'input_6' && el.closest('.gfield')?.querySelector('label')?.innerText?.toLowerCase() === 'phone') || el.closest('.gfield--type-honeypot') || el.closest('.gform_validation_container') || el.closest('.wpforms-field-hp') || el.tabIndex === -1 || el.getAttribute('aria-hidden') === 'true' || (el.offsetWidth === 0 && el.offsetHeight === 0 && el.type !== 'hidden')) {
          continue;
        }

        if (el.tagName.toLowerCase() === 'select') {
          if (el.options.length > 1) {
            const isCountryOrCode = combined.includes('country') || combined.includes('code') || combined.includes('prefix') || combined.includes('dial') || combined.includes('phone');
            let selected = false;
            if (isCountryOrCode) {
              for (let i = 0; i < el.options.length; i++) {
                const optText = (el.options[i].innerText || el.options[i].text || '').toLowerCase();
                const optVal = (el.options[i].value || '').toLowerCase();
                if (optText.includes('united states') || optText.includes('usa') || optText.includes('+1') || optVal === 'us' || optVal === 'usa' || optVal === '+1' || optVal === '1') {
                  el.selectedIndex = i;
                  selected = true;
                  break;
                }
              }
            }
            if (!selected) {
              for (let i = 1; i < el.options.length; i++) {
                if (el.options[i].value && el.options[i].value.trim()) {
                  el.selectedIndex = i;
                  break;
                }
              }
            }
            if (el.selectedIndex === 0 && el.options.length > 1) el.selectedIndex = 1;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
          continue;
        }

        // Check for simple math quiz/captcha in label or placeholder (e.g. "What is 2 + 9?")
        const mathMatch = combined.match(/(\d+)\s*([\+\-\*])\s*(\d+)/);
        if (mathMatch) {
          const num1 = parseInt(mathMatch[1], 10);
          const op = mathMatch[2];
          const num2 = parseInt(mathMatch[3], 10);
          let ans = 0;
          if (op === '+') ans = num1 + num2;
          else if (op === '-') ans = num1 - num2;
          else if (op === '*') ans = num1 * num2;
          setNativeValue(el, String(ans));
          continue;
        }

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message') || combined.includes('comment') || combined.includes('detail') || combined.includes('description') || combined.includes('notes') || combined.includes('how can we help') || combined.includes('help you') || combined.includes('project') || combined.includes('quote')) {
          setNativeValue(el, p.message);
        } else if (type === 'email' || combined.includes('email') || combined.includes('e-mail')) {
          setNativeValue(el, p.email);
        } else if (type === 'tel' || type === 'phone' || inputMode === 'tel' || combined.includes('phone') || combined.includes('cell') || combined.includes('tel') || combined.includes('mobile')) {
          let phoneVal = p.phone;
          const digits = p.phone.replace(/\D/g, '');
          if (type === 'number' || el.maxLength === 10 || (el.pattern && !el.pattern.includes('-')) || combined.includes('mobile') || combined.includes('digits')) {
            phoneVal = digits;
          }
          setNativeValue(el, phoneVal);
        } else if (combined.includes('first') || combined.includes('fname')) {
          setNativeValue(el, p.firstName);
        } else if (combined.includes('last') || combined.includes('lname')) {
          setNativeValue(el, p.lastName);
        } else if (combined.includes('service') || combined.includes('product')) {
          setNativeValue(el, 'Custom Manufacturing & Services');
        } else if (combined.includes('name') && !combined.includes('company')) {
          setNativeValue(el, p.fullName);
        } else if (combined.includes('company') || combined.includes('business') || combined.includes('organization')) {
          setNativeValue(el, p.company);
        } else if (combined.includes('subject') || combined.includes('topic') || combined.includes('title')) {
          setNativeValue(el, p.subject);
        } else if (combined.includes('zip') || combined.includes('postal')) {
          setNativeValue(el, p.zip);
        } else if (combined.includes('city')) {
          setNativeValue(el, p.city);
        } else if (combined.includes('address') || combined.includes('street')) {
          setNativeValue(el, p.address);
        }
      }
    }, OUTREACH_PROFILE);

    // Brief human-like pause before submit to bypass speed traps (e.g. CF7 "Form submitted too quickly")
    await new Promise(r => setTimeout(r, 2500));

    // Click Submit
    const initialUrl = page.url();
    try {
      await page.evaluate(() => {
        // Remove cookie overlays
        const cookieEls = document.querySelectorAll('.widget-cookie-banner, [class*="cookie-banner"], [data-ux="CookieBanner"], #onetrust-consent-sdk, .gdpr, [id*="cookie"]');
        for (const el of cookieEls) {
          try { el.remove(); } catch (_) {}
        }

        // Scope to best form first
        const allForms = Array.from(document.querySelectorAll('form') || []);
        let targetContainer = null;
        let maxScore = -1;
        for (const form of allForms) {
          const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
          if (inputs.length > maxScore) {
            maxScore = inputs.length;
            targetContainer = form;
          }
        }
        if (!targetContainer) targetContainer = document.body;

        // Neutralize all mailto and tel elements before clicking submit
        const badElements = document.querySelectorAll('a[href*="mailto:" i], a[href*="tel:" i], a[href*="@" i], [onclick*="mailto:" i], [onclick*="tel:" i]');
        badElements.forEach(el => {
          el.removeAttribute('href');
          el.removeAttribute('onclick');
          el.onclick = (e) => { e.preventDefault(); e.stopImmediatePropagation(); return false; };
        });

        const submitKeywords = ['submit', 'send message', 'send inquiry', 'send request', 'send', 'request quote', 'request a quote', 'request free estimate', 'request consultation', 'get a quote'];
        // ONLY look for actual buttons or submit inputs, NEVER navigation links
        const buttons = Array.from(targetContainer.querySelectorAll('button, input[type="submit"], [data-aid*="SUBMIT"], [data-hook*="submit"], .wsite-button, a[role="button"], div[role="button"], a.btn, a.button'));
        
        for (const btn of buttons) {
          const href = (btn.getAttribute('href') || btn.href || '').toLowerCase();
          const onclick = (btn.getAttribute('onclick') || '').toLowerCase();
          const text = (btn.innerText || btn.value || '').toLowerCase().trim();

          // Reject ANY element with mailto, tel, email address, or external navigation text
          if (href.includes('mailto') || href.includes('tel') || href.includes('@') || onclick.includes('mailto') || onclick.includes('tel') || text.includes('@') || text.includes('contact us') || text.includes('email us') || text.includes('call us')) {
            continue;
          }

          const type = (btn.getAttribute('type') || '').toLowerCase();
          const aid = (btn.getAttribute('data-aid') || '').toLowerCase();
          const hook = (btn.getAttribute('data-hook') || '').toLowerCase();
          if (type === 'submit' || aid.includes('submit') || hook.includes('submit') || submitKeywords.some(k => text === k || text.includes(k))) {
            btn.scrollIntoView({ behavior: 'instant', block: 'center' });
            btn.click();
            return;
          }
        }

        if (targetContainer.tagName && targetContainer.tagName.toLowerCase() === 'form') {
          const formAction = (targetContainer.getAttribute('action') || '').toLowerCase();
          const formOnsubmit = (targetContainer.getAttribute('onsubmit') || '').toLowerCase();
          if (!formAction.includes('mailto') && !formOnsubmit.includes('mailto')) {
            if (typeof targetContainer.requestSubmit === 'function') targetContainer.requestSubmit();
            else targetContainer.submit();
          }
        }
      });
    } catch (e) {}

    await new Promise(r => setTimeout(r, 4500));

    // Verification
    let verification = { isSuccess: false, phrase: '', isError: false, error: '' };
    try {
      verification = await page.evaluate((signals, errors, initUrl) => {
        const body = document.body ? document.body.innerText.toLowerCase() : '';
        const current = window.location.href;
        const urlChanged = current !== initUrl && !current.includes('#');

        const successContainers = document.querySelectorAll(
          '.wixui-form__message, .form-submission-message, .sqs-form-submitted, ' +
          '.wpcf7-response-output, .wpcf7-mail-sent-ok, .gform_confirmation_message, ' +
          '.elementor-message-success, [data-testid="form-submitted"], [role="alert"], ' +
          '.alert-success, .success-message, .submitted-message, .hs-form-submitted'
        );

        for (const el of successContainers) {
          const txt = (el.innerText || '').toLowerCase();
          const cls = el.className || '';
          if (txt.includes('cookie') || txt.includes('browser') || txt.includes('javascript disabled') || txt.includes('translation')) continue;
          if (/alert-(secondary|info|warning|danger)/i.test(cls)) continue;
          for (const sig of signals) {
            if (txt.includes(sig)) {
              return { isSuccess: true, phrase: `Element [${el.className}]: "${txt.trim().slice(0, 150)}"` };
            }
          }
        }

        // Check errors and negative phrasing first
        for (const err of errors) {
          if (body.includes(err)) {
            return { isSuccess: false, isError: true, error: err };
          }
        }
        if (/(?:not\s+sent|failed\s+to\s+send|could\s+not\s+be\s+sent|unable\s+to\s+send|error\s+sending)/i.test(body)) {
          return { isSuccess: false, isError: true, error: 'Negative submission status detected' };
        }

        const bodyClean = body.replace(/cookies?[\s\S]{0,100}thank\s*you/gi, '');
        for (const sig of signals) {
          if (bodyClean.includes(sig)) {
            return { isSuccess: true, phrase: sig };
          }
        }

        const successPatterns = [
          /(?<!cookies?[\s\S]{0,60})thank\s*you/i,
          /message\s+(?:has\s+been|was|is)?\s*(?:successfully\s+)?(sent|received)/i,
          /inquiry\s+(?:has\s+been|was|is)?\s*(?:successfully\s+)?(sent|received)/i,
          /submission\s+(?:was\s+)?(successful|received)/i,
          /successfully\s*(sent|submitted)/i,
          /was\s*successfully\s*sent/i,
          /(will|we'll)\s*(be in touch|contact you|get back to you)/i
        ];
        for (const p of successPatterns) {
          const match = bodyClean.match(p);
          if (match) {
            return { isSuccess: true, phrase: match[0] };
          }
        }

        if (urlChanged && (current.includes('thank') || current.includes('success') || current.includes('confirm'))) {
          return { isSuccess: true, phrase: 'Redirected to confirmation page: ' + current };
        }

        return { isSuccess: false, isError: false };
      }, SUCCESS_SIGNALS, ERROR_SIGNALS, initialUrl);
    } catch (e) {
      const currentUrl = page.url();
      if (currentUrl !== initialUrl && (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('confirm'))) {
        verification = { isSuccess: true, phrase: 'Redirected to confirmation page: ' + currentUrl };
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (verification.isSuccess) {
      console.log(`[${agentName}] ✅ #${lead.id} SUBMISSION CONFIRMED: "${verification.phrase}" (${elapsed}s)`);
      saveLeadResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Autofilled & verified: ${verification.phrase})`);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'contacted', time: elapsed, result: `Confirmed: ${verification.phrase}` };
    } else {
      let errorMsg = verification.isError ? `Validation error: "${verification.error}"` : 'No explicit confirmation detected post-submission';
      const shot = await takeFailureScreenshot(page, lead.id, verification.isError ? 'validation_err' : 'unconfirmed');
      console.log(`[${agentName}] ⚠️ #${lead.id} Unconfirmed: ${errorMsg} (${elapsed}s)${shot ? ' [📸 ' + shot + ']' : ''}`);
      saveLeadResult(lead.id, 'unable_to_reach', `Contact form: ${contactPageUrl} (${errorMsg})${shot ? ' (Screenshot: ' + shot + ')' : ''}`);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: errorMsg };
    }

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const shot = await takeFailureScreenshot(page, lead.id, 'error');
    console.log(`[${agentName}] ❌ #${lead.id} Error: ${err.message} (${elapsed}s)${shot ? ' [📸 ' + shot + ']' : ''}`);
    saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${err.message.split('\n')[0]}${shot ? ' (Screenshot: ' + shot + ')' : ''}`);
    await safeClose(page);
    return { id: lead.id, company: lead.company_name, status: 'unable_to_reach', time: elapsed, result: `Error: ${err.message}` };
  }
}

async function runWorker() {
  const args = process.argv.slice(2);
  const workerId = args[0] || '1';
  const leadIds = args[1] ? args[1].split(',').map(Number) : [];
  const isHeaded = args.includes('--headed');

  if (leadIds.length === 0) {
    console.log('No lead IDs provided to worker.');
    return;
  }

  const agentName = `Agent-${workerId}`;
  console.log(`\n🚀 [${agentName}] Starting Chromium Browser (headless=${!isHeaded}) for ${leadIds.length} leads: ${leadIds.join(', ')}...`);

  try {
    execSync('swift -e "import Foundation; import CoreServices; LSSetDefaultHandlerForURLScheme(\\"mailto\\" as NSString as CFString, \\"com.google.Chrome\\" as NSString as CFString); LSSetDefaultHandlerForURLScheme(\\"tel\\" as NSString as CFString, \\"com.google.Chrome\\" as NSString as CFString);"', { stdio: 'ignore' });
  } catch (_) {}

  const prefs = {
    custom_handlers: {
      enabled: true,
      registered_protocol_handlers: [
        { default: true, protocol: 'mailto', url: 'http://127.0.0.1:12345/sink?url=%s' },
        { default: true, protocol: 'tel', url: 'http://127.0.0.1:12345/sink?url=%s' },
        { default: true, protocol: 'callto', url: 'http://127.0.0.1:12345/sink?url=%s' },
        { default: true, protocol: 'sms', url: 'http://127.0.0.1:12345/sink?url=%s' }
      ],
      ignored_protocol_handlers: []
    }
  };

  const createdProfiles = [];
  async function launchBrowser() {
    const instProfile = `/tmp/chrome_w${workerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    createdProfiles.push(instProfile);
    const instDefault = `${instProfile}/Default`;
    fs.mkdirSync(instDefault, { recursive: true });
    fs.writeFileSync(`${instDefault}/Preferences`, JSON.stringify(prefs));

    return await puppeteer.launch({
      executablePath: CHROME_BIN,
      headless: isHeaded ? false : 'new',
      userDataDir: instProfile,
      timeout: 60000,
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-protocol-handling',
        '--protocol-handler-registration-mode=disabled',
        '--disable-external-intent-requests',
        '--disable-features=ExternalProtocolDialog',
        '--ignore-certificate-errors',
        '--window-size=1280,800'
      ]
    });
  }

  let browser = await launchBrowser();

  const placeholders = leadIds.map(() => '?').join(',');
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

  const results = [];
  for (const lead of leads) {
    if (!browser || !browser.connected) {
      browser = await launchBrowser();
    }
    try {
      const res = await Promise.race([
        processLead(browser, lead, agentName),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Lead processing timeout exceeded (45s)')), 45000))
      ]);
      results.push(res);
    } catch (e) {
      console.log(`[${agentName}] Lead process error on #${lead.id}:`, e.message);
      try {
        if (browser) {
          const proc = browser.process();
          await browser.close().catch(() => {});
          if (proc && !proc.killed) proc.kill('SIGKILL');
        }
      } catch (_) {}
      await new Promise(r => setTimeout(r, 800));
      browser = await launchBrowser();
      saveLeadResult(lead.id, 'unable_to_reach', `Error during browser automation: ${e.message.split('\n')[0]}`);
      results.push({ id: lead.id, company: lead.company_name, status: 'unable_to_reach', result: e.message });
    }
  }

  try { await browser.close(); } catch (_) {}
  for (const p of createdProfiles) {
    try { fs.rmSync(p, { recursive: true, force: true }); } catch (_) {}
  }
  try { db.close(); } catch (_) {}

  console.log(`\n========================================`);
  console.log(`🏁 [${agentName}] Completed: ${results.length} Leads Processed`);
  console.table(results);
  process.exit(0);
}

runWorker();
