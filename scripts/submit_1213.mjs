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
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    ignoreHTTPSErrors: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  console.log('Navigating to https://www.machiningsystemscorp.com/contact-us/ ...');
  await page.goto('https://www.machiningsystemscorp.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.evaluate((p) => {
    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    for (const inp of inputs) {
      const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
      const name = (inp.getAttribute('name') || '').toLowerCase();

      if (placeholder.includes('your name') && !placeholder.includes('company')) {
        inp.value = p.fullName;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (placeholder.includes('company')) {
        inp.value = p.company;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (placeholder.includes('email') || name.includes('email')) {
        inp.value = p.email;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (placeholder.includes('phone') || name.includes('phone')) {
        inp.value = p.phone;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (inp.tagName.toLowerCase() === 'textarea' || name === 'message') {
        inp.value = p.message;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, OUTREACH_PROFILE);

  console.log('Filled form. Clicking submit...');
  await page.evaluate(() => {
    const btn = document.querySelector('input[type="submit"], button[type="submit"], .wpcf7-submit');
    if (btn) btn.click();
    else document.querySelector('form').submit();
  });

  console.log('Waiting for response...');
  // WP CF7 updates .wpcf7-response-output via AJAX
  await page.waitForFunction(() => {
    const output = document.querySelector('.wpcf7-response-output');
    return output && output.innerText.trim().length > 0;
  }, { timeout: 15000 }).catch(() => {});

  const result = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    const form = document.querySelector('form.wpcf7-form');
    return {
      responseText: output ? output.innerText : '',
      formStatus: form ? form.getAttribute('data-status') : '',
      formClass: form ? form.className : ''
    };
  });

  console.log('Result:', result);

  if (result.responseText.toLowerCase().includes('thank you') || result.formStatus === 'mail_sent' || result.formClass.includes('sent')) {
    console.log('SUCCESS! Confirmation:', result.responseText);
    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const current = db.prepare('SELECT notes FROM leads WHERE id = 1213').get();
    const note = `Contact form: https://www.machiningsystemscorp.com/contact-us/ (Autofilled & verified: ${result.responseText.trim() || 'mail_sent'})`;
    const newNotes = current?.notes ? current.notes + ' | ' + note : note;

    db.transaction(() => {
      updateStmt.run(newNotes, 'contacted', 1213);
      logStmt.run(1213, 'sent', note);
    })();
    console.log('Updated lead #1213 to contacted in DB!');
  } else {
    console.log('Failed or validation error:', result);
  }

  await browser.close();
}

run().catch(console.error);
