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
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience. Sincerely, Pamela Jameson'
};

async function run() {
  const browser = await puppeteer.launch({ executablePath: CHROME_BIN, headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  page.on('response', async resp => {
    if (resp.url().includes('feedback') && !resp.url().includes('schema')) {
      try {
        console.log('FEEDBACK RESPONSE:', resp.status(), await resp.text());
      } catch(e) {}
    }
  });

  await page.goto('https://andersenint.com/contact/', { waitUntil: 'networkidle2' });

  const result = await page.evaluate(async (p) => {
    const f = document.querySelector('form.wpcf7-form');
    f.querySelector('[name="FirstName"]').value = p.firstName;
    f.querySelector('[name="LastName"]').value = p.lastName;
    f.querySelector('[name="Email"]').value = p.email;
    f.querySelector('[name="Phone"]').value = p.phone;
    f.querySelector('[name="YourMessage"]').value = p.message;

    ['FirstName', 'LastName', 'Email', 'Phone', 'YourMessage'].forEach(n => {
      const el = f.querySelector(`[name="${n}"]`);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    try {
      const res = await window.wpcf7.submit(f);
      const output = f.querySelector('.wpcf7-response-output');
      return { ok: true, res, output: output ? output.innerText.trim() : null, status: f.getAttribute('data-status') };
    } catch(e) {
      return { ok: false, error: e.message };
    }
  }, OUTREACH_PROFILE);

  console.log('Submission result:', result);

  await new Promise(r => setTimeout(r, 6000));

  const finalOutput = await page.evaluate(() => {
    const output = document.querySelector('.wpcf7-response-output');
    return output ? output.innerText.trim() : null;
  });
  console.log('Final output text:', finalOutput);

  if ((result.status === 'mail_sent') || (finalOutput && /thank|sent|received/i.test(finalOutput))) {
    const note = `Contact form: https://andersenint.com/contact/ (Autofilled & verified: "${finalOutput || 'Message sent successfully'}")`;
    db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(note, 'contacted', 755);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
      .run(755, 'sent', note);
    console.log('✅ Lead 755 updated to contacted!');
  } else {
    console.log('⚠️ Result not confirmed.');
  }

  await browser.close();
}

run();
