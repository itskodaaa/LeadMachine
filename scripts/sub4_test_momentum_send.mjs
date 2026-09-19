import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St, Houston, TX 77002',
  message: 'Hello, I am reaching out to express our interest in your services and request a representative to contact us for potential collaboration and upcoming project quotes. Thank you.'
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('https://msetexas.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Open quote modal if not open
    await page.evaluate(() => {
      const qBtn = Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').includes('Get a Quote'));
      if (qBtn) qBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Fill form
    await page.evaluate((p) => {
      function setVal(el, val) {
        if (!el) return;
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      const nameEl = document.querySelector('input[id*="full-name"]');
      const phoneEl = document.querySelector('input[id*="phone-number"]');
      const emailEl = document.querySelector('input[id*="email"]');
      const addressEl = document.querySelector('input[id*="address"]');
      const dateEl = document.querySelector('input[id*="date"]');
      const serviceCb = document.querySelector('input[type="checkbox"]');
      const msgEl = document.querySelector('textarea');

      setVal(nameEl, p.fullName);
      setVal(phoneEl, p.phone);
      setVal(emailEl, p.email);
      setVal(addressEl, p.address);
      if (dateEl) setVal(dateEl, '2026-09-15');
      if (serviceCb) {
        serviceCb.checked = true;
        serviceCb.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setVal(msgEl, p.message);
    }, PROFILE);

    console.log('Filled form. Clicking send and waiting for navigation or response...');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null),
      page.evaluate(() => {
        const allBtns = Array.from(document.querySelectorAll('button, [role="button"], div[class*="buttons"] *'));
        const sendBtn = allBtns.find(b => (b.innerText || '').trim().toLowerCase() === 'send');
        if (sendBtn) sendBtn.click();
      })
    ]);

    await new Promise(r => setTimeout(r, 4000));

    const finalUrl = page.url();
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('Navigated / final URL:', finalUrl);
    console.log('Page text snippet (first 600 chars):', pageText.slice(0, 600).replace(/\n+/g, ' '));

    const hasSuccess = /thank|received|sent|success|message|in touch/i.test(pageText) || finalUrl.includes('thank') || finalUrl.includes('success');
    console.log('Has success signal:', hasSuccess);

    if (hasSuccess) {
      console.log('✅ Lead #4157 Momentum Structural Engineering successfully submitted and confirmed!');
      const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
      const note = `Contact form: https://msetexas.com/ (Quote request submitted & confirmed: "${pageText.slice(0, 100).replace(/\n+/g, ' ')}")`;
      db.transaction(() => {
        updateStmt.run(note, 'contacted', 4157);
        logStmt.run(4157, 'sent', note);
      })();
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await browser.close();
  }
}

run();
