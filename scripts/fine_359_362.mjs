import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

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
  message: `Hello, I am reaching out to express interest in your services and discuss potential collaboration opportunities. Kindly contact us at your earliest convenience.`
};

const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function runFine359_362() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  // 1. #359: Fraga Builder
  console.log('\n--- Checking #359: Fraga Builder ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://fragabuilder.com/contact-us/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.evaluate((p) => {
      const name = document.querySelector('input[name*="name"]');
      const email = document.querySelector('input[name*="email"]');
      const phone = document.querySelector('input[name*="phone"]');
      const select = document.querySelector('select');
      const msg = document.querySelector('textarea');

      if (name) name.value = p.fullName;
      if (email) email.value = p.email;
      if (phone) phone.value = p.phone;
      if (select && select.options.length > 1) select.selectedIndex = 1;
      if (msg) msg.value = p.message;

      const submit = document.querySelector('.forminator-button-submit, button[type="submit"]');
      if (submit) submit.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 6000));

    const verify359 = await page.evaluate(() => {
      const resp = document.querySelector('.forminator-response-message')?.innerText || '';
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return { resp, bodySnippet: body.substring(0, 300) };
    });

    console.log('#359 Response:', verify359);
    if (verify359.resp.toLowerCase().includes('thank') || verify359.bodySnippet.includes('thank you') || verify359.bodySnippet.includes('sent')) {
      saveLeadResult(359, 'contacted', `Contact form: https://fragabuilder.com/contact-us/ (Forminator Verified: ${verify359.resp.trim() || 'Thank you'})`);
    } else {
      saveLeadResult(359, 'unable_to_reach', `Contact form: https://fragabuilder.com/contact-us/ (${verify359.resp || 'Forminator unconfirmed'})`);
    }
    await page.close();
  } catch (e) {
    console.log('#359 Error:', e.message);
  }

  // 2. #362: A&A Paving Services INC.
  console.log('\n--- Checking #362: A&A Paving Services INC. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://www.aapavingservices.com/contacts/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    const formDetails = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({
        tag: i.tagName,
        type: i.type,
        name: i.name,
        placeholder: i.placeholder
      }));
      return { url: window.location.href, inputs };
    });

    console.log('#362 on /contacts/:', JSON.stringify(formDetails, null, 2));

    if (formDetails.inputs.length >= 2) {
      await page.evaluate((p) => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea'));
        for (const el of inputs) {
          const type = (el.type || '').toLowerCase();
          const name = (el.name || '').toLowerCase();
          const placeholder = (el.placeholder || '').toLowerCase();
          const combined = `${name} ${placeholder}`;

          if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message')) el.value = p.message;
          else if (type === 'email' || combined.includes('email')) el.value = p.email;
          else if (type === 'tel' || combined.includes('phone')) el.value = p.phone;
          else if (combined.includes('name')) el.value = p.fullName;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const submit = document.querySelector('button[type="submit"], input[type="submit"]');
        if (submit) submit.click();
      }, OUTREACH_PROFILE);

      await new Promise(r => setTimeout(r, 6000));

      const verify362 = await page.evaluate(() => {
        const body = document.body ? document.body.innerText.toLowerCase() : '';
        return { bodySnippet: body.substring(0, 300) };
      });

      console.log('#362 Verify:', verify362.bodySnippet);
      if (verify362.bodySnippet.includes('thank') || verify362.bodySnippet.includes('sent') || verify362.bodySnippet.includes('received')) {
        saveLeadResult(362, 'contacted', `Contact form: https://www.aapavingservices.com/contacts/ (Verified: Thank you)`);
      } else {
        saveLeadResult(362, 'unable_to_reach', `Contact form: https://www.aapavingservices.com/contacts/ (Submission unconfirmed)`);
      }
    } else {
      saveLeadResult(362, 'unable_to_reach', 'Checked https://www.aapavingservices.com/contacts/: Direct phone & office address only; no web contact form');
    }
    await page.close();
  } catch (e) {
    console.log('#362 Error:', e.message);
  }

  await browser.close();
}

runFine359_362();
