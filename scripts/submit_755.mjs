import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async resp => {
    if (resp.url().includes('feedback')) {
      try {
        console.log('FEEDBACK RESP:', resp.status(), await resp.text());
      } catch(e) {}
    }
  });

  console.log('Navigating to https://andersenint.com/contact/...');
  await page.goto('https://andersenint.com/contact/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForSelector('form.wpcf7-form');

  console.log('Filling form inputs...');
  await page.evaluate((p) => {
    const f = document.querySelector('form.wpcf7-form');
    function setVal(name, val) {
      const el = f.querySelector(`[name="${name}"]`);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setVal('FirstName', p.firstName);
    setVal('LastName', p.lastName);
    setVal('Email', p.email);
    setVal('Phone', p.phone);
    setVal('YourMessage', p.message);
  }, OUTREACH_PROFILE);

  await new Promise(r => setTimeout(r, 1000));

  console.log('Submitting form...');
  await page.evaluate(() => {
    const f = document.querySelector('form.wpcf7-form');
    const submitBtn = f.querySelector('input[type="submit"], button[type="submit"]');
    if (f.requestSubmit && submitBtn) f.requestSubmit(submitBtn);
    else if (submitBtn) submitBtn.click();
    else f.submit();
  });

  console.log('Waiting 8 seconds for response...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    return {
      outputClass: output ? output.className : null,
      outputText: output ? output.innerText.trim() : null,
      hasThank: body.includes('thank') || body.includes('sent') || body.includes('received')
    };
  });

  console.log('Result:', result);

  if (result.outputText && (result.outputClass.includes('mail-sent-ok') || /thank|sent|received/i.test(result.outputText))) {
    const note = `Contact form: https://andersenint.com/contact/ (Autofilled & verified: "${result.outputText}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 755);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(755, 'sent', note);
    console.log('✅ Lead 755 updated to contacted!');
  } else {
    console.log('⚠️ Could not confirm:', result);
  }

  await browser.close();
}

run();
