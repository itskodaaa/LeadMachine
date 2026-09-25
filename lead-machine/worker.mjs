import dns from 'dns';
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

// Rule 2 Invariant: Priority IPv4 networking to prevent IPv6 timeout hangs
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

import { getDbPath, getConfigPath, getScreenshotsDir } from './paths.mjs';
import { applyPerformancePragmas } from './db_migration.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
puppeteer.use(StealthPlugin());

const STEALTH_LAUNCH_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--ignore-certificate-errors',
  '--disable-blink-features=AutomationControlled',
  '--dns-result-order=ipv4first',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-background-networking',
  '--window-size=1366,768'
];

// Resolve database path
const dbPath = getDbPath();
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const db = new Database(dbPath);
applyPerformancePragmas(db);
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
  const cfgPath = getConfigPath();
  let sender = {};
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
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
  'in touch shortly',
  'your submission has been received',
  'submission has been received',
  'has been received',
  'thank you for submitting',
  'thank you for your submission',
  'thank you for your request',
  'we will respond shortly',
  'message sent',
  'sent successfully'
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
  'there was a problem',
  'invalid selection',
  'please review the fields below',
  'suspected as abusive usage',
  'the captcha field cannot be blank',
  'please enter your name',
  'please enter your message',
  'oops, there was an error sending your message',
  'one or more fields have an error',
  'could you please try again'
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
    const cfgPath = getConfigPath();
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg.settings && cfg.settings.debugMode === true) return true;
      if (cfg.debugMode === true) return true;
    }
  } catch (_) {}
  return false;
}

