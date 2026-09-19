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

  // Trigger WP Rocket scripts
  await page.mouse.move(200, 200);
  await page.mouse.wheel({ deltaY: 500 });
  await page.evaluate(() => {
    window.dispatchEvent(new Event('mousemove'));
    window.dispatchEvent(new Event('scroll'));
  });
  await new Promise(r => setTimeout(r, 2500));

  console.log('Filling form fields with page.type ...');
  await page.type('input[placeholder="Enter Your Name"]', OUTREACH_PROFILE.fullName);
  await page.type('input[placeholder="Enter Your Company Name"]', OUTREACH_PROFILE.company);
  await page.type('input[placeholder="Enter Your Email"]', OUTREACH_PROFILE.email);
  await page.type('input[placeholder="Enter Your Phone Number"]', OUTREACH_PROFILE.phone);
  await page.type('textarea[name="message"]', OUTREACH_PROFILE.message);

  console.log('Clicking submit button...');
  await page.click('input.wpcf7-submit');

  console.log('Waiting for response...');
  // Listen for response
  let submitted = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const status = await page.evaluate(() => {
      const output = document.querySelector('.wpcf7-response-output');
      const form = document.querySelector('form.wpcf7-form');
      return {
        text: output ? output.innerText.trim() : '',
        status: form ? form.getAttribute('data-status') : '',
        classes: form ? form.className : ''
      };
    });
    console.log(`Poll ${i + 1}: status="${status.status}", text="${status.text}"`);

    if (status.status === 'mail_sent' || status.text.toLowerCase().includes('thank you') || status.text.toLowerCase().includes('sent')) {
      console.log('SUCCESS! Confirmed:', status.text);
      const confirmationMsg = status.text || 'Thank you for your message. It has been sent.';

      const updateStmt = db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      const logStmt = db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)');
      const current = db.prepare('SELECT notes FROM leads WHERE id = 1213').get();
      const note = `Contact form: https://www.machiningsystemscorp.com/contact-us/ (Autofilled & verified: ${confirmationMsg})`;
      const newNotes = current?.notes ? current.notes + ' | ' + note : note;

      db.transaction(() => {
        updateStmt.run(newNotes, 'contacted', 1213);
        logStmt.run(1213, 'sent', note);
      })();
      console.log('Updated lead #1213 to contacted in DB!');
      submitted = true;
      break;
    } else if (status.status === 'mail_failed' || status.status === 'invalid') {
      console.log('Form status error:', status);
      break;
    }
  }

  await browser.close();
}

run().catch(console.error);
