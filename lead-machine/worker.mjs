import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { checkWebsite } from './reachability.mjs';
import { migrateDatabase } from './db_migration.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

// Resolve database path
const dbPath = path.resolve(__dirname, '../data/leads.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 10000');
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    website TEXT NOT NULL UNIQUE,
    city TEXT,
    state TEXT,
    phone TEXT,
    email TEXT,
    contact_person TEXT,
    status TEXT DEFAULT 'not_contacted',
    notes TEXT,
    failure_reason TEXT,
    debug_screenshot TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS contact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  );
`);
migrateDatabase(db);

function findChromeExecutable() {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  if (isWin) {
    const winPaths = [
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : null,
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Microsoft\\Edge\\Application\\msedge.exe') : null
    ];
    for (const p of winPaths) {
      if (p && fs.existsSync(p)) return p;
    }
  } else if (isMac) {
    const macPaths = [
      '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) return p;
    }
  }

  try {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (home) {
      const cacheDir = path.join(home, '.cache', 'puppeteer', 'chrome');
      if (fs.existsSync(cacheDir)) {
        const subdirs = fs.readdirSync(cacheDir);
        for (const sub of subdirs) {
          if (isWin) {
            const exe = path.join(cacheDir, sub, 'chrome-win64', 'chrome.exe');
            if (fs.existsSync(exe)) return exe;
          } else if (isMac) {
            const app = path.join(cacheDir, sub, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');
            if (fs.existsSync(app)) return app;
          }
        }
      }
    }
  } catch (_) {}

  return undefined;
}

export function getOrInstallChrome() {
  let bin = findChromeExecutable();
  if (bin) return bin;

  console.log('[Lead Machine] Chrome browser engine not found. Automatically installing via Puppeteer...');
  try {
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    bin = findChromeExecutable();
    if (bin) {
      console.log('[Lead Machine] Chrome engine installed successfully at:', bin);
    }
  } catch (err) {
    console.error('[Lead Machine] Auto-install attempt finished with note:', err.message);
    bin = findChromeExecutable();
  }
  return bin;
}

const CHROME_BIN = getOrInstallChrome();

// Load sender profile dynamically with zero stale caching
export function getFreshSenderProfile() {
  const configPath = path.join(__dirname, 'config.json');
  let sender = {};
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.sender) sender = cfg.sender;
    } catch (_) {}
  }

  let fullName = (sender.fullName || '').trim();
  let firstName = (sender.firstName || '').trim();
  let lastName = (sender.lastName || '').trim();

  // Two-way name synthesis: ensure neither is ever blank or mismatched
  if (fullName && (!firstName || !lastName)) {
    const parts = fullName.split(/\s+/);
    if (!firstName) firstName = parts[0] || '';
    if (!lastName) lastName = parts.slice(1).join(' ') || '';
  } else if (!fullName && (firstName || lastName)) {
    fullName = `${firstName} ${lastName}`.trim();
  }

  return {
    fullName: fullName || 'Pamela Jameson',
    firstName: firstName || 'Pamela',
    lastName: lastName || 'Jameson',
    jobTitle: sender.jobTitle || 'Purchase Director',
    email: sender.email || 'pamela.jameson@nortiheastprecision.com',
    phone: sender.phone || '708-568-3708',
    company: sender.company || 'Northeast Precision Machinery, Inc.',
    website: sender.website || 'https://northeastprecision.com/',
    address: sender.address || '1908 Mount Vernon Ave',
    suite: sender.suite || '',
    city: sender.city || 'Alexandria',
    state: sender.state || 'VA',
    stateFull: sender.stateFull || (sender.state === 'VA' ? 'Virginia' : sender.state || 'Virginia'),
    zip: sender.zip || '22301',
    country: sender.country || 'United States',
    subject: sender.subject || 'Exploring Collaboration Opportunities',
    message: sender.message || 'Hello,\n\nI am reaching out to explore potential collaboration with your company.\n\nThank you,\n' + (fullName || 'Pamela Jameson')
  };
}

let OUTREACH_PROFILE = getFreshSenderProfile();


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
  'form submitted',
  'inquiry received',
  'request received',
  'quote request sent',
  'we\'ve received your message',
  'will contact you shortly',
  'in touch shortly'
];

const ERROR_SIGNALS = [
  'please fill out this field',
  'this field is required',
  'there was an error',
  'submission failed',
  'captcha',
  'recaptcha',
  'turnstile',
  'invalid email',
  'correct errors',
  'validation error',
  'there was a problem'
];

const updateStmt = db.prepare(`
  UPDATE leads 
  SET notes = ?, 
      status = ?, 
      failure_reason = COALESCE(?, failure_reason), 
      debug_screenshot = COALESCE(?, debug_screenshot), 
      updated_at = CURRENT_TIMESTAMP 
  WHERE id = ?
