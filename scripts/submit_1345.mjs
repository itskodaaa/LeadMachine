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

  console.log('Navigating to https://cmigrp.com/contact-us/ ...');
  await page.goto('https://cmigrp.com/contact-us/', { waitUntil: 'networkidle2', timeout: 30000 });

  await page.evaluate((p) => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    // Name*
    setVal('input_2_1', p.fullName);
    // Company Name*
    setVal('input_2_2', p.company);
    // Email Address*
    setVal('input_2_3', p.email);
    // Phone Number*
    setVal('input_2_4', p.phone);
    // How can we help you?
    setVal('input_2_5', p.message);
    // input_2_6 is honeypot - ensure it is empty
    const hp = document.getElementById('input_2_6');
    if (hp) hp.value = '';
  }, OUTREACH_PROFILE);

  console.log('Filled form. Submitting...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
    page.evaluate(() => {
      const submitBtn = document.querySelector('#gform_submit_button_2') || document.querySelector('#gform_2 input[type="submit"]');
      if (submitBtn) submitBtn.click();
      else document.querySelector('#gform_2').submit();
    })
  ]);

  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate(() => {
    const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, [id*="confirmation"]');
    const errors = document.querySelectorAll('.gfield_error, .validation_error');
    const body = document.body ? document.body.innerText : '';
    return {
      confText: confirmation?.innerText?.trim() || '',
      hasErrors: errors.length > 0,
      errors: Array.from(errors).map(e => e.innerText.trim()),
      bodySnippet: body.slice(0, 500)
    };
  });

  console.log('Result:', result);

  if (result.confText || result.bodySnippet.toLowerCase().includes('thanks for contacting') || result.bodySnippet.toLowerCase().includes('received your message') || result.bodySnippet.toLowerCase().includes('will be in touch') || result.bodySnippet.toLowerCase().includes('we will contact you') || result.bodySnippet.toLowerCase().includes('thank you for reaching out')) {
    const confirmationMsg = result.confText || 'Submission confirmed on page';
    console.log('SUCCESS! Confirmation:', confirmationMsg);

    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const current = db.prepare('SELECT notes FROM leads WHERE id = 1345').get();
    const note = `Contact form: https://cmigrp.com/contact-us/ (Autofilled & verified: ${confirmationMsg.slice(0, 120)})`;
    const newNotes = current?.notes ? current.notes + ' | ' + note : note;

    db.transaction(() => {
      updateStmt.run(newNotes, 'contacted', 1345);
      logStmt.run(1345, 'sent', note);
    })();
    console.log('Updated lead #1345 to contacted in DB!');
  } else {
    console.log('Failed or validation error:', result);
  }

  await browser.close();
}

run().catch(console.error);
