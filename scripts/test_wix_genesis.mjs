import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Chicago, IL 60601',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.'
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('dialog', async d => { console.log('Dialog:', d.message()); await d.dismiss(); });
  page.on('response', async r => {
    const url = r.url();
    if (url.includes('form') || url.includes('submission') || url.includes('wix') || url.includes('contact')) {
      if (r.request().method() === 'POST') {
        console.log(`[POST Response] ${url} -> status ${r.status()}`);
        try {
          const txt = await r.text();
          console.log(`[POST Body] ${txt.slice(0, 300)}`);
        } catch (_) {}
      }
    }
  });

  console.log('Navigating to Genesis Fortune...');
  await page.goto('https://www.genesisfortune.com/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Autofill Wix inputs
  console.log('Filling inputs...');
  await page.evaluate((p) => {
    function setVal(selector, val) {
      const el = document.querySelector(selector);
      if (el) {
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    }
    setVal('input[name="first-name"]', p.firstName);
    setVal('input[name="last-name"]', p.lastName);
    setVal('input[name="email"]', p.email);
    setVal('input[name="phone"]', p.phone);
    setVal('input[name="address"]', p.address);
  }, OUTREACH_PROFILE);

  await new Promise(r => setTimeout(r, 1000));

  // Find submit button and click it
  console.log('Finding and clicking submit button...');
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], [role="button"]'));
    for (const b of buttons) {
      const txt = (b.innerText || b.value || '').trim().toLowerCase();
      if (txt === 'submit' || txt.includes('submit')) {
        b.scrollIntoView();
        b.click();
        return { clicked: true, text: txt, id: b.id, className: b.className };
      }
    }
    return { clicked: false };
  });
  console.log('Click result:', clicked);

  await new Promise(r => setTimeout(r, 8000));

  const confirmation = await page.evaluate(() => {
    const texts = Array.from(document.querySelectorAll('[data-testid="notifications"], [role="alert"], [class*="message"], [class*="notification"], [class*="success"], [class*="form"], [class*="dialog"]')).map(el => el.innerText.trim()).filter(Boolean);
    const body = document.body ? document.body.innerText : '';
    return { texts, bodySnippet: body.slice(0, 1000) };
  });
  console.log('Confirmation check:', confirmation);

  await browser.close();
}

run().catch(console.error);
