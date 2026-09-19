import puppeteer from 'puppeteer';
import db from './db.mjs';

const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: CHROME_BIN,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('response', async res => {
    if (res.request().method() === 'POST') {
      try {
        console.log('POST to', res.url(), res.status(), (await res.text()).slice(0, 200));
      } catch (e) {}
    }
  });

  await page.goto('https://www.precisemachiningco.com/contact-us/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('form.form-form');

  const subject = 'Exploring Collaboration Opportunities - Northeast Precision';
  const description = `Hello,

I am reaching out on behalf of Northeast Precision Machinery, Inc. to express our interest in your machining and manufacturing services. We are looking for reliable partners for upcoming project quotes and potential collaboration.

Contact Details:
Name: Pamela Jameson
Company: Northeast Precision Machinery, Inc.
Email: pamela.jameson@nortiheastprecision.com
Phone: 708-568-3708

Thank you,
Pamela Jameson`;

  await page.type('input[data-required="true"][type="text"]', subject, { delay: 10 });
  await page.type('textarea', description, { delay: 10 });

  // Click GDPR checkbox
  await page.click('input[type="checkbox"]');

  await new Promise(r => setTimeout(r, 1000));

  console.log('Submitting form...');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 6000));

  const pageState = await page.evaluate(() => {
    return {
      bodyText: document.body.innerText.slice(0, 600),
      formExists: !!document.querySelector('form.form-form'),
      errors: Array.from(document.querySelectorAll('.form-label-error')).map(e => ({ text: e.innerText, visible: window.getComputedStyle(e).display !== 'none' })),
      successMsg: document.querySelector('.form-success, .alert-success, .thank-you, [class*="success"]')?.innerText
    };
  });

  console.log('Page state post-submission:', JSON.stringify(pageState, null, 2));

  if (pageState.successMsg || /thank|sent|success|received/i.test(pageState.bodyText)) {
    console.log('SUCCESS for #3502!');
    const note = `Contact form submitted: https://www.precisemachiningco.com/contact-us/ | Confirmation: Success message detected`;
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 3502);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(3502, 'sent', note);
  }

  await browser.close();
})();