async function captureFailureScreenshot(page, leadId) {
  try {
    if (!isDebugModeEnabled() || !page || page.isClosed()) return null;
    const shotsDir = getScreenshotsDir();
    if (!fs.existsSync(shotsDir)) fs.mkdirSync(shotsDir, { recursive: true });
    const filename = `lead_${leadId}_${Date.now()}.png`;
    const fullPath = path.join(shotsDir, filename);

    // Optimized full-page screenshot with safe height clamping (max 5000px) and timeout protection
    await Promise.race([
      (async () => {
        try {
          const dims = await page.evaluate(() => {
            const body = document.body;
            const doc = document.documentElement;
            const scrollH = Math.max(
              body ? body.scrollHeight : 768,
              body ? body.offsetHeight : 768,
              doc ? doc.clientHeight : 768,
              doc ? doc.scrollHeight : 768,
              doc ? doc.offsetHeight : 768
            );
            return {
              width: 1366,
              height: Math.min(5000, Math.max(768, scrollH))
            };
          }).catch(() => ({ width: 1366, height: 768 }));

          await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
          await page.setViewport({ width: dims.width, height: dims.height });
          await new Promise(r => setTimeout(r, 200));
          await page.screenshot({ path: fullPath, fullPage: false, type: 'png' });
        } catch (_) {
          await page.screenshot({ path: fullPath, fullPage: false });
        }
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Screenshot timeout')), 5000))
    ]);

    return `/api/debug/screenshot/${filename}`;
  } catch (err) {
    console.error(`[Worker] Screenshot capture failed: ${err.message}`);
    return null;
  }
}

async function dismissCookieBanners(page) {
  try {
    if (!page || page.isClosed()) return;
    await page.evaluate(() => {
      const cookieKeywords = ['accept', 'accept all', 'agree', 'i agree', 'allow all', 'got it', 'close', 'decline'];
      const candidates = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
      for (const btn of candidates) {
        const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
        const id = (btn.id || '').toLowerCase();
        const className = (btn.className || '').toString().toLowerCase();
        const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

        const isCookieContext = id.includes('cookie') || className.includes('cookie') || ariaLabel.includes('cookie') ||
                                id.includes('consent') || className.includes('consent') || id.includes('notice') || className.includes('banner');

        if (isCookieContext || cookieKeywords.includes(text)) {
          if (cookieKeywords.some(k => text === k || text.startsWith(k + ' ') || text.endsWith(' ' + k))) {
            const style = window.getComputedStyle(btn);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && btn.offsetHeight > 0) {
              btn.click();
              return true;
            }
          }
        }
      }
      return false;
    });
  } catch (_) {}
}

async function detectInterstitialSecurityWall(page) {
  try {
    return await page.evaluate(() => {
      const text = (document.body ? document.body.innerText.toLowerCase() : '');
      const title = (document.title || '').toLowerCase();

      // Check if page has legitimate content or form inputs
      const hasInputs = Boolean(document.querySelector('input:not([type="hidden"]), textarea'));

      // Cloudflare Interstitial Wall (5-second challenge or Ray ID block page with no site content)
      if (!hasInputs && (
          title.includes('just a moment...') ||
          title.includes('attention required! | cloudflare') ||
          text.includes('checking your browser before accessing') ||
          text.includes('please enable javascript and cookies') ||
          (text.includes('cloudflare') && text.includes('ray id') && (text.includes('error') || text.includes('block'))))) {
        return { isBlocked: true, reason: 'Cloudflare Interstitial Challenge Wall' };
      }

      // WAF 403 Access Denied
      if (!hasInputs && text.includes('access denied') && (text.includes('waf') || text.includes('firewall') || text.includes('403 forbidden') || text.includes('perimeterx') || text.includes('ddos-guard'))) {
        return { isBlocked: true, reason: 'Security Firewall / WAF Block' };
      }

      return { isBlocked: false, reason: null };
    });
  } catch (_) {
    return { isBlocked: false, reason: null };
  }
}

async function handleFormSecurity(page) {
  try {
    // 1. Cloudflare Turnstile checkbox auto-interaction
    const turnstileIframe = await page.$('iframe[src*="challenges.cloudflare.com"]');
    if (turnstileIframe) {
      const box = await turnstileIframe.boundingBox();
      if (box && box.width > 20 && box.height > 20) {
        const clickX = box.x + 30;
        const clickY = box.y + (box.height / 2);
        await page.mouse.move(clickX - 10, clickY - 10);
        await new Promise(r => setTimeout(r, 150));
        await page.mouse.click(clickX, clickY);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // 2. Google reCAPTCHA v2 checkbox auto-interaction
    const recaptchaIframe = await page.$('iframe[title="reCAPTCHA"], iframe[src*="recaptcha/api2/anchor"]');
    if (recaptchaIframe) {
      const frame = await recaptchaIframe.contentFrame();
      if (frame) {
        const anchor = await frame.$('#recaptcha-anchor');
        if (anchor) {
          const isChecked = await frame.evaluate(el => el.getAttribute('aria-checked') === 'true', anchor);
          if (!isChecked) {
            await anchor.click();
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
    }
  } catch (_) {}
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
  await page.setViewport({ width: 1366, height: 768 });
  page.on('dialog', async dialog => { try { await dialog.dismiss(); } catch (_) {} });
  await page.setRequestInterception(true);
  const BLOCKED_TYPES = new Set(['image', 'media', 'imageset']);
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
    const isSecurityDomain = url.includes('challenges.cloudflare.com') ||
                             url.includes('recaptcha') ||
                             url.includes('hcaptcha') ||
                             url.includes('gstatic.com');
    if (url.includes('mailto:') || url.includes('tel:') || url.includes('127.0.0.1:12345')) {
      req.abort().catch(() => {});
    } else if (!isSecurityDomain && BLOCKED_TYPES.has(type)) {
      req.abort().catch(() => {});
    } else if (!isSecurityDomain && BLOCKED_DOMAINS.some(d => url.includes(d))) {
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

    // Check for hard interstitial security wall
    const initialSecurity = await detectInterstitialSecurityWall(page);
    if (initialSecurity.isBlocked) {
      const shot = await captureFailureScreenshot(page, lead.id);
      saveLeadResult(lead.id, 'captcha_blocked', `Blocked by ${initialSecurity.reason}`, isSandbox, initialSecurity.reason, shot);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'captcha_blocked', result: initialSecurity.reason };
    }

    // Auto-dismiss cookie overlays on landing
    await dismissCookieBanners(page);

    // Wait for any SPA / Wix / Next.js scripts to finish hydrating
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 });
    } catch (_) {}

    // Check if current page already hosts an eligible contact or quote form
    const hasFormAlready = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      const visible = inputs.filter(i => {
        const t = (i.getAttribute('type') || i.type || 'text').toLowerCase();
        return t !== 'submit' && t !== 'button' && t !== 'reset' && t !== 'search' && (i.offsetWidth > 0 || i.offsetHeight > 0);
      });
      return visible.length >= 3;
    }).catch(() => false);

    // Find contact link if not already on contact page and current page lacks a form
    const currentUrl = page.url().toLowerCase();
    let contactPageUrl = currentUrl;

    if (!hasFormAlready && !currentUrl.includes('contact') && !currentUrl.includes('quote') && !currentUrl.includes('inquiry')) {
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

        const contactSecurity = await detectInterstitialSecurityWall(page);
        if (contactSecurity.isBlocked) {
          const shot = await captureFailureScreenshot(page, lead.id);
          saveLeadResult(lead.id, 'captcha_blocked', `Blocked on contact page by ${contactSecurity.reason}`, isSandbox, contactSecurity.reason, shot);
          await safeClose(page);
          return { id: lead.id, company: lead.company_name, status: 'captcha_blocked', result: contactSecurity.reason };
        }
      }
    }

    // Dismiss any cookie banner on the target page
    await dismissCookieBanners(page);

    // Wait for SPA / dynamic forms to hydrate on the contact page
    try {
      await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 });
    } catch (_) {}

    // Scroll through the page and activate deferred / custom dropdowns (Wix ComboBox, Choices.js)
    await page.evaluate(() => {
      window.scrollBy({ top: 400, behavior: 'smooth' });
      const formEl = document.querySelector('form, [data-testid="form"], select, input');
      if (formEl) formEl.scrollIntoView({ behavior: 'instant', block: 'center' });
    }).catch(() => {});
    await new Promise(r => setTimeout(r, 600));

    // Wake up and populate options in dynamic select dropdowns
    try {
      const selectElements = await page.$$('select, [data-testid="select-trigger"], .wixui-dropdown__input');
      for (const sel of selectElements) {
        const optCount = await page.evaluate(el => el.options ? el.options.length : 0, sel).catch(() => 0);
        if (optCount <= 1) {
          await sel.click().catch(() => {});
          await new Promise(r => setTimeout(r, 150));
        }
      }
    } catch (_) {}

    // Ensure fresh profile per lead
    const currentProfile = getFreshSenderProfile();

    // High-Precision Multi-Stage Form Search & Autofill
    const formFilled = await page.evaluate((profile, leadData) => {
      // 1. Identify and score all forms on the page to target the real contact form
      const allForms = Array.from(document.querySelectorAll('form'));
      let targetForm = null;

      if (allForms.length > 0) {
        let bestScore = -999;
        for (const form of allForms) {
          let score = 0;
          const formText = (form.id + ' ' + form.className + ' ' + (form.getAttribute('action') || '')).toLowerCase();
          
          if (formText.includes('search') || formText.includes('newsletter') || formText.includes('subscribe')) score -= 50;
          
          const formInputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea, select'));
          if (formInputs.length <= 1) score -= 30;

          if (formText.includes('contact') || formText.includes('inquiry') || formText.includes('quote') || formText.includes('lead') || formText.includes('reach')) score += 50;
          if (formText.includes('wpforms') || formText.includes('gform') || formText.includes('elementor-form') || formText.includes('frm_pro_form') || formText.includes('cf7') || formText.includes('ninja-form')) score += 40;

          for (const inp of formInputs) {
            const type = (inp.getAttribute('type') || inp.type || 'text').toLowerCase();
            const desc = (inp.name + ' ' + inp.id + ' ' + inp.placeholder).toLowerCase();
            if (inp.tagName.toLowerCase() === 'textarea') score += 20;
            if (type === 'email' || desc.includes('email')) score += 15;
            if (type === 'tel' || desc.includes('phone') || desc.includes('tel')) score += 15;
            if (desc.includes('name')) score += 10;
            if (desc.includes('message') || desc.includes('comment')) score += 15;
          }

          if (score > bestScore) {
            bestScore = score;
            targetForm = form;
          }
        }
        if (bestScore < 0 && allForms.length > 1) {
          targetForm = null;
        }
      }

      // 2. Strict Input Eligibility & Anti-Honeypot Filter
      function isEligibleInput(input) {
        if (!input) return false;
        const type = (input.getAttribute('type') || input.type || 'text').toLowerCase();
        if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'reset' || type === 'image') return false;
        if (type === 'search' || type === 'password' || type === 'file') return false;

        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const className = (input.className || '').toLowerCase();

        // Spam traps & honeypot identifiers (Elementor, Akismet, Ninja Forms, reCAPTCHA hidden tokens)
        const honeypotTokens = [
          'ak_hp', 'honeypot', 'hp_', '_hp', 'ninja_forms_honeypot', 'trap', 'bot_check', 'leave_blank',
          'g-recaptcha-response', 'h-captcha-response', 'cf-turnstile-response', 'recaptcha', 'turnstile',
          'antispam', 'anti-spam', 'timestamp'
        ];
        if (honeypotTokens.some(tok => name.includes(tok) || id.includes(tok) || className.includes(tok))) {
          return false;
        }

        // Tabindex -1 without required is a classic honeypot marker
        if (input.getAttribute('tabindex') === '-1' && !input.hasAttribute('required')) {
          return false;
        }

        // Check CSS visibility
        const style = window.getComputedStyle(input);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;

        // Check bounding dimensions
        const rect = input.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0 && !input.getClientRects().length) return false;
        if (rect.left < -300 || rect.top < -300) return false;

        // Check parent container visibility (e.g. elementor-field-type-honeypot, gfield--type-honeypot, or hidden wrapper)
        let parent = input.parentElement;
        let depth = 0;
        while (parent && parent !== document.body && depth < 8) {
          const pStyle = window.getComputedStyle(parent);
          if (pStyle.display === 'none' || pStyle.visibility === 'hidden') return false;
          if (pStyle.position === 'absolute' && (pStyle.left?.includes('-999') || pStyle.top?.includes('-999'))) return false;
          const pClass = (parent.className || '').toLowerCase();
          if (pClass.includes('honeypot') || pClass.includes('ak_hp') || pClass.includes('ninja-forms-hp') || pClass.includes('gform_validation_container') || pClass.includes('gfield--type-honeypot')) return false;
          parent = parent.parentElement;
          depth++;
        }

        return true;
      }

      // 3. Clean Descriptor Builder (Prioritizes explicit labels over broad ancestors)
      function getInputDescriptor(input) {
        const type = (input.getAttribute('type') || input.type || 'text').toLowerCase();
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();

        let labelText = '';
        if (input.labels && input.labels.length > 0) {
          labelText = Array.from(input.labels).map(l => l.innerText || '').join(' ');
        }
        if (!labelText && input.getAttribute('aria-labelledby')) {
          const labelledBy = document.getElementById(input.getAttribute('aria-labelledby'));
          if (labelledBy) labelText = labelledBy.innerText || '';
        }
        if (!labelText && input.previousElementSibling && (input.previousElementSibling.tagName.toLowerCase() === 'label' || input.previousElementSibling.classList.contains('label'))) {
          labelText = input.previousElementSibling.innerText || '';
        }
        if (!labelText && input.parentElement && input.parentElement.tagName.toLowerCase() === 'label') {
          labelText = input.parentElement.innerText || '';
        }
        if (!labelText && input.parentElement && input.parentElement.innerText && input.parentElement.innerText.length < 80) {
          labelText = input.parentElement.innerText;
        }

        labelText = labelText.toLowerCase().replace(/\s+/g, ' ').trim();
        return {
          type,
          name,
          id,
          placeholder,
          ariaLabel,
          autocomplete,
          labelText,
          combined: `${name} ${id} ${placeholder} ${ariaLabel} ${autocomplete} ${labelText}`.toLowerCase()
        };
      }

      // 4. Framework-Safe Native Value Setter (React 16-19, Vue, Wix, Webflow, Standard)
      function setInputValue(input, value) {
        if (value === null || value === undefined) return;
        const strVal = String(value);
        const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');

        input.focus();
        if (desc && desc.set) {
          desc.set.call(input, strVal);
        } else {
          input.value = strVal;
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      // 5. Intelligent Phone Number Normalizer
      function normalizePhone(input, desc, rawPhone) {
        const digits = rawPhone.replace(/\D/g, '');
        const hyphen = digits.length === 10 ? `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}` : rawPhone;
        const paren = digits.length === 10 ? `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}` : rawPhone;

        const maxLen = input.maxLength;
        if (desc.combined.includes('area') || maxLen === 3) return digits.slice(0, 3);
        if (desc.combined.includes('prefix')) return digits.slice(3, 6);
        if (desc.combined.includes('line') || (desc.combined.includes('phone') && maxLen === 4)) return digits.slice(6);

        const pattern = input.getAttribute('pattern') || '';
        // If type="number", inputmode="numeric", digit-only pattern, or maxlength 10: pass pure digits!
        if (desc.type === 'number' || input.getAttribute('inputmode') === 'numeric' || (pattern && !pattern.includes('-') && pattern.includes('[0-9]')) || maxLen === 10) {
          return digits;
        }
        if (desc.placeholder.includes('(') || desc.placeholder.includes(')')) return paren;
        return hyphen;
      }

      // 6. Dynamic Message Variable Substitution
      let dynamicMessage = profile.message || '';
      dynamicMessage = dynamicMessage.replace(/{company_name}/gi, leadData.company_name || 'your company');
      dynamicMessage = dynamicMessage.replace(/{first_name}/gi, (leadData.contact_person ? leadData.contact_person.split(' ')[0] : 'there'));
      dynamicMessage = dynamicMessage.replace(/{city}/gi, leadData.city || '');
      dynamicMessage = dynamicMessage.replace(/{state}/gi, leadData.state || '');
      dynamicMessage = dynamicMessage.replace(/{full_name}/gi, profile.fullName || '');
      dynamicMessage = dynamicMessage.replace(/{job_title}/gi, profile.jobTitle || '');
      dynamicMessage = dynamicMessage.replace(/{company_sender}/gi, profile.company || '');

      // Scope to targetForm or entire document if no clear form container
      const scope = targetForm || document;
      const allInputs = Array.from(scope.querySelectorAll('input:not([type="hidden"]), select, textarea'));
      const eligibleInputs = allInputs.filter(isEligibleInput);

      if (eligibleInputs.length === 0) return { filled: false, reason: 'No eligible inputs found' };

      let filledCount = 0;
      const filledDetails = [];

      for (const input of eligibleInputs) {
        const desc = getInputDescriptor(input);
        const tag = input.tagName.toLowerCase();

        // Checkbox & Radio Buttons
        if (desc.type === 'checkbox' || desc.type === 'radio') {
          const isRequired = input.required || input.hasAttribute('required') || input.getAttribute('aria-required') === 'true';
          const isGender = /\b(gender|sex|salutation|title)\b/i.test(desc.combined);
          const isConsent = desc.combined.includes('agree') || desc.combined.includes('consent') || desc.combined.includes('term') || desc.combined.includes('policy') || desc.combined.includes('opt-in') || desc.combined.includes('contact me') || desc.combined.includes('text') || desc.combined.includes('sms');
          
          if (desc.type === 'radio') {
            const name = input.name;
            const group = name ? Array.from(scope.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)) : [input];
            const hasChecked = group.some(r => r.checked);
            if (!hasChecked && (isRequired || isGender)) {
              let targetRadio = null;
              if (isGender) {
                targetRadio = group.find(r => /\b(female|woman|ms|mrs|f)\b/i.test(r.value) || /\b(female|woman|ms|mrs|f)\b/i.test(getInputDescriptor(r).combined));
              }
              if (!targetRadio) {
                targetRadio = group[Math.floor(Math.random() * group.length)];
              }
              if (targetRadio) {
                try { targetRadio.click(); } catch (_) { targetRadio.checked = true; }
                targetRadio.checked = true;
                targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
                filledCount++;
                filledDetails.push({ field: name || 'radio', set: targetRadio.value || '[CHECKED]' });
              }
            }
          } else if (isRequired || isConsent) {
            if (!input.checked) {
              try { input.click(); } catch (_) { input.checked = true; }
            }
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id || desc.type, set: '[CHECKED]' });
          }
          continue;
        }

        // Dropdown Select Elements
        if (tag === 'select') {
          if (input.options && input.options.length > 0) {
            const isGender = /\b(gender|sex|salutation|title|honorific|prefix)\b/i.test(desc.combined);
            const isCountry = /\b(country|nation)\b/i.test(desc.combined);
            const isState = /\b(state|province|region)\b/i.test(desc.combined);
            const targetState = (profile.state || '').toLowerCase();
            const targetStateFull = (profile.stateFull || 'virginia').toLowerCase();

            // Filter out empty placeholder options
            const validOptions = Array.from(input.options).filter(o => {
              if (o.disabled) return false;
              const val = (o.value || '').trim();
              const txt = (o.text || '').trim().toLowerCase();
              if (val === '' && (/\b(choose|select|pick|none|--|\.\.\.)\b/i.test(txt) || txt === '')) return false;
              return true;
            });

            let chosenOpt = null;

            if (isGender) {
              // User explicit instruction: "when it comes to gender, it should fill in female"
              chosenOpt = validOptions.find(o => /\b(female|woman|ms|mrs|miss|f)\b/i.test(o.text) || /\b(female|woman|ms|mrs|miss|f)\b/i.test(o.value));
            } else if (isCountry) {
              chosenOpt = validOptions.find(o => {
                const txt = (o.text || '').toLowerCase();
                const val = (o.value || '').toLowerCase();
                return val === 'us' || val === 'usa' || val === '+1' || txt.includes('united states') || txt.includes('usa');
              });
            } else if (isState) {
              chosenOpt = validOptions.find(o => {
                const txt = (o.text || '').toLowerCase();
                const val = (o.value || '').toLowerCase();
                return val === targetState || txt === targetState || txt.includes(targetStateFull);
              });
            }

            // Keyword match for services/inquiries
            if (!chosenOpt) {
              chosenOpt = validOptions.find(o => {
                const txt = (o.text || '').toLowerCase();
                return /\b(commercial|quote|estimate|inquiry|service|general|repair|inspection|consultation)\b/i.test(txt);
              });
            }

            // User explicit instruction: fill random valid option to pass required option field
            if (!chosenOpt && validOptions.length > 0) {
              chosenOpt = validOptions[Math.floor(Math.random() * validOptions.length)];
            }

            if (chosenOpt) {
              // Select across single and multi-select formats
              chosenOpt.selected = true;
              input.selectedIndex = chosenOpt.index;
              try { input.value = chosenOpt.value; } catch (_) {}
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              input.dispatchEvent(new Event('blur', { bubbles: true }));
              filledCount++;
              filledDetails.push({ field: desc.name || desc.id || 'select', set: chosenOpt.text });
            }
          }
          continue;
        }

        let valToSet = null;

        // EMAIL
        if (desc.type === 'email' || desc.autocomplete.includes('email') || /\b(e-?mail)\b/i.test(desc.name) || /\b(e-?mail)\b/i.test(desc.id) || /\b(e-?mail)\b/i.test(desc.labelText) || /\b(e-?mail)\b/i.test(desc.placeholder)) {
          valToSet = profile.email;
        }
        // PHONE (Explicitly excludes fax)
        else if (desc.type === 'tel' || desc.autocomplete.includes('tel') || (/\b(phone|telephone|mobile|cell|contact[_\s-]?number)\b/i.test(desc.combined) && !desc.combined.includes('fax'))) {
          valToSet = normalizePhone(input, desc, profile.phone);
        }
        // COMPANY (Evaluated BEFORE generic name so company_name is never filled with personal name)
        else if (/\b(company[_\s-]?name|company|organization|organisation|business[_\s-]?name|business|firm)\b/i.test(desc.name) || /\b(company|organization|business)\b/i.test(desc.id) || /\b(company|organization|business)\b/i.test(desc.labelText) || /\b(company|organization|business)\b/i.test(desc.placeholder)) {
          valToSet = profile.company;
        }
        // FIRST NAME
        else if (/\b(first[_\s-]?name|fname|given[_\s-]?name|forename)\b/i.test(desc.combined) && !desc.combined.includes('last')) {
          valToSet = profile.firstName;
        }
        // LAST NAME
        else if (/\b(last[_\s-]?name|lname|surname|family[_\s-]?name)\b/i.test(desc.combined) && !desc.combined.includes('first')) {
          valToSet = profile.lastName;
        }
        // FULL NAME / CONTACT NAME
        else if (/\b(full[_\s-]?name|your[_\s-]?name|contact[_\s-]?name|name)\b/i.test(desc.name) || /\b(full[_\s-]?name|your[_\s-]?name|contact[_\s-]?name|name)\b/i.test(desc.id) || /\b(your[_\s-]?name|contact[_\s-]?name|name)\b/i.test(desc.labelText) || /\b(your[_\s-]?name|name)\b/i.test(desc.placeholder)) {
          valToSet = profile.fullName;
        }
        // JOB TITLE
        else if (/\b(job[_\s-]?title|title|role|position|designation)\b/i.test(desc.combined) && !desc.combined.includes('sub')) {
          valToSet = profile.jobTitle;
        }
        // WEBSITE / URL
        else if (/\b(website|web[_\s-]?site|url|domain)\b/i.test(desc.combined)) {
          valToSet = profile.website;
        }
        // STREET ADDRESS / ADDRESS LINE 1
        else if (/\b(street[_\s-]?address|address[_\s-]?line[_\s-]?1|address1|street|line[_\s-]?1)\b/i.test(desc.combined) || (/\b(address)\b/i.test(desc.combined) && !desc.combined.includes('email') && !desc.combined.includes('ip') && !desc.combined.includes('web'))) {
          valToSet = profile.address;
        }
        // SUITE / APT / ADDRESS LINE 2
        else if (/\b(suite|apt|apartment|unit|address[_\s-]?line[_\s-]?2|address2|line[_\s-]?2)\b/i.test(desc.combined)) {
          valToSet = profile.suite || '';
        }
        // CITY
        else if (/\b(city|town|municipality)\b/i.test(desc.combined)) {
          valToSet = profile.city;
        }
        // STATE
        else if (/\b(state|province|region)\b/i.test(desc.combined)) {
          valToSet = profile.state;
        }
        // ZIP / POSTAL CODE
        else if (/\b(zip[_\s-]?code|zip|postal[_\s-]?code|postcode)\b/i.test(desc.combined)) {
          valToSet = profile.zip;
        }
        // COUNTRY
        else if (/\b(country|nation)\b/i.test(desc.combined)) {
          valToSet = profile.country;
        }
        // REFERRAL / "HOW DID YOU HEAR ABOUT US"
        else if (/\b(hear[_\s-]?about|referral|found[_\s-]?us|how[_\s-]?did[_\s-]?you)\b/i.test(desc.combined)) {
          valToSet = 'Online Search / Directory';
        }
        // SUBJECT / REASON FOR INQUIRY
        else if (/\b(subject|regarding|topic|inquiry[_\s-]?type|reason)\b/i.test(desc.combined)) {
          valToSet = profile.subject;
        }
        // MESSAGE / TEXTAREA
        else if (tag === 'textarea' || /\b(message|comment|detail|description|describe|brief[_\s-]?description|how[_\s-]?can[_\s-]?we[_\s-]?help|inquiry|body|note|request)\b/i.test(desc.combined)) {
          valToSet = dynamicMessage;
        }
        // SIMPLE ARITHMETIC CAPTCHA SOLVER
        else if (/\b(captcha|human[_\s-]?verification|math|security[_\s-]?question)\b/i.test(desc.combined)) {
          const mathMatch = desc.combined.match(/(\d+)\s*([\+\-\*])\s*(\d+)/);
          if (mathMatch) {
            const num1 = parseInt(mathMatch[1], 10);
            const op = mathMatch[2];
            const num2 = parseInt(mathMatch[3], 10);
            let ans = 0;
            if (op === '+') ans = num1 + num2;
            else if (op === '-') ans = num1 - num2;
            else if (op === '*') ans = num1 * num2;
            valToSet = String(ans);
          }
        }

        if (valToSet !== null && valToSet !== undefined) {
          setInputValue(input, valToSet);
          filledCount++;
          filledDetails.push({ field: desc.name || desc.id || desc.type, set: valToSet.length > 40 ? valToSet.substring(0, 37) + '...' : valToSet });
        }
      }

      // 7. Pre-Submit Self-Healing Validation Sweep
      for (const input of eligibleInputs) {
        const isRequired = input.required || input.hasAttribute('required') || input.getAttribute('aria-required') === 'true' || input.classList.contains('required') || input.getAttribute('aria-invalid') === 'true';
        const isValid = typeof input.checkValidity === 'function' ? input.checkValidity() : true;

        if (isRequired && (!isValid || !input.value || input.value.trim() === '')) {
          const desc = getInputDescriptor(input);
          const tag = input.tagName.toLowerCase();
          const isGender = /\b(gender|sex|salutation|title|honorific)\b/i.test(desc.combined);

          if (tag === 'select') {
            const validOptions = Array.from(input.options).filter(o => !o.disabled && (o.value || '').trim() !== '' && !/\b(choose|select|pick|none|--)\b/i.test((o.text || '').toLowerCase()));
            let chosen = null;
            if (isGender) {
              chosen = validOptions.find(o => /\b(female|woman|ms|mrs|f)\b/i.test(o.text) || /\b(female|woman|f)\b/i.test(o.value));
            }
            if (!chosen && validOptions.length > 0) {
              chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
            }
            if (chosen) {
              chosen.selected = true;
              input.selectedIndex = chosen.index;
              try { input.value = chosen.value; } catch (_) {}
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
              filledDetails.push({ field: desc.name || desc.id, set: chosen.text });
            }
          } else if (desc.type === 'checkbox' || desc.type === 'radio') {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: '[CHECKED]' });
          } else if (desc.type === 'number') {
            const randNum = String(Math.floor(Math.random() * 5) + 1);
            setInputValue(input, randNum);
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: randNum });
          } else if (desc.type === 'date') {
            const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
            setInputValue(input, tomorrow);
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: tomorrow });
          } else if (isGender) {
            setInputValue(input, 'Female');
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: 'Female' });
          } else if (desc.combined.includes('email')) {
            setInputValue(input, profile.email);
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: profile.email });
          } else if (desc.combined.includes('phone') || desc.combined.includes('tel')) {
            const p = normalizePhone(input, desc, profile.phone);
            setInputValue(input, p);
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: p });
          } else if (desc.combined.includes('city')) {
            setInputValue(input, profile.city);
            filledCount++;
          } else if (desc.combined.includes('state')) {
            setInputValue(input, profile.state);
            filledCount++;
          } else if (desc.combined.includes('zip')) {
            setInputValue(input, profile.zip);
            filledCount++;
          } else if (desc.combined.includes('address')) {
            setInputValue(input, profile.address);
            filledCount++;
          } else if (desc.combined.includes('time') || desc.combined.includes('when')) {
            setInputValue(input, '1-2 weeks');
            filledCount++;
          } else if (desc.combined.includes('budget')) {
            setInputValue(input, '$5,000 - $10,000');
            filledCount++;
          } else if (desc.combined.includes('service') || desc.combined.includes('project') || desc.combined.includes('work')) {
            setInputValue(input, 'Commercial Services / Inspection');
            filledCount++;
          } else {
            setInputValue(input, profile.subject || 'Commercial Collaboration Inquiry');
            filledCount++;
            filledDetails.push({ field: desc.name || desc.id, set: profile.subject });
          }
        }
      }

      return {
        filled: filledCount >= 2,
        count: filledCount,
        details: filledDetails,
        targetFormId: targetForm?.id || targetForm?.className || null
      };
    }, currentProfile, lead);

    if (!formFilled.filled) {
      const shot = await captureFailureScreenshot(page, lead.id);
      saveLeadResult(lead.id, 'no_form_found', `No suitable web contact form found on ${contactPageUrl}`, isSandbox, 'No web form found', shot);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'no_form_found', result: 'No web form found' };
    }

    // Auto-resolve any interactive form security (Turnstile / reCAPTCHA checkbox)
    await handleFormSecurity(page);

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

    // Resolve form security again right before clicking submit
    await handleFormSecurity(page);

    // Submit form (Targeted submit button inside active form container with trusted mouse interaction)
    const initUrl = page.url();

    // 1. Advance Multi-Step Form if Next button exists
    const advancedStep = await page.evaluate((targetFormId) => {
      let form = null;
      if (targetFormId) {
        form = document.getElementById(targetFormId) || document.querySelector(`form.${CSS.escape(targetFormId)}`) || document.querySelector(`.${CSS.escape(targetFormId)}`);
      }
      const scope = form || document;
      const nextBtn = Array.from(scope.querySelectorAll('button, a.btn, a.button, input[type="button"]')).find(b => {
        const t = (b.innerText || b.value || '').toLowerCase().trim();
        return (t === 'next' || t.startsWith('next ') || t === 'continue' || t.startsWith('continue ') || t === 'proceed') && b.offsetWidth > 0 && b.offsetHeight > 0;
      });
      if (nextBtn) {
        nextBtn.click();
        return true;
      }
      return false;
    }, formFilled.targetFormId).catch(() => false);

    if (advancedStep) {
      await new Promise(r => setTimeout(r, 1000));
      // Populate step 2 inputs if any
      await page.evaluate((profile, leadData) => {
        const stepInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select')).filter(i => (i.offsetWidth > 0 || i.offsetHeight > 0) && (!i.value || i.value.trim() === ''));
        for (const input of stepInputs) {
          const type = (input.getAttribute('type') || input.type || 'text').toLowerCase();
          const desc = `${input.name} ${input.id} ${input.placeholder}`.toLowerCase();
          if (type === 'checkbox' || type === 'radio') {
            if (!input.checked) try { input.click(); } catch (_) { input.checked = true; }
          } else if (input.tagName.toLowerCase() === 'textarea' || desc.includes('message') || desc.includes('detail') || desc.includes('description')) {
            const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(input, profile.message);
            else input.value = profile.message;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }, currentProfile, lead).catch(() => {});
    }

    // 2. Resolve button coordinates and click with trusted mouse events
    const btnCoords = await page.evaluate((targetFormId) => {
      let form = null;
      if (targetFormId) {
        form = document.getElementById(targetFormId) || document.querySelector(`form.${CSS.escape(targetFormId)}`) || document.querySelector(`.${CSS.escape(targetFormId)}`);
      }
      const scope = form || document;
      const submitBtn = scope.querySelector('button[type="submit"], input[type="submit"]') ||
                        Array.from(scope.querySelectorAll('button, a.btn, a.button, input[type="button"]')).find(b => {
                          const t = (b.innerText || b.value || '').toLowerCase().trim();
                          return (t.includes('submit') || t.includes('send') || t.includes('request') || t.includes('inquire') || t.includes('contact')) && (b.offsetWidth > 0 || b.offsetHeight > 0);
                        });

      if (submitBtn) {
        submitBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
        const rect = submitBtn.getBoundingClientRect();
        return { found: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
      return { found: false };
    }, formFilled.targetFormId).catch(() => ({ found: false }));

    if (btnCoords && btnCoords.found && btnCoords.x > 0 && btnCoords.y > 0) {
      // Natural mouse movement curve to satisfy reCAPTCHA v3 & Turnstile bot heuristics
      await page.mouse.move(btnCoords.x, btnCoords.y, { steps: 8 }).catch(() => {});
      await new Promise(r => setTimeout(r, 200));
      await page.mouse.click(btnCoords.x, btnCoords.y).catch(() => {});
    } else {
      // Programmatic fallback
      await page.evaluate((targetFormId) => {
        let form = null;
        if (targetFormId) {
          form = document.getElementById(targetFormId) || document.querySelector(`form.${CSS.escape(targetFormId)}`) || document.querySelector(`.${CSS.escape(targetFormId)}`);
        }
        const scope = form || document;
        const submitBtn = scope.querySelector('button[type="submit"], input[type="submit"]') ||
                          Array.from(scope.querySelectorAll('button, a.btn, a.button, input[type="button"]')).find(b => {
                            const t = (b.innerText || b.value || '').toLowerCase().trim();
                            return t.includes('submit') || t.includes('send') || t.includes('request') || t.includes('inquire') || t.includes('contact');
                          });

        if (submitBtn) {
          submitBtn.scrollIntoView({ behavior: 'instant', block: 'center' });
          submitBtn.focus();
          submitBtn.click();
          return;
        }

        if (form) {
          if (typeof form.requestSubmit === 'function') form.requestSubmit();
          else form.submit();
          return;
        }

        const anyForm = document.querySelector('form');
        if (anyForm) {
          if (typeof anyForm.requestSubmit === 'function') anyForm.requestSubmit();
          else anyForm.submit();
        }
      }, formFilled.targetFormId).catch(() => {});
    }

    // 3. Post-Submit Adaptive Recovery Loop
    // User instruction: If rejected because a field is required, fill random options/values (gender=female) and retry submit
    await new Promise(r => setTimeout(r, 1500));
    const adaptiveRecovery = await page.evaluate((profile) => {
      // Check for HTML5 invalid inputs, empty required fields, or validation error blocks
      const invalidEls = Array.from(document.querySelectorAll(':invalid, [aria-invalid="true"]'));
      const emptyRequired = Array.from(document.querySelectorAll('input[required], select[required], textarea[required], [aria-required="true"], .required input, .required select'))
        .filter(el => {
          const type = (el.getAttribute('type') || el.type || 'text').toLowerCase();
          if (type === 'checkbox' || type === 'radio') return !el.checked;
          if (el.tagName.toLowerCase() === 'select') return !el.value || el.value === '' || (el.selectedIndex <= 0 && el.options[0]?.disabled);
          return !el.value || el.value.trim() === '';
        });

      const bodyText = (document.body ? document.body.innerText.toLowerCase() : '');
      const hasErrorNotice = [
        'this field is required',
        'please select an item',
        'please fill out this field',
        'please fill in all required fields',
        'required field',
        'cannot be blank',
        'invalid selection'
      ].some(sig => bodyText.includes(sig));

      const targets = Array.from(new Set([...invalidEls, ...emptyRequired]));
      if (targets.length === 0 && !hasErrorNotice) return { recovered: false, count: 0 };

      let recoveredCount = 0;
      const details = [];

      for (const input of targets) {
        const tag = input.tagName.toLowerCase();
        const type = (input.getAttribute('type') || input.type || 'text').toLowerCase();
        const desc = `${input.name} ${input.id} ${input.placeholder} ${input.className} ${input.getAttribute('aria-label') || ''}`.toLowerCase();
        const isGender = /\b(gender|sex|salutation|title|honorific)\b/i.test(desc);

        if (tag === 'select') {
          const validOptions = Array.from(input.options).filter(o => {
            if (o.disabled) return false;
            const val = (o.value || '').trim();
            const txt = (o.text || '').trim().toLowerCase();
            if (val === '' && (/\b(choose|select|pick|none|--|\.\.\.)\b/i.test(txt) || txt === '')) return false;
            return true;
          });

          if (validOptions.length > 0) {
            let chosen = null;
            if (isGender) {
              chosen = validOptions.find(o => /\b(female|woman|ms|mrs|miss|f)\b/i.test(o.text) || /\b(female|woman|ms|mrs|miss|f)\b/i.test(o.value));
            }
            if (!chosen) {
              chosen = validOptions[Math.floor(Math.random() * validOptions.length)];
            }
            chosen.selected = true;
            input.selectedIndex = chosen.index;
            try { input.value = chosen.value; } catch (_) {}
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            recoveredCount++;
            details.push({ field: input.name || input.id || 'select', set: chosen.text });
          }
        } else if (type === 'checkbox' || type === 'radio') {
          if (isGender) {
            if (/\b(female|woman|ms|mrs|f)\b/i.test(desc) || /\b(female|woman|f)\b/i.test(input.value)) {
              input.checked = true;
            }
          } else {
            input.checked = true;
          }
          input.dispatchEvent(new Event('change', { bubbles: true }));
          recoveredCount++;
          details.push({ field: input.name || input.id, set: '[CHECKED]' });
        } else if (type === 'number') {
          const randNum = String(Math.floor(Math.random() * 5) + 1);
          input.value = randNum;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          recoveredCount++;
          details.push({ field: input.name || input.id, set: randNum });
        } else if (type === 'date') {
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          input.value = tomorrow;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          recoveredCount++;
          details.push({ field: input.name || input.id, set: tomorrow });
        } else {
          let randomVal = profile.subject || 'Commercial Collaboration Inquiry';
          if (isGender) randomVal = 'Female';
          else if (desc.includes('time') || desc.includes('frame') || desc.includes('when')) randomVal = '1-2 weeks';
          else if (desc.includes('budget') || desc.includes('amount')) randomVal = '$5,000 - $10,000';
          else if (desc.includes('service') || desc.includes('project') || desc.includes('work')) randomVal = 'Commercial Services / Inspection';

          input.value = randomVal;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          recoveredCount++;
          details.push({ field: input.name || input.id, set: randomVal });
        }
      }

      return { recovered: recoveredCount > 0, count: recoveredCount, details };
    }, currentProfile).catch(() => ({ recovered: false, count: 0 }));

    if (adaptiveRecovery.recovered) {
      console.log(`[${agentName}] 🔄 Adaptive recovery activated for #${lead.id}: filled ${adaptiveRecovery.count} required fields/options:`, adaptiveRecovery.details);
      await new Promise(r => setTimeout(r, 600));
      // Re-click submit
      if (btnCoords && btnCoords.found && btnCoords.x > 0 && btnCoords.y > 0) {
        await page.mouse.click(btnCoords.x, btnCoords.y).catch(() => {});
      } else {
        await page.evaluate((targetFormId) => {
          const form = targetFormId ? document.getElementById(targetFormId) || document.querySelector(`form.${CSS.escape(targetFormId)}`) : document.querySelector('form');
          const submitBtn = form?.querySelector('button[type="submit"], input[type="submit"]') || document.querySelector('button[type="submit"], input[type="submit"]');
          if (submitBtn) submitBtn.click();
          else if (form) form.submit();
        }, formFilled.targetFormId).catch(() => {});
      }
    }

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

      // Check dedicated confirmation containers (WPForms, Elementor, Gravity Forms, Webflow, Wix, Fluent Forms)
      const containerSuccess = await page.evaluate(() => {
        const confContainers = document.querySelectorAll('.wpforms-confirmation-container, .elementor-message-success, .gforms_confirmation_message, .frm_message, .w-form-done, .ff-message-success, [data-testid="rich-text-confirmation"]');
        for (const c of confContainers) {
          const style = window.getComputedStyle(c);
          if (style.display !== 'none' && style.visibility !== 'hidden' && c.innerText.trim().length > 5) {
            return c.innerText.trim().slice(0, 100);
          }
        }
        return null;
      }).catch(() => null);

      if (containerSuccess) {
        isSuccess = true;
        confirmationPhrase = containerSuccess;
        break;
      }

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
      // Check for explicit error messages on the page
      const explicitError = await page.evaluate((errSignals) => {
        const errorEls = Array.from(document.querySelectorAll('.error, .alert, .wpforms-error, .elementor-message-danger, .gform_validation_errors, .frm_error_style, [role="alert"]'));
        for (const el of errorEls) {
          const t = (el.innerText || '').trim();
          if (t.length > 5 && t.length < 200) return t;
        }
        const body = (document.body ? document.body.innerText.toLowerCase() : '');
        for (const sig of errSignals) {
          if (body.includes(sig)) return `Page notice: "${sig}"`;
        }
        return null;
      }, ERROR_SIGNALS).catch(() => null);

      const failureNote = explicitError ? `Submission rejected: ${explicitError}` : 'Unconfirmed post-submission';
      console.log(`[${agentName}] ⚠️ #${lead.id} ${failureNote} (${elapsed}s)`);
      const shot = await captureFailureScreenshot(page, lead.id);
      saveLeadResult(lead.id, 'form_submit_error', `Contact form: ${contactPageUrl} (${failureNote})`, isSandbox, explicitError || 'Submission unconfirmed or rejected', shot);
      await safeClose(page);
      return { id: lead.id, company: lead.company_name, status: 'form_submit_error', time: elapsed, result: failureNote };
    }

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Check if error was caused by successful form submission navigation!
    if (err.message && err.message.includes('Execution context was destroyed')) {
      try {
        await new Promise(r => setTimeout(r, 2000));
        const postNavUrl = page.url();
        const postNavBody = await page.evaluate(() => document.body ? document.body.innerText.toLowerCase() : '').catch(() => '');
        const isSuccessNav = (postNavUrl && postNavUrl !== lead.website && (postNavUrl.includes('thank') || postNavUrl.includes('success') || postNavUrl.includes('confirm') || postNavUrl.includes('submitted'))) ||
                             SUCCESS_SIGNALS.some(s => postNavBody.includes(s));
        if (isSuccessNav) {
          console.log(`[${agentName}] ✅ #${lead.id} SUBMISSION CONFIRMED AFTER NAVIGATION: ${postNavUrl} (${elapsed}s)`);
          saveLeadResult(lead.id, 'contacted', `Contact form: ${contactPageUrl} (Submitted via page navigation: ${postNavUrl})`, isSandbox);
          await safeClose(page);
          return { id: lead.id, company: lead.company_name, status: 'contacted', time: elapsed, result: `Confirmed via navigation: ${postNavUrl}` };
        }
      } catch (_) {}
    }

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

  let currentBrowser = null;
  let currentInstProfile = null;

  const cleanupBrowser = async () => {
    if (currentBrowser) {
      const b = currentBrowser;
      currentBrowser = null;
      const browserPid = b.process() ? b.process().pid : null;
      try {
        const pages = await b.pages();
        for (const p of pages) {
          try { await p.close(); } catch (_) {}
        }
      } catch (_) {}
      try { await b.close(); } catch (_) {}
      if (browserPid) {
        try {
          if (process.platform === 'win32') {
            execSync(`taskkill /pid ${browserPid} /T /F`, { stdio: 'ignore' });
          } else {
            execSync(`pkill -9 -P ${browserPid} 2>/dev/null || true`, { stdio: 'ignore' });
            try { process.kill(browserPid, 'SIGKILL'); } catch (_) {}
          }
        } catch (_) {}
      }
    }
    if (currentInstProfile) {
      const prof = currentInstProfile;
      currentInstProfile = null;
      try {
        if (process.platform !== 'win32') {
          execSync(`pkill -9 -f "${path.basename(prof)}" 2>/dev/null || true`, { stdio: 'ignore' });
        }
        fs.rmSync(prof, { recursive: true, force: true });
      } catch (_) {}
    }
  };

  const handleShutdown = async (sigCode) => {
    await cleanupBrowser();
    try { db.close(); } catch (_) {}
    process.exit(sigCode);
  };

  process.on('SIGTERM', () => handleShutdown(143));
  process.on('SIGINT', () => handleShutdown(130));
  process.on('exit', () => {
    if (currentInstProfile && process.platform !== 'win32') {
      try { execSync(`pkill -9 -f "${path.basename(currentInstProfile)}" 2>/dev/null || true`, { stdio: 'ignore' }); } catch (_) {}
      try { fs.rmSync(currentInstProfile, { recursive: true, force: true }); } catch (_) {}
    }
  });

  const launchFreshBrowser = async () => {
    await cleanupBrowser();
    currentInstProfile = path.join(os.tmpdir(), `leadmachine_w${workerId}_${process.pid}_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    fs.mkdirSync(currentInstProfile, { recursive: true });
    currentBrowser = await puppeteer.launch({
      executablePath: CHROME_BIN,
      headless: isHeaded ? false : 'new',
      userDataDir: currentInstProfile,
      timeout: 60000,
      ignoreHTTPSErrors: true,
      args: STEALTH_LAUNCH_ARGS
    });
    return currentBrowser;
  };

  await launchFreshBrowser();

  const placeholders = leadIds.map(() => '?').join(',');
  const leads = db.prepare(`SELECT id, company_name, website FROM leads WHERE id IN (${placeholders}) ORDER BY id ASC`).all(...leadIds);

  const results = [];
  for (const lead of leads) {
    if (!currentBrowser || !currentBrowser.connected) {
      await launchFreshBrowser();
    }
    try {
      const res = await Promise.race([
        processLead(currentBrowser, lead, agentName, isSandbox),
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

      // If a timeout occurred, the browser is likely hung/frozen with pending page tasks.
      // Recycle browser immediately so next lead starts with a pristine session!
      if (e.message && e.message.includes('Timeout')) {
        console.log(`[${agentName}] ♻️ Recycling browser after timeout on #${lead.id} to prevent zombie renderers.`);
        await launchFreshBrowser().catch(() => {});
      }
    }
  }

  await cleanupBrowser();
  try { db.close(); } catch (_) {}

  console.log(`🏁 [${agentName}] Completed batch of ${results.length} leads.`);
  process.exit(0);
}

if (process.argv[1] && (process.argv[1].endsWith('worker.mjs') || process.argv[1].endsWith('worker'))) {
  runWorker();
}
