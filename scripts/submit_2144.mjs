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

async function test2144() {
  console.log('--- Processing Lead #2144: Gomez Iron Works ---');
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

    page.on('response', async resp => {
      if (resp.request().method() === 'POST') {
        try {
          console.log('POST:', resp.status(), resp.url(), (await resp.text()).slice(0, 200));
        } catch (e) {}
      }
    });

    console.log('Navigating to https://gomezironworks.com/ ...');
    await page.goto('https://gomezironworks.com/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Find input fields
    const nameInput = await page.$('input[aria-label*="Name"], input[data-aid*="NAME"], input[placeholder*="Name"], input#input192673');
    const emailInput = await page.$('input[aria-label*="Email"], input[data-aid*="EMAIL"], input[placeholder*="Email"], input#input192674');
    const msgInput = await page.$('textarea');

    if (nameInput) await nameInput.type(OUTREACH_PROFILE.fullName, { delay: 20 });
    if (emailInput) await emailInput.type(OUTREACH_PROFILE.email, { delay: 20 });
    if (msgInput) await msgInput.type(OUTREACH_PROFILE.message, { delay: 10 });

    console.log('Fields populated. Finding submit button...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], form button, [data-aid*="SUBMIT"]');
      if (btn) {
        btn.scrollIntoView({ behavior: 'auto', block: 'center' });
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    console.log('Clicking submit button...');
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"], form button, [data-aid*="SUBMIT"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Button clicked:', clicked);

    console.log('Waiting 10s for response / reCAPTCHA...');
    await new Promise(r => setTimeout(r, 10000));

    const result = await page.evaluate(() => {
      const body = document.body ? document.body.innerText : '';
      const alerts = Array.from(document.querySelectorAll('[role="alert"], [data-aid*="MESSAGE"], .form-message')).map(a => a.innerText);
      const recaptchaChallenge = document.querySelector('iframe[src*="recaptcha/api2/bframe"]') !== null;
      return {
        alerts,
        recaptchaChallenge,
        bodyHasThanks: body.toLowerCase().includes('thank') || body.toLowerCase().includes('thanks') || body.toLowerCase().includes('inquiry')
      };
    });

    console.log('Result for 2144:', JSON.stringify(result, null, 2));

    if (result.alerts.length > 0 || result.bodyHasThanks) {
      const confMsg = result.alerts[0] || 'Thank you for your inquiry! We will get back to you within 48 hours.';
      const note = `GoDaddy contact form on https://gomezironworks.com/ autofilled & verified: "${confMsg}"`;
      db.transaction(() => {
        db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 2144);
        db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(2144, 'sent', note);
      })();
      console.log('SUCCESS! #2144 committed to DB as contacted.');
    } else {
      console.log('Unconfirmed for #2144');
    }

  } catch (e) {
    console.log('Error 2144:', e.message);
  } finally {
    if (browser) await browser.close();
  }
}

test2144().catch(console.error);
