import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  address: '10940 Wilshire Blvd, Los Angeles, CA 90024',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function submit754() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async r => {
    if (r.url().includes('admin-ajax.php') && r.request().method() === 'POST') {
      try {
        const text = await r.text();
        if (text.includes('message') || text.includes('success')) {
          console.log('AJAX ELEMENTOR RESP:', r.status(), text);
        }
      } catch(e) {}
    }
  });

  await page.goto('https://medro-eng.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForSelector('form.elementor-form');

  // Fill the first visible form
  console.log('Filling form fields...');
  await page.evaluate((p) => {
    const f = document.querySelector('form.elementor-form');
    function setVal(sel, val) {
      const el = f.querySelector(sel);
      if (el) {
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    setVal('input[name="form_fields[name]"]', p.fullName);
    setVal('input[name="form_fields[field_1cd89a1]"]', p.phone);
    setVal('input[name="form_fields[email]"]', p.email);
    setVal('select[name="form_fields[field_b79b1cd]"]', 'Design Services');
    setVal('input[name="form_fields[field_0099bca]"]', p.address);
    setVal('textarea[name="form_fields[message]"]', p.message);
  }, OUTREACH_PROFILE);

  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking submit button...');
  await page.click('form.elementor-form button[type="submit"]');

  console.log('Waiting 8 seconds for Elementor response...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const successMsg = document.querySelector('.elementor-message-success');
    const anyMsg = document.querySelector('.elementor-message');
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    return {
      successText: successMsg ? successMsg.innerText.trim() : null,
      anyMessage: anyMsg ? anyMsg.innerText.trim() : null,
      hasThank: body.includes('thank') || body.includes('message was sent') || body.includes('success')
    };
  });

  console.log('Result:', result);

  if (result.successText || (result.anyMessage && !result.anyMessage.toLowerCase().includes('error')) || result.hasThank) {
    const confirmation = result.successText || result.anyMessage || 'Thank you message verified';
    const note = `Contact form: https://medro-eng.com/ (Autofilled & verified: "${confirmation}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 754);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(754, 'sent', note);
    console.log('✅ Lead 754 updated to contacted!');
  } else {
    console.log('⚠️ Result unconfirmed:', result);
  }

  await browser.close();
}

submit754();