`);
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
const getStmt = db.prepare('SELECT id, company_name, status, notes, failure_reason, debug_screenshot FROM leads WHERE id = ?');

function isDebugModeEnabled() {
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.settings && cfg.settings.debugMode === true) return true;
      if (cfg.debugMode === true) return true;
    }
  } catch (_) {}
  return false;
}

async function captureFailureScreenshot(page, leadId) {
  try {
    if (!isDebugModeEnabled() || !page || page.isClosed()) return null;
    const shotsDir = path.resolve(__dirname, '../data/debug_screenshots');
    if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });
    const filename = `lead_${leadId}_${Date.now()}.png`;
    const fullPath = path.join(shotsDir, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
    return `/api/debug/screenshot/${filename}`;
  } catch (err) {
    console.error(`[Worker] Screenshot capture failed: ${err.message}`);
    return null;
  }
}

async function detectCaptchaOrSecurityBlock(page) {
  try {
    return await page.evaluate(() => {
      const text = (document.body ? document.body.innerText.toLowerCase() : '');
      const title = (document.title || '').toLowerCase();

      // Cloudflare / Turnstile
      if (text.includes('checking your browser') ||
          (text.includes('cloudflare') && (text.includes('ray id') || text.includes('turnstile') || text.includes('please wait') || text.includes('security check'))) ||
          text.includes('verify you are human') ||
          text.includes('verify that you are human') ||
          title.includes('just a moment...') ||
          title.includes('attention required! | cloudflare') ||
          document.querySelector('iframe[src*="challenges.cloudflare.com"]') ||
          document.querySelector('.cf-turnstile, input[name="cf-turnstile-response"]')) {
        return { isBlocked: true, reason: 'Cloudflare / Turnstile Challenge' };
      }

      // reCAPTCHA / hCaptcha / generic bot challenge
      if (document.querySelector('iframe[src*="recaptcha"]') ||
          document.querySelector('.g-recaptcha') ||
          document.querySelector('iframe[src*="hcaptcha"]') ||
          document.querySelector('.h-captcha')) {
        return { isBlocked: true, reason: 'CAPTCHA Challenge (reCAPTCHA / hCaptcha)' };
      }

      // WAF access denied
      if (text.includes('access denied') && (text.includes('waf') || text.includes('firewall') || text.includes('403 forbidden') || text.includes('perimeterx') || text.includes('ddos-guard'))) {
        return { isBlocked: true, reason: 'Security Firewall / WAF Block' };
      }

      return { isBlocked: false, reason: null };
    });
  } catch (_) {
    return { isBlocked: false, reason: null };
  }
}

function saveLeadResult(id, status, note, isSandbox = false, failureReason = null, debugScreenshot = null) {
  if (isSandbox) return;
  try {
    const current = getStmt.get(id);
    const targetStatus = (current?.status === 'contacted') ? 'contacted' : status;
    const newNotes = current?.notes ? current.notes + ' | ' + note : note;
    db.transaction(() => {
      updateStmt.run(newNotes, targetStatus, failureReason, debugScreenshot, id);
      const action = targetStatus === 'contacted' ? 'sent' : (targetStatus === 'captcha_blocked' ? 'captcha' : 'bounced');
      logStmt.run(id, action, note);
    })();
  } catch (err) {
    console.error(`Error saving lead result for #${id}:`, err.message);
  }
}

async function safeClose(page) {
  try {
    await Promise.race([
      page.close({ runBeforeUnload: false }),
      new Promise(resolve => setTimeout(resolve, 2000))
    ]);
  } catch (_) {}
}

