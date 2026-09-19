import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: `Hello,\n\nI am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.\n\nWe look forward to your response and the possibility of working together.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function main() {
  console.log('--- Processing Lead #1736: CNC Programming & Machining ---');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_BIN,
      headless: 'new',
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,850']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    console.log('Navigating to https://cncprogramingmachining.com/ ...');
    await page.goto('https://cncprogramingmachining.com/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Loaded. Title:', await page.title());

    await new Promise(r => setTimeout(r, 1500));

    const formDetails = await page.evaluate(() => {
      const f = document.querySelector('#wpforms-form-17');
      if (!f) return null;
      return {
        id: f.id,
        action: f.action,
        fields: Array.from(f.querySelectorAll('input:not([type="hidden"]), textarea')).map(i => ({ id: i.id, name: i.name }))
      };
    });
    console.log('Form details:', formDetails);

    // Fill form
    await page.type('#wpforms-17-field_0', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('#wpforms-17-field_1', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('#wpforms-17-field_2', OUTREACH_PROFILE.message, { delay: 5 });

    // Leave honeypot empty
    await page.evaluate(() => {
      const hp = document.querySelector('#wpforms-17-field-hp');
      if (hp) hp.value = '';
    });

    console.log('Clicking submit button #wpforms-submit-17...');
    await page.click('#wpforms-submit-17');

    console.log('Waiting for AJAX confirmation (7s)...');
    await new Promise(r => setTimeout(r, 7000));

    const check = await page.evaluate(() => {
      const conf = document.querySelector('.wpforms-confirmation-container-17, .wpforms-confirmation-scroll, div[id*="wpforms-confirmation"]');
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return {
        confExists: !!conf,
        confText: conf ? conf.innerText.trim() : null,
        hasThanks: body.includes('thank') || body.includes('thanks') || body.includes('received')
      };
    });
    console.log('Result:', check);

    if (check.confExists && check.confText) {
      const note = `WPForms submitted & verified on https://cncprogramingmachining.com/: "${check.confText}"`;
      db.transaction(() => {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 1736);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(1736, 'sent', note);
      })();
      console.log('SUCCESS! #1736 committed to DB as contacted.');
    } else {
      console.log('Unconfirmed for #1736');
    }

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch(console.error);
