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

function saveLeadResult(id, status, note) {
  db.transaction(() => {
    updateStmt.run(note, status, id);
    const action = status === 'contacted' ? 'sent' : 'bounced';
    logStmt.run(id, action, note);
  })();
}

async function retry257_258_260() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800', '--disable-dev-shm-usage'],
    protocolTimeout: 60000
  });

  // #257: H2P Construction Inc
  console.log('\n--- Retrying #257: H2P Construction Inc ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://h2pconstruction.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));

    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(i => ({
        tag: i.tagName.toLowerCase(),
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        required: i.required,
        type: i.type
      }));
      return { url: window.location.href, inputs };
    });
    console.log('#257 Form Info:', JSON.stringify(formInfo, null, 2));

    await page.evaluate((p) => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      for (const el of inputs) {
        const type = (el.type || '').toLowerCase();
        const name = (el.name || '').toLowerCase();
        const placeholder = (el.placeholder || '').toLowerCase();
        const combined = `${name} ${placeholder}`;

        if (el.tagName.toLowerCase() === 'textarea' || combined.includes('message')) el.value = p.message;
        else if (type === 'email' || combined.includes('email')) el.value = p.email;
        else if (type === 'tel' || combined.includes('phone')) el.value = p.phone;
        else if (combined.includes('name')) el.value = p.fullName;
        else if (combined.includes('company')) el.value = p.company;
        else if (combined.includes('subject')) el.value = p.subject;
        else if (el.tagName.toLowerCase() === 'select' && el.options.length > 1) el.selectedIndex = 1;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const submit = document.querySelector('button[type="submit"], input[type="submit"]');
      if (submit) submit.click();
    }, OUTREACH_PROFILE);

    await new Promise(r => setTimeout(r, 5000));

    const verify = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return { bodySnippet: body.substring(0, 300) };
    });

    console.log('#257 Verify:', verify.bodySnippet);
    if (verify.bodySnippet.includes('thank') || verify.bodySnippet.includes('sent') || verify.bodySnippet.includes('received')) {
      saveLeadResult(257, 'contacted', `Contact form: https://h2pconstruction.com (Verified: Thank you)`);
    } else {
      saveLeadResult(257, 'unable_to_reach', `Contact form: https://h2pconstruction.com (Validation requirement / Unconfirmed)`);
    }
    await page.close();
  } catch (e) {
    console.log('#257 Error:', e.message);
  }

  // #258: Lavi Construction
  console.log('\n--- Retrying #258: Lavi Construction ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://lavigc.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    const title = await page.title();
    console.log('#258 Title:', title);
    const hasForm = await page.evaluate(() => document.querySelectorAll('input:not([type="hidden"]), textarea').length >= 2);
    if (!hasForm) {
      saveLeadResult(258, 'unable_to_reach', 'Checked https://lavigc.com: No online web contact form found');
    }
    await page.close();
  } catch (e) {
    console.log('#258 Error:', e.message);
    saveLeadResult(258, 'unable_to_reach', `Checked https://lavigc.com: Site connection timeout / Inaccessible`);
  }

  // #260: Exo Construction Group Inc.
  console.log('\n--- Retrying #260: Exo Construction Group Inc. ---');
  try {
    const page = await browser.newPage();
    await page.goto('https://exoconstruction.net', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 3000));
    const title = await page.title();
    console.log('#260 Title:', title);

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

    await new Promise(r => setTimeout(r, 5000));

    const verify = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return { bodySnippet: body.substring(0, 300) };
    });

    console.log('#260 Verify:', verify.bodySnippet);
    if (verify.bodySnippet.includes('thank') || verify.bodySnippet.includes('sent') || verify.bodySnippet.includes('received')) {
      saveLeadResult(260, 'contacted', `Contact form: https://exoconstruction.net (Verified: Thank you)`);
    } else {
      saveLeadResult(260, 'unable_to_reach', `Contact form: https://exoconstruction.net (Submission unconfirmed)`);
    }
    await page.close();
  } catch (e) {
    console.log('#260 Error:', e.message);
  }

  await browser.close();
}

retry257_258_260();
