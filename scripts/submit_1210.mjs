import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  address: '100 Main St',
  city: 'Chicago',
  state: 'IL',
  zip: '60601',
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

  console.log('Navigating to https://www.kcmach.com/contact/ ...');
  await page.goto('https://www.kcmach.com/contact/', { waitUntil: 'networkidle2', timeout: 30000 });

  const fields = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.gfield')).map(gf => {
      const label = gf.querySelector('label')?.innerText || '';
      const input = gf.querySelector('input, textarea, select');
      return {
        label,
        name: input?.name,
        id: input?.id,
        tag: input?.tagName,
        type: input?.type
      };
    });
  });
  console.log('Gravity Form fields:', fields);

  // Fill fields
  await page.evaluate((p) => {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    // input_1_1: How may we help you? (Message)
    setVal('input_1_1', p.message);
    // input_1_16: Your Name
    setVal('input_1_16', p.fullName);
    // input_1_3: Company
    setVal('input_1_3', p.company);
    // input_1_7: Email
    setVal('input_1_7', p.email);
    // input_1_5: Phone
    setVal('input_1_5', p.phone);
    // Address fields
    setVal('input_1_10', p.address);
    setVal('input_1_11', p.city);
    setVal('input_1_12', p.state);
    setVal('input_1_13', p.zip);
  }, OUTREACH_PROFILE);

  console.log('Filled form. Submitting...');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {}),
    page.evaluate(() => {
      const submitBtn = document.querySelector('#gform_submit_button_1') || document.querySelector('input[type="submit"]');
      if (submitBtn) submitBtn.click();
      else document.querySelector('form').submit();
    })
  ]);

  await new Promise(r => setTimeout(r, 4000));

  const result = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const confirmation = document.querySelector('.gform_confirmation_message, .gforms_confirmation_message, [id*="confirmation"]');
    const errors = document.querySelectorAll('.gfield_error, .validation_error');
    return {
      confText: confirmation?.innerText || '',
      hasErrors: errors.length > 0,
      errors: Array.from(errors).map(e => e.innerText),
      snippet: text.slice(0, 500)
    };
  });

  console.log('Result:', result);

  if (result.confText || (result.snippet && (result.snippet.toLowerCase().includes('thank you') || result.snippet.toLowerCase().includes('received your message') || result.snippet.toLowerCase().includes('will be in contact')))) {
    const confirmationMsg = result.confText || 'Submission confirmed on page';
    console.log('SUCCESS! Confirmation:', confirmationMsg);

    const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
    const current = db.prepare('SELECT notes FROM leads WHERE id = 1210').get();
    const note = `Contact form: https://www.kcmach.com/contact/ (Autofilled & verified: ${confirmationMsg.trim().slice(0, 100)})`;
    const newNotes = current?.notes ? current.notes + ' | ' + note : note;

    db.transaction(() => {
      updateStmt.run(newNotes, 'contacted', 1210);
      logStmt.run(1210, 'sent', note);
    })();
    console.log('Updated lead #1210 to contacted in DB!');
  } else {
    console.log('Failed or not confirmed.');
  }

  await browser.close();
}

run().catch(console.error);
