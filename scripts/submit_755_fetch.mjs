import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const OUTREACH_PROFILE = {
  firstName: 'Pamela',
  lastName: 'Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '7085683708',
  message: `Hello,

I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects.

We look forward to your response and the possibility of working together.

Thank you for your time and attention.

Sincerely,
Pamela Jameson`
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
  await page.goto('https://andersenint.com/contact/', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(async (p) => {
    try {
      let token = '';
      if (typeof window.grecaptcha !== 'undefined' && typeof window.grecaptcha.execute === 'function') {
        token = await window.grecaptcha.execute('6LdoM8EZAAAAAM1F8VH0M1Yi8X7fOZniSJo5AfWZ', { action: 'contactform' });
      }

      const fd = new FormData();
      fd.append('_wpcf7', '5');
      fd.append('_wpcf7_version', '5.7.3');
      fd.append('_wpcf7_locale', 'en_US');
      fd.append('_wpcf7_unit_tag', 'wpcf7-f5-o1');
      fd.append('_wpcf7_container_post', '0');
      fd.append('_wpcf7_posted_data_hash', '');
      fd.append('_wpcf7_recaptcha_response', token);
      fd.append('FirstName', p.firstName);
      fd.append('LastName', p.lastName);
      fd.append('Email', p.email);
      fd.append('Phone', p.phone);
      fd.append('YourMessage', p.message);

      const res = await fetch('https://andersenint.com/wp-json/contact-form-7/v1/contact-forms/5/feedback', {
        method: 'POST',
        body: fd
      });

      const data = await res.json();
      return { status: res.status, data };
    } catch(e) {
      return { error: e.message };
    }
  }, OUTREACH_PROFILE);

  console.log('Submission API result:', JSON.stringify(result, null, 2));

  if (result.data?.status === 'mail_sent' || (result.data?.message && /thank|sent|received/i.test(result.data.message))) {
    const note = `Contact form: https://andersenint.com/contact/ (Autofilled & verified: "${result.data.message}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 755);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(755, 'sent', note);
    console.log('✅ Lead 755 updated to contacted!');
  } else {
    const note = `Contact form: https://andersenint.com/contact/ (Submission result: ${result.data?.status} - "${result.data?.message}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'unable_to_reach', 755);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(755, 'bounced', note);
    console.log('⚠️ Lead 755 recorded:', result);
  }

  await browser.close();
}

run();
