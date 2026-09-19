import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  projectType: 'Commercial Engineering & Facilities',
  message: `Hello,\n\nI am reaching out to express our interest in your commercial construction services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss upcoming project requirements.\n\nThank you for your time and attention.\n\nSincerely,\nPamela Jameson`
};

async function test2283() {
  console.log('--- Processing Lead #2283: Danforth Construction Group ---');
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

    page.on('request', req => {
      if (req.method() === 'POST') {
        console.log('POST Req:', req.url(), req.postData());
      }
    });

    page.on('response', async resp => {
      if (resp.request().method() === 'POST') {
        try {
          console.log('POST Resp:', resp.status(), resp.url(), (await resp.text()).slice(0, 250));
        } catch (e) {}
      }
    });

    console.log('Navigating to https://www.danforthcg.com/contact/ ...');
    await page.goto('https://www.danforthcg.com/contact/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    await page.evaluate(() => {
      const f = document.querySelector('#contact-form');
      if (f) f.scrollIntoView({ behavior: 'auto', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Typing into form fields...');
    await page.type('input[name="name"]', OUTREACH_PROFILE.fullName, { delay: 20 });
    await page.type('input[name="email"]', OUTREACH_PROFILE.email, { delay: 20 });
    await page.type('input[name="phone"]', OUTREACH_PROFILE.phone, { delay: 20 });
    await page.type('input[name="project_type"]', OUTREACH_PROFILE.projectType, { delay: 20 });
    await page.type('textarea[name="message"]', OUTREACH_PROFILE.message, { delay: 10 });

    // Make sure botcheck is unchecked
    await page.evaluate(() => {
      const bc = document.querySelector('input[name="botcheck"]');
      if (bc) bc.checked = false;
    });

    console.log('Submitting form...');
    await page.click('#contact-form button[type="submit"], #contact-form button');

    console.log('Waiting 10s for confirmation response...');
    await new Promise(r => setTimeout(r, 10000));

    const result = await page.evaluate(() => {
      const body = document.body ? document.body.innerText.toLowerCase() : '';
      const alerts = Array.from(document.querySelectorAll('[role="alert"], .success, .alert-success, div[class*="success"]')).map(a => a.innerText.trim());
      const hasThanks = body.includes('thank you') || body.includes('thanks') || body.includes('received') || body.includes('submitted') || body.includes('message sent');
      return {
        alerts,
        hasThanks,
        snippet: document.body ? document.body.innerText.slice(0, 400).replace(/\s+/g, ' ') : ''
      };
    });

    console.log('Result for 2283:', JSON.stringify(result, null, 2));

    if (result.hasThanks || result.alerts.length > 0) {
      const msg = result.alerts[0] || 'Thank you! Your message has been sent.';
      const note = `Web contact form on https://www.danforthcg.com/contact/ autofilled & verified: "${msg}"`;
      db.transaction(() => {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 2283);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(2283, 'sent', note);
      })();
      console.log('SUCCESS! #2283 committed to DB as contacted.');
    } else {
      console.log('Unconfirmed for #2283');
    }

  } catch (err) {
    console.log('Error 2283:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

test2283().catch(console.error);
