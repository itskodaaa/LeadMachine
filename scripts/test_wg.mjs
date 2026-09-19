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

async function testWG() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--window-size=1280,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('requestfailed', r => console.log('REQ FAIL:', r.url(), r.failure()?.errorText));
  page.on('response', async resp => {
    if (resp.url().includes('admin-ajax.php')) {
      console.log('AJAX response:', resp.status(), await resp.text().catch(() => ''));
    }
  });

  await page.goto('https://www.wilsongirgenti.com/contact/', { waitUntil: 'networkidle2' });

  // Scroll to form
  await page.evaluate(() => {
    document.querySelector('form.elementor-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 1000));

  await page.focus('#form-field-name');
  await page.keyboard.type(PROFILE.fullName, { delay: 30 });
  await page.focus('#form-field-email');
  await page.keyboard.type(PROFILE.email, { delay: 30 });
  await page.focus('#form-field-field_d5c08de');
  await page.keyboard.type(PROFILE.phone, { delay: 30 });
  await page.focus('#form-field-message');
  await page.keyboard.type(PROFILE.message, { delay: 10 });

  console.log('Clicking Send button...');
  const sendBtn = await page.$('button.elementor-button[type="submit"]');
  await sendBtn.hover();
  await new Promise(r => setTimeout(r, 500));
  await sendBtn.click();

  console.log('Waiting 10s for response...');
  await new Promise(r => setTimeout(r, 10000));

  const result = await page.evaluate(() => {
    const messages = Array.from(document.querySelectorAll('.elementor-message')).map(m => ({
      text: m.innerText,
      class: m.className,
      visible: m.offsetParent !== null
    }));
    return { messages, url: window.location.href };
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.messages.some(m => m.class.includes('success') || m.text.toLowerCase().includes('success') || m.text.toLowerCase().includes('sent') || m.text.toLowerCase().includes('thank'))) {
    console.log('SUCCESS CONFIRMED ON WILSON & GIRGENTI!');
    db.prepare('UPDATE leads SET status = ?, notes = ? WHERE id = 3854').run('contacted', 'Confirmed: Elementor form submitted successfully');
    db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (3854, "sent", "Confirmed: Elementor form submitted successfully", CURRENT_TIMESTAMP)').run();
  }

  await browser.close();
}

testWG();
