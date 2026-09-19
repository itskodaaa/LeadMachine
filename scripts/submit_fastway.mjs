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
  phone: '7085683708',
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

async function submitFastway() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  try {
    const targetUrl = 'https://www.fastwayengineering.com/contact';
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    try {
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText.trim().toLowerCase() === 'accept');
        if (btn) btn.click();
      });
    } catch (e) {}

    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 4000));

    let hsFrame = null;
    for (const f of page.frames()) {
      if (f.url().includes('hsforms')) {
        hsFrame = f;
        break;
      }
    }

    if (!hsFrame) throw new Error('HubSpot frame not found');

    console.log('HubSpot frame found. Typing fields...');
    await hsFrame.waitForSelector('input[name="0-1/firstname"]', { timeout: 10000 });
    await hsFrame.type('input[name="0-1/firstname"]', OUTREACH_PROFILE.firstName, { delay: 30 });
    await hsFrame.type('input[name="0-1/lastname"]', OUTREACH_PROFILE.lastName, { delay: 30 });
    await hsFrame.type('input[name="0-1/email"]', OUTREACH_PROFILE.email, { delay: 30 });

    // Select reason for inquiry
    const reasonInput = await hsFrame.$('input[placeholder="Choose One"]');
    if (reasonInput) {
      await reasonInput.click();
      await new Promise(r => setTimeout(r, 800));
      await hsFrame.evaluate(() => {
        const opts = Array.from(document.querySelectorAll('.hsfc-DropdownOptions__List__ListItem, [role="option"], li'));
        const opt = opts.find(o => o.innerText.toLowerCase().includes('consult') || o.innerText.toLowerCase().includes('project') || o.innerText.toLowerCase().includes('service')) || opts[0];
        if (opt) opt.click();
      });
    }

    // Type message
    await hsFrame.type('textarea[name="0-1/message"]', OUTREACH_PROFILE.message, { delay: 10 });
    await new Promise(r => setTimeout(r, 1000));

    // Submit form
    console.log('Submitting HubSpot form...');
    await hsFrame.click('button[type="submit"]');

    // Wait for submission confirmation
    await new Promise(r => setTimeout(r, 6000));

    const verify = await hsFrame.evaluate(() => {
      const body = document.body ? document.body.innerText : '';
      const submittedEl = document.querySelector('.submitted-message, .hs-form-submitted, [data-hs-form-submitted], [role="status"]');
      const submitted = submittedEl ? submittedEl.innerText : '';
      const errors = Array.from(document.querySelectorAll('.hsfc-ErrorMessage, [data-hsfc-id="ErrorMessage"]')).map(e => e.innerText);
      return { body, submitted, errors };
    });

    console.log('Post-submit verification:', verify);

    const isSuccess = verify.body.toLowerCase().includes('thank') ||
                      verify.body.toLowerCase().includes('received') ||
                      verify.body.toLowerCase().includes('submitted') ||
                      verify.submitted.toLowerCase().includes('thank') ||
                      verify.body.toLowerCase().includes('we will be in touch');

    if (isSuccess) {
      const phrase = verify.submitted || 'Thank you for reaching out';
      console.log(`✅ Lead #1117 Confirmed: ${phrase}`);
      saveLeadResult(1117, 'contacted', `Contact form: ${targetUrl} (HubSpot iframe autofilled & verified: "${phrase.trim()}")`);
    } else {
      console.log('❌ Lead #1117 Unconfirmed');
      saveLeadResult(1117, 'unable_to_reach', `Contact form: ${targetUrl} (HubSpot submission unconfirmed: ${verify.errors.join(', ') || verify.body.slice(0, 100)})`);
    }

  } catch (err) {
    console.error('Error on #1117:', err.message);
    saveLeadResult(1117, 'unable_to_reach', `Error during browser automation: ${err.message}`);
  } finally {
    await page.close();
    await browser.close();
  }
}

submitFastway();
