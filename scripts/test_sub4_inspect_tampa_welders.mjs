import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';

puppeteer.use(StealthPlugin());
const CHROME_BIN = '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

const PROFILE = {
  fullName: 'Pamela Jameson',
  email: 'pamela.jameson@nortiheastprecision.com',
  phone: '708-568-3708',
  message: 'Hello, I am reaching out to express our interest in your welding and fabrication services. We would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience to discuss details and possible quotes. Thank you!'
};

async function testTampaWelders() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  page.on('response', async res => {
    const u = res.url();
    if (u.includes('messages') || u.includes('contact') || u.includes('email')) {
      try {
        const txt = await res.text();
        console.log(`[NET RESPONSE] ${res.status()} ${u}:`, txt);
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

  const formFields = await page.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return null;
    return Array.from(form.querySelectorAll('input, textarea')).map(el => ({
      tag: el.tagName,
      type: el.type,
      id: el.id,
      name: el.name,
      placeholder: el.placeholder,
      ariaLabel: el.getAttribute('aria-label'),
      dataAid: el.getAttribute('data-aid'),
      label: el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : el.closest('label')?.innerText
    }));
  });

  console.log('Tampa Welders form fields:', JSON.stringify(formFields, null, 2));

  // Find inputs by label/placeholder/type
  const inputs = await page.$$('form input[type="text"]:not([name="_app_id"]), form input:not([type]):not([name="_app_id"])');
  console.log(`Found ${inputs.length} text inputs in form`);

  if (inputs.length >= 2) {
    console.log('Filling input 0 (name)...');
    await inputs[0].click();
    await inputs[0].type(PROFILE.fullName, { delay: 15 });

    console.log('Filling input 1 (email)...');
    await inputs[1].click();
    await inputs[1].type(PROFILE.email, { delay: 15 });
  }

  const textarea = await page.$('form textarea');
  if (textarea) {
    console.log('Filling textarea (message)...');
    await textarea.click();
    await textarea.type(PROFILE.message, { delay: 10 });
  }

  console.log('Clicking submit button on Tampa Welders...');
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('form button[type="submit"], form button');
    if (btn) {
      btn.click();
      return btn.innerText;
    }
    return false;
  });
  console.log('Clicked button:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  const result = await page.evaluate(() => {
    const successMsg = Array.from(document.querySelectorAll('div, p, span, h2, h3, h4'))
      .map(el => el.innerText.trim())
      .find(txt => /thank you|we'll be in touch|message sent|thanks for reaching out|inquiry received/i.test(txt) && txt.length < 150);
    return { successMsg };
  });

  console.log('Result #4884:', result);

  if (result.successMsg) {
    console.log('SUCCESS! Updating database for #4884...');
    const note = `Contact form: https://tampawelders.com/ (Autofilled & verified: "${result.successMsg}")`;
    const db = (await import('./db.mjs')).default;
    db.prepare("UPDATE leads SET status = 'contacted', notes = notes || ? WHERE id = ?").run(' | ' + note, 4884);
    db.prepare("INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, 'sent', ?, CURRENT_TIMESTAMP)").run(4884, note);
  }

  await browser.close();
}

testTampaWelders();
