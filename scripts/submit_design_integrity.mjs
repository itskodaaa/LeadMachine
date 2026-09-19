import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

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

async function submitDesignIntegrity() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    const targetUrl = 'https://www.designintegrity.com/engineering-firms-chicago/';
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Wait for ninja forms element
    await page.waitForSelector('#nf-field-1', { timeout: 10000 });

    console.log('Filling form fields...');
    await page.evaluate((p) => {
      function setVal(selector, val) {
        const el = document.querySelector(selector);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      setVal('#nf-field-1', p.firstName);
      setVal('#nf-field-6', p.lastName);
      setVal('#nf-field-2', p.email);
      setVal('#nf-field-7', p.phone);
      setVal('#nf-field-3', p.message);
    }, OUTREACH_PROFILE);

    // Also type slightly into each field to ensure Backbone / Marionette model updates
    await page.click('#nf-field-1');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');

    await page.click('#nf-field-6');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');

    await page.click('#nf-field-2');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');

    await page.click('#nf-field-3');
    await page.keyboard.press('Space');
    await page.keyboard.press('Backspace');

    await new Promise(r => setTimeout(r, 1000));

    console.log('Submitting form...');
    await page.click('#nf-field-5');

    // Wait for response
    await new Promise(r => setTimeout(r, 6000));

    const result = await page.evaluate(() => {
      const responseMsg = document.querySelector('.nf-response-msg')?.innerText || '';
      const errors = Array.from(document.querySelectorAll('.nf-error-msg, .ninja-forms-field-error')).map(e => e.innerText);
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return { responseMsg, errors, bodySnippet: body.slice(0, 500) };
    });

    console.log('Result:', result);

    const isSuccess = result.responseMsg.toLowerCase().includes('thank') ||
                      result.responseMsg.toLowerCase().includes('success') ||
                      result.bodySnippet.includes('thank you') ||
                      result.bodySnippet.includes('message has been sent');

    if (isSuccess) {
      const confText = result.responseMsg.trim() || 'Submission confirmed';
      console.log(`✅ Lead #1118 Confirmed: ${confText}`);
      saveLeadResult(1118, 'contacted', `Contact form: ${targetUrl} (Ninja Forms autofilled & verified: "${confText}")`);
    } else {
      console.log(`❌ Lead #1118 Failed / Unconfirmed. Errors: ${result.errors.join(', ')}`);
      saveLeadResult(1118, 'unable_to_reach', `Contact form: ${targetUrl} (Errors: ${result.errors.join(', ') || 'No confirmation message'})`);
    }

  } catch (err) {
    console.error('Error submitting #1118:', err.message);
  } finally {
    await page.close();
    await browser.close();
  }
}

submitDesignIntegrity();
