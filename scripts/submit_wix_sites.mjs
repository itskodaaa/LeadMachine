import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  subject: 'Exploring Collaboration Opportunities',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you for your time and attention!'
};

function recordSuccess(id, note) {
  db.prepare("UPDATE leads SET notes = 'Confirmed: ' || ?, status = 'contacted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(note, id);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)").run(id, note);
  console.log(`[LEAD #${id}] SUCCESS: ${note}`);
}

async function submitPerceptive() {
  console.log('\n--- Submitting 3415 Perceptive Engineering ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,1000']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.perceptiveeng.com/connect-with-us', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Filling Perceptive inputs...');
    await page.type('#input_comp-k4sy0pq4', OUTREACH.firstName);
    await page.type('#input_comp-k4sy0psm', OUTREACH.lastName);
    await page.type('#input_comp-k4sy0pvl', OUTREACH.email);
    await page.type('#input_comp-k4t2dlbk', OUTREACH.phone);

    // Check first checkbox
    const cb = await page.$('input[type="checkbox"]');
    if (cb) await cb.click();

    await page.type('#textarea_comp-k4sy0q5g', OUTREACH.message);

    console.log('Finding submit button...');
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('#comp-k4sy0q8p') || 
                  Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => (b.innerText||'').trim().toLowerCase() === 'submit');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Submit clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-testid="success-message"], .success-message, [aria-label*="success" i]');
      return {
        successText: successEl ? successEl.innerText : '',
        bodySnippet: document.body.innerText
      };
    });

    console.log('Perceptive successText:', result.successText);
    if (/thank you|thanks for submitting|received your message|we will get back/i.test(result.successText) || /thanks for submitting/i.test(result.bodySnippet)) {
      recordSuccess(3415, `Wix form submitted: ${result.successText || 'Thanks for submitting'}`);
    } else {
      console.log('Perceptive not confirmed. Body excerpt:', result.bodySnippet.slice(0, 500));
    }
  } catch (e) {
    console.error('Perceptive error:', e.message);
  } finally {
    await browser.close();
  }
}

async function submitMD() {
  console.log('\n--- Submitting 3416 M&D General Contracting ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,1000']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://www.mdgcgroup.com/get-a-bid', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    const filled = await page.evaluate((profile) => {
      let count = 0;
      const fn = document.querySelector('#form-field-input-98e387df-d034-4be7-1070-4f47b4220444-comp-m0fbprz5-') ||
                 document.querySelector('#form-field-input-815d299a-63fb-4b2d-ceea-e52c8633cc57-comp-ljfcrhf2-');
      if (fn) { fn.value = profile.firstName; fn.dispatchEvent(new Event('input', { bubbles: true })); count++; }

      const ln = document.querySelector('#form-field-input-49366265-5019-4217-c500-eef1039a115c-comp-m0fbprz5-') ||
                 document.querySelector('#form-field-input-8733f821-4fb7-451b-1271-75fe896733a6-comp-ljfcrhf2-');
      if (ln) { ln.value = profile.lastName; ln.dispatchEvent(new Event('input', { bubbles: true })); count++; }

      const em = document.querySelector('#form-field-input-5effb297-ee9e-451c-efc5-4dc936ddeecc-comp-m0fbprz5-') ||
                 document.querySelector('#form-field-input-139d17cf-6faa-472a-f9c4-77e54f70ef54-comp-ljfcrhf2-');
      if (em) { em.value = profile.email; em.dispatchEvent(new Event('input', { bubbles: true })); count++; }

      const ph = document.querySelector('#form-field-input-0e0dd6b0-c8e7-4d7f-f096-57f8f97debbe-comp-m0fbprz5-') ||
                 document.querySelector('#form-field-input-a2a10055-4c4a-41b9-0689-9aabced63234-comp-ljfcrhf2-');
      if (ph) { ph.value = profile.phone; ph.dispatchEvent(new Event('input', { bubbles: true })); count++; }

      const tx = document.querySelector('#form-field-input-ab41f066-0d63-44d8-323d-7c95d7e466d2-comp-m0fbprz5-') ||
                 document.querySelector('#form-field-input-44d64a7a-f6a1-4a15-703b-c0c303dfc466-comp-ljfcrhf2-');
      if (tx) { tx.value = profile.message; tx.dispatchEvent(new Event('input', { bubbles: true })); count++; }

      return count;
    }, OUTREACH);

    console.log('MDGC filled count:', filled);

    const clicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => (b.innerText||'').trim().toLowerCase() === 'submit');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('MDGC submit clicked:', clicked);

    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-testid="success-message"], .success-message, [aria-label*="success" i]');
      return {
        successText: successEl ? successEl.innerText : '',
        bodySnippet: document.body.innerText
      };
    });

    console.log('MDGC successText:', result.successText);
    if (/thank you|thanks for submitting|received your message|we will get back/i.test(result.successText) || /thanks for submitting/i.test(result.bodySnippet)) {
      recordSuccess(3416, `Wix bid request submitted: ${result.successText || 'Thanks for submitting'}`);
    } else {
      console.log('MDGC body excerpt:', result.bodySnippet.slice(0, 500));
    }
  } catch (e) {
    console.error('MDGC error:', e.message);
  } finally {
    await browser.close();
  }
}

async function main() {
  await submitPerceptive();
  await submitMD();
}

main();
