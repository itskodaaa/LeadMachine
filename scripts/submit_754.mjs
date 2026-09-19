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

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  let ajaxResponse = null;
  page.on('response', async resp => {
    if (resp.url().includes('admin-ajax.php')) {
      try {
        const text = await resp.text();
        console.log('ADMIN-AJAX RESP:', resp.status(), text);
        try { ajaxResponse = JSON.parse(text); } catch(e) {}
      } catch(e) {}
    }
  });

  console.log('Navigating to medro-eng.com...');
  await page.goto('https://medro-eng.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await page.waitForSelector('form.elementor-form', { timeout: 15000 });

  console.log('Filling visible Elementor form...');
  await page.evaluate((p) => {
    const forms = Array.from(document.querySelectorAll('form.elementor-form'));
    for (const f of forms) {
      const nameInp = f.querySelector('input[name*="[name]"]');
      const phoneInp = f.querySelector('input[name*="[field_1cd89a1]"]');
      const emailInp = f.querySelector('input[name*="[email]"]');
      const selectInp = f.querySelector('select[name*="[field_b79b1cd]"]');
      const addrInp = f.querySelector('input[name*="[field_0099bca]"]');
      const msgInp = f.querySelector('textarea[name*="[message]"]');

      if (nameInp) nameInp.value = p.fullName;
      if (phoneInp) phoneInp.value = p.phone;
      if (emailInp) emailInp.value = p.email;
      if (selectInp) selectInp.value = 'Design Services';
      if (addrInp) addrInp.value = p.address;
      if (msgInp) msgInp.value = p.message;

      [nameInp, phoneInp, emailInp, selectInp, addrInp, msgInp].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }
  }, OUTREACH_PROFILE);

  console.log('Submitting Elementor form...');
  await page.evaluate(() => {
    const f = document.querySelector('form.elementor-form');
    if (f) {
      const btn = f.querySelector('button[type="submit"], input[type="submit"]');
      if (btn) btn.click();
      else f.submit();
    }
  });

  console.log('Waiting 8 seconds for Elementor response...');
  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const msg = document.querySelector('.elementor-message-success, .elementor-message');
    const body = document.body ? document.body.innerText.toLowerCase() : '';
    return {
      elementorMessage: msg ? msg.innerText.trim() : null,
      elementorClass: msg ? msg.className : null,
      hasThankYou: body.includes('thank') || body.includes('sent successfully') || body.includes('received')
    };
  });

  console.log('Result:', result);
  console.log('Parsed AJAX response:', ajaxResponse);

  const confirmedMsg = ajaxResponse?.data?.message || result.elementorMessage;
  const isSuccess = ajaxResponse?.success || (confirmedMsg && /thank|sent|success/i.test(confirmedMsg));

  if (isSuccess) {
    const note = `Contact form: https://medro-eng.com/ (Autofilled & verified: "${confirmedMsg}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 754);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(754, 'sent', note);
    console.log('✅ Lead 754 updated to contacted!');
  } else {
    const note = `Contact form: https://medro-eng.com/ (Elementor response: "${confirmedMsg || 'Unconfirmed'}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'unable_to_reach', 754);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(754, 'bounced', note);
    console.log('⚠️ Lead 754 status recorded:', confirmedMsg);
  }

  await browser.close();
}

run();