async function processLead(browser, lead, agentName, isSandbox = false) {
  const startTime = Date.now();
  const page = await browser.newPage();
  page.on('dialog', async dialog => { try { await dialog.dismiss(); } catch (_) {} });
  await page.setRequestInterception(true);
  const BLOCKED_TYPES = new Set(['image', 'media', 'font', 'stylesheet', 'imageset']);
  const BLOCKED_DOMAINS = [
    'googletagmanager.com',
    'google-analytics.com',
    'analytics.google.com',
    'connect.facebook.net',
    'facebook.com/tr',
    'clarity.ms',
    'hotjar.com',
    'doubleclick.net',
    'adroll.com',
    'criteo.com',
    'intercom.io',
    'drift.com',
    'hs-analytics.net',
    'hubspot.com/analytics',
    'browser.sentry-cdn.com'
  ];

  page.on('request', req => {
    const url = req.url().toLowerCase();
    const type = req.resourceType();
    if (url.includes('mailto:') || url.includes('tel:') || url.includes('127.0.0.1:12345')) {
      req.abort().catch(() => {});
    } else if (BLOCKED_TYPES.has(type)) {
      req.abort().catch(() => {});
    } else if (BLOCKED_DOMAINS.some(d => url.includes(d))) {
      req.abort().catch(() => {});
    } else {
      req.continue().catch(() => {});
    }
  });

  try {
    // 1. Fast pre-flight check
    // On slow internet, only skip if the domain is definitely dead (e.g. 404, 410, domain not found).
    // If it's a network timeout or connection delay, Chromium will handle it with its full HTTP/2 stack!
    const preCheck = await checkWebsite(lead.website, 15000);
    if (!preCheck.ok && preCheck.isDefinitiveDead) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${agentName}] ⚠️ #${lead.id} Definitive dead site (${preCheck.reason}) (${elapsed}s)`);
      saveLeadResult(lead.id, 'unreachable', `Pre-flight unreachable: ${preCheck.reason}`, isSandbox, `Dead domain (${preCheck.reason})`, null);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'unreachable', time: elapsed, result: `Unreachable: ${preCheck.reason}` };
    }

    let siteUrl = lead.website;
    if (!siteUrl.startsWith('http://') && !siteUrl.startsWith('https://')) {
      siteUrl = 'https://' + siteUrl;
    }

    let loadedOk = false;
    try {
      await page.goto(siteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      loadedOk = true;
    } catch (_) {
      // Retry with http if https fails or times out
      if (siteUrl.startsWith('https://')) {
        try {
          await page.goto(siteUrl.replace('https://', 'http://'), { waitUntil: 'domcontentloaded', timeout: 25000 });
          loadedOk = true;
        } catch (_) {}
      }
    }

    // Check if DOM content actually loaded despite any event timeout
    if (!loadedOk) {
      const hasContent = await page.evaluate(() => Boolean(document.body && document.body.innerText.trim().length > 10)).catch(() => false);
      if (!hasContent) {
        const shot = await captureFailureScreenshot(page, lead.id);
        saveLeadResult(lead.id, 'unreachable', 'Site timed out loading on current connection', isSandbox, 'Connection Timeout / DNS Failure', shot);
        await safeClose(page);
        return { id: lead.id, company: lead.company_name, status: 'unreachable', result: 'Site timed out loading' };
      }
    }

    // Check for CAPTCHA or WAF block
    const initialSecurity = await detectCaptchaOrSecurityBlock(page);
    if (initialSecurity.isBlocked) {
      const shot = await captureFailureScreenshot(page, lead.id);
      saveLeadResult(lead.id, 'captcha_blocked', `Blocked by ${initialSecurity.reason}`, isSandbox, initialSecurity.reason, shot);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'captcha_blocked', result: initialSecurity.reason };
    }

    // Find contact link if not already on contact page
    const currentUrl = page.url().toLowerCase();
    let contactPageUrl = currentUrl;

    if (!currentUrl.includes('contact') && !currentUrl.includes('quote') && !currentUrl.includes('inquiry')) {
      const contactHref = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href]'));
        for (const l of links) {
          const href = (l.getAttribute('href') || '').toLowerCase();
          const text = (l.innerText || '').toLowerCase().trim();
          if (href.includes('mailto:') || href.includes('tel:')) continue;
          if (href.includes('contact') || text.includes('contact') || href.includes('quote') || text.includes('get a quote')) {
            return l.href;
          }
        }
        return null;
      });

      if (contactHref && contactHref !== currentUrl) {
        try {
          await page.goto(contactHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
          contactPageUrl = page.url();
        } catch (_) {}

        const contactSecurity = await detectCaptchaOrSecurityBlock(page);
        if (contactSecurity.isBlocked) {
          const shot = await captureFailureScreenshot(page, lead.id);
          saveLeadResult(lead.id, 'captcha_blocked', `Blocked on contact page by ${contactSecurity.reason}`, isSandbox, contactSecurity.reason, shot);
          await safeClose(page);
          return { id: lead.id, company: lead.company_name, status: 'captcha_blocked', result: contactSecurity.reason };
        }
      }
    }

    // Ensure fresh profile per lead
    const currentProfile = getFreshSenderProfile();

    // Search and fill form
    const formFilled = await page.evaluate((profile, leadData) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      if (inputs.length === 0) return { filled: false, reason: 'No inputs found' };

      // Dynamic message variable substitution
      let dynamicMessage = profile.message || '';
      dynamicMessage = dynamicMessage.replace(/{company_name}/gi, leadData.company_name || 'your company');
      dynamicMessage = dynamicMessage.replace(/{first_name}/gi, (leadData.contact_person ? leadData.contact_person.split(' ')[0] : 'there'));
      dynamicMessage = dynamicMessage.replace(/{city}/gi, leadData.city || '');
      dynamicMessage = dynamicMessage.replace(/{state}/gi, leadData.state || '');
      dynamicMessage = dynamicMessage.replace(/{full_name}/gi, profile.fullName || '');
      dynamicMessage = dynamicMessage.replace(/{job_title}/gi, profile.jobTitle || '');
      dynamicMessage = dynamicMessage.replace(/{company_sender}/gi, profile.company || '');

      let filledCount = 0;
      const filledDetails = [];
      for (const input of inputs) {
        const type = (input.getAttribute('type') || input.type || 'text').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();

        // Check associated label or parent text
        let labelText = '';
        if (input.labels && input.labels.length > 0) {
          labelText = Array.from(input.labels).map(l => l.innerText || '').join(' ');
        }
        if (!labelText && input.parentElement) {
          labelText = input.parentElement.innerText || '';
        }

        const descriptor = `${name} ${id} ${placeholder} ${ariaLabel} ${labelText}`.toLowerCase();

        if (type === 'submit' || type === 'button' || type === 'reset' || type === 'image') continue;

        if (type === 'checkbox' || type === 'radio') {
          if (input.hasAttribute('required') || descriptor.includes('agree') || descriptor.includes('consent') || descriptor.includes('term') || descriptor.includes('policy')) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          continue;
        }

        if (input.tagName.toLowerCase() === 'select') {
          if (input.options && input.options.length > 1) {
            let matchedIdx = -1;
            const targetState = (profile.state || '').toLowerCase();
            const targetStateFull = (profile.stateFull || '').toLowerCase();
            for (let i = 0; i < input.options.length; i++) {
              const optText = (input.options[i].text || '').toLowerCase();
              const optVal = (input.options[i].value || '').toLowerCase();
              if (optVal === targetState || optText === targetState || optText.includes(targetStateFull)) {
                matchedIdx = i;
                break;
              }
            }
            input.selectedIndex = matchedIdx !== -1 ? matchedIdx : 1;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
          continue;
        }

        let valToSet = null;
        if (type === 'email' || descriptor.includes('email') || descriptor.includes('e-mail')) {
          valToSet = profile.email;
        } else if (type === 'tel' || descriptor.includes('phone') || descriptor.includes('tel') || descriptor.includes('mobile') || descriptor.includes('cell')) {
          valToSet = profile.phone;
        } else if ((descriptor.includes('first') && !descriptor.includes('last')) || descriptor.includes('fname') || descriptor.includes('given')) {
          valToSet = profile.firstName;
        } else if ((descriptor.includes('last') && !descriptor.includes('first')) || descriptor.includes('lname') || descriptor.includes('surname') || descriptor.includes('family name')) {
          valToSet = profile.lastName;
        } else if (descriptor.includes('your name') || descriptor.includes('contact name') || descriptor.includes('full name') || descriptor.includes('name')) {
          valToSet = profile.fullName;
        } else if (descriptor.includes('job') || descriptor.includes('position') || descriptor.includes('role') || (descriptor.includes('title') && !descriptor.includes('sub') && !descriptor.includes('topic'))) {
          valToSet = profile.jobTitle;
        } else if (descriptor.includes('company') || descriptor.includes('organization') || descriptor.includes('business') || descriptor.includes('firm')) {
          valToSet = profile.company;
        } else if (descriptor.includes('website') || descriptor.includes('web site') || descriptor.includes('url') || descriptor.includes('domain')) {
          valToSet = profile.website;
        } else if (descriptor.includes('street') || descriptor.includes('address 1') || descriptor.includes('address line 1') || (descriptor.includes('address') && !descriptor.includes('email') && !descriptor.includes('ip') && !descriptor.includes('url'))) {
          valToSet = profile.address;
        } else if (descriptor.includes('suite') || descriptor.includes('apt') || descriptor.includes('unit') || descriptor.includes('address 2') || descriptor.includes('address line 2')) {
          valToSet = profile.suite;
        } else if (descriptor.includes('city') || descriptor.includes('town') || descriptor.includes('municipality')) {
          valToSet = profile.city;
        } else if (descriptor.includes('zip') || descriptor.includes('postal') || descriptor.includes('postcode')) {
          valToSet = profile.zip;
        } else if (descriptor.includes('state') || descriptor.includes('province') || descriptor.includes('region')) {
          valToSet = profile.state;
        } else if (descriptor.includes('country')) {
          valToSet = profile.country;
        } else if (descriptor.includes('subject') || descriptor.includes('topic') || descriptor.includes('regarding') || descriptor.includes('inquiry')) {
          valToSet = profile.subject;
        } else if (input.tagName.toLowerCase() === 'textarea' || descriptor.includes('message') || descriptor.includes('comment') || descriptor.includes('detail') || descriptor.includes('notes') || descriptor.includes('body')) {
          valToSet = dynamicMessage;
        }

        if (valToSet) {
          input.value = valToSet;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          filledDetails.push({ field: descriptor.substring(0, 25), set: valToSet.length > 40 ? valToSet.substring(0, 37) + '...' : valToSet });
        }
      }

      return { filled: filledCount >= 2, count: filledCount, details: filledDetails };
    }, currentProfile, lead);


    if (!formFilled.filled) {
      const shot = await captureFailureScreenshot(page, lead.id);
      saveLeadResult(lead.id, 'no_form_found', `No suitable web contact form found on ${contactPageUrl}`, isSandbox, 'No web form found', shot);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'no_form_found', result: 'No web form found' };
    }

    // Human-like pause before submit
    await new Promise(r => setTimeout(r, 2000));

    if (isSandbox) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[${agentName}] 🧪 [SANDBOX] Form filled for #${lead.id} (${lead.company_name}) [${formFilled.count} fields filled]:`);
      for (const d of (formFilled.details || [])) {
        console.log(`  -> Field [${d.field}]: "${d.set}"`);
      }
      saveLeadResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Sandbox simulated)`, true);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'contacted', time: elapsed, result: 'Confirmed: [Sandbox simulated submission]' };
    }

    // Submit form
    const initUrl = page.url();
    await page.evaluate(() => {
      const submitKeywords = ['submit', 'send message', 'send inquiry', 'send request', 'send', 'request quote', 'get a quote'];
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn, a.button'));
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || '').toLowerCase().trim();
        const type = (btn.getAttribute('type') || '').toLowerCase();
        if (type === 'submit' || submitKeywords.some(k => text === k || text.includes(k))) {
          btn.scrollIntoView({ behavior: 'instant', block: 'center' });
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

    // Dynamic verification poller for slow connections (polls up to 15 seconds)
    let isSuccess = false;
    let confirmationPhrase = '';
    const pollStart = Date.now();
    const maxPollMs = 15000;

    // Initial 2.5s pause for form request to transmit
    await new Promise(r => setTimeout(r, 2500));

    while (Date.now() - pollStart < maxPollMs) {
      const currentUrl = page.url();
      if (currentUrl !== initUrl && (currentUrl.includes('thank') || currentUrl.includes('success') || currentUrl.includes('confirm') || currentUrl.includes('submitted'))) {
        isSuccess = true;
        confirmationPhrase = 'Redirected to: ' + currentUrl;
        break;
      }

      const bodyText = await page.evaluate(() => document.body ? document.body.innerText.toLowerCase() : '').catch(() => '');
      for (const signal of SUCCESS_SIGNALS) {
        if (bodyText.includes(signal)) {
          isSuccess = true;
          confirmationPhrase = signal;
          break;
        }
      }
      if (isSuccess) break;

      // Check if form disappeared or was replaced with confirmation message
      const formStillExists = await page.evaluate(() => Boolean(document.querySelector('form, input[type="submit"], button[type="submit"]'))).catch(() => true);
      if (!formStillExists && bodyText.length > 20) {
        for (const signal of ['thank', 'received', 'sent', 'contact', 'message', 'success']) {
          if (bodyText.includes(signal)) {
            isSuccess = true;
            confirmationPhrase = `Form replaced with confirmation message containing "${signal}"`;
            break;
          }
        }
      }
      if (isSuccess) break;

      await new Promise(r => setTimeout(r, 1000));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (isSuccess) {
      console.log(`[${agentName}] ✅ #${lead.id} SUBMISSION CONFIRMED: "${confirmationPhrase}" (${elapsed}s)`);
      saveLeadResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Autofilled & verified: ${confirmationPhrase})`, isSandbox);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'contacted', time: elapsed, result: `Confirmed: ${confirmationPhrase}` };
    } else {
      console.log(`[${agentName}] ⚠️ #${lead.id} Unconfirmed (${elapsed}s)`);
      const shot = await captureFailureScreenshot(page, lead.id);
      saveLeadResult(lead.id, 'form_submit_error', `Contact form: ${contactPageUrl} (Unconfirmed post-submission)`, isSandbox, 'Submission unconfirmed or rejected', shot);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'form_submit_error', time: elapsed, result: 'Unconfirmed post-submission' };
    }

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${agentName}] ❌ #${lead.id} Error: ${err.message} (${elapsed}s)`);
    const isTimeout = (err.message || '').toLowerCase().includes('timeout') || (err.message || '').toLowerCase().includes('net::');
    const targetStatus = isTimeout ? 'unreachable' : 'form_submit_error';
    const reasonText = isTimeout ? 'Connection Timeout / DNS Failure' : `Automation Error: ${err.message.split('\n')[0]}`;
    const shot = await captureFailureScreenshot(page, lead.id);
    saveLeadResult(lead.id, targetStatus, `Error during browser automation: ${err.message.split('\n')[0]}`, isSandbox, reasonText, shot);
    await safeClose(page);
    return { id: lead.id, company: lead.company_name, status: targetStatus, time: elapsed, result: `Error: ${err.message}` };
  }
}

