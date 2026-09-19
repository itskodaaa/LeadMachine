import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';
puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  company: 'Northeast Precision Machinery, Inc.',
  message: 'Hello, I am reaching out to express our interest in your services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details, pricing, and possible collaboration on upcoming projects. Thank you. Sincerely, Pamela Jameson'
};

async function submitHall() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  
  page.on('response', async resp => {
    if (resp.request().method() === 'POST') {
      console.log('POST Response:', resp.status(), resp.url(), await resp.text().catch(() => ''));
    }
  });

  await page.goto('https://www.hallenggroup.com/contact-us/', { waitUntil: 'networkidle2' });

  // Type fields, leaving 'your-url' empty!
  await page.type('input[name="from"]', PROFILE.fullName, { delay: 20 });
  await page.type('input[name="sender"]', PROFILE.email, { delay: 20 });
  await page.type('input[name="phone"]', PROFILE.phone, { delay: 20 });
  await page.type('input[name="company"]', PROFILE.company, { delay: 20 });
  await page.type('textarea[name="msg"]', PROFILE.message, { delay: 10 });

  console.log('Fields filled, honeypot left untouched. Clicking Send Message...');
  const btn = await page.$('button.btn.btn-secondary[type="submit"]');
  await btn.click();

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const successAlert = document.querySelector('.alert-success');
    const dangerAlert = document.querySelector('.alert-danger');
    return {
      successVisible: successAlert ? !successAlert.classList.contains('d-none') : false,
      successText: successAlert ? successAlert.innerText : null,
      dangerVisible: dangerAlert ? !dangerAlert.classList.contains('d-none') : false,
      dangerText: dangerAlert ? dangerAlert.innerText : null
    };
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.successVisible || (result.successText && result.successText.includes('Successfully Sent'))) {
    console.log('SUCCESS CONFIRMED ON HALL ENGINEERING GROUP!');
    const note = 'Confirmed: Form submission successful - ' + (result.successText || 'Your Message Has been Successfully Sent.').trim();
    db.prepare('UPDATE leads SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('contacted', note, 3859);
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(3859, 'sent', note);
    console.log('Database updated for #3859!');
  }

  await browser.close();
}

submitHall();
