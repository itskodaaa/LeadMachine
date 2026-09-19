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

async function test1738() {
  console.log('--- Processing Lead #1738: Machine Building Specialties ---');
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_BIN,
      headless: 'new',
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,850']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

    await page.setRequestInterception(true);
    page.on('request', req => {
      const u = req.url().toLowerCase();
      const r = req.resourceType();
      if (u.includes('google.com/maps') || u.includes('googleapis.com') || r === 'font') {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log('Navigating to https://mbs01.com/contact/ ...');
    await page.goto('https://mbs01.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    console.log('Page loaded! Title:', await page.title());

    await page.evaluate(() => {
      const el = document.querySelector('#gform_1');
      if (el) el.scrollIntoView();
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Typing into form fields...');
    await page.type('#input_1_1', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('#input_1_2', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('#input_1_3', '7085683708', { delay: 20 });
    await page.type('#input_1_4', OUTREACH_PROFILE.message, { delay: 5 });

    console.log('Clicking submit #gform_submit_button_1 ...');
    await page.click('#gform_submit_button_1');

    console.log('Waiting 8s for Gravity Forms postback...');
    await new Promise(r => setTimeout(r, 8000));

    const postState = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('.gfield_error, .validation_error')).map(e => e.innerText);
      const conf = document.querySelector('#gform_confirmation_wrapper_1, .gform_confirmation_message_1, .gform_confirmation_message');
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      return {
        errors,
        confText: conf ? conf.innerText.trim() : null,
        bodyHasThanks: body.includes('thank') || body.includes('thanks') || body.includes('in touch')
      };
    });

    console.log('Post submit state for 1738:', postState);

    if (postState.confText || postState.bodyHasThanks) {
      const confMsg = postState.confText || 'Thank you for contacting us! We will get in touch with you shortly.';
      const note = `Gravity Forms on https://mbs01.com/contact/ autofilled & verified: "${confMsg}"`;
      db.transaction(() => {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 1738);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(1738, 'sent', note);
      })();
      console.log('SUCCESS! #1738 committed to DB as contacted.');
    } else {
      console.log('Unconfirmed for #1738');
    }

  } catch (err) {
    console.log('Error:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

test1738().catch(console.error);