async function runWorker() {
  const args = process.argv.slice(2);
  const workerId = args[0] || '1';
  const leadIds = args[1] ? args[1].split(',').map(Number) : [];
  const isSandbox = args.includes('--sandbox') || args.includes('--dry-run');
  const isHeaded = args.includes('--headed');

  if (leadIds.length === 0) {
    console.log('No lead IDs provided to worker.');
    return;
  }

  const agentName = `Worker-${workerId}`;
  console.log(`🚀 [${agentName}] Launching for ${leadIds.length} leads: ${leadIds.join(', ')} (sandbox=${isSandbox}, headed=${isHeaded})...`);

  if (process.platform === 'darwin') {
    try {
      execSync('swift -e "import Foundation; import CoreServices; LSSetDefaultHandlerForURLScheme(\\"mailto\\" as NSString as CFString, \\"com.google.Chrome\\" as NSString as CFString); LSSetDefaultHandlerForURLScheme(\\"tel\\" as NSString as CFString, \\"com.google.Chrome\\" as NSString as CFString);"', { stdio: 'ignore' });
    } catch (_) {}
  }

  const instProfile = path.join(os.tmpdir(), `leadmachine_w${workerId}_${Date.now()}`);
  fs.mkdirSync(instProfile, { recursive: true });

  let browser = await puppeteer.launch({
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
      '--ignore-certificate-errors',
      '--window-size=1280,800'
    ]
  });

  const placeholders = leadIds.map(() => '?').join(',');
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

  const results = [];
  for (const lead of leads) {
    if (!browser || !browser.connected) {
      browser = await puppeteer.launch({
        executablePath: CHROME_BIN,
        headless: isHeaded ? false : 'new',
        userDataDir: instProfile,
        timeout: 60000,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    try {
      const res = await Promise.race([
        processLead(browser, lead, agentName, isSandbox),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout (75s)')), 75000))
      ]);
      results.push(res);
      // Real-time IPC notification for live streaming
      console.log(`EVENT_LEAD_RESULT:${JSON.stringify(res)}`);
    } catch (e) {
      console.log(`[${agentName}] Error on #${lead.id}:`, e.message);
      saveLeadResult(lead.id, 'unable_to_reach', `Timeout or error: ${e.message}`, isSandbox);
      const errRes = { id: lead.id, company: lead.company_name, status: 'unable_to_reach', result: e.message };
      results.push(errRes);
      console.log(`EVENT_LEAD_RESULT:${JSON.stringify(errRes)}`);
    }
  }

  try { await browser.close(); } catch (_) {}
  try { fs.rmSync(instProfile, { recursive: true, force: true }); } catch (_) {}
  try { db.close(); } catch (_) {}

  console.log(`🏁 [${agentName}] Completed batch of ${results.length} leads.`);
  process.exit(0);
}

if (process.argv[1] && (process.argv[1].endsWith('worker.mjs') || process.argv[1].endsWith('worker'))) {
  runWorker();
}
