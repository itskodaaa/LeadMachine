import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import db from './db.mjs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  message: 'Hello, I am reaching out to express our interest in your welding and fabrication services. We would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details and possible collaboration on upcoming projects. Thank you! - Pamela Jameson'
};

function recordSuccess(leadId, note) {
  console.log(`\n>>> [SUCCESS RECORDED] #${leadId}: ${note}\n`);
  db.prepare("UPDATE leads SET status = 'contacted', notes = notes || ? WHERE id = ?")
    .run(' | ' + note, leadId);
  db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)")
    .run(leadId, note);
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  page.on('response', async res => {
    const u = res.url();
    if (u.includes('contact') || u.includes('messages') || u.includes('email') || u.includes('form')) {
      try {
        const txt = await res.text();
        console.log(`[GoDaddy NET] ${res.status()} ${u.slice(0, 90)}:`, txt.slice(0, 200));
      } catch (_) {}
    }
  });

  await page.goto('https://tampawelders.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));

  await page.evaluate(() => {
    const form = document.querySelector('form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 1000));

  const inputs = await page.$$('form input[type="text"]:not([name="_app_id"]), form input:not([type]):not([name="_app_id"])');
  console.log(`Found ${inputs.length} inputs`);

  if (inputs.length >= 2) {
    await inputs[0].click();
    await inputs[0].type(PROFILE.fullName, { delay: 25 });

    await inputs[1].click();
    await inputs[1].type(PROFILE.email, { delay: 25 });
  }

  const textarea = await page.$('form textarea');
  if (textarea) {
    await textarea.click();
    await textarea.type(PROFILE.message, { delay: 10 });
  }

  await new Promise(r => setTimeout(r, 1000));

  console.log('Clicking GoDaddy submit button...');
  await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"], form button');
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 8000));

  const result = await page.evaluate(() => {
    const successMsg = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'))
      .map(el => el.innerText.trim())
      .find(txt => /thank you|we'll be in touch|message sent|thanks for reaching out|inquiry received/i.test(txt) && txt.length < 150);
    return { successMsg };
  });

  console.log('Result #4884:', result);

  if (result.successMsg) {
    recordSuccess(4884, `Contact form: https://tampawelders.com/ (Autofilled & verified: "${result.successMsg}")`);
  }

  await browser.close();
}

run();
