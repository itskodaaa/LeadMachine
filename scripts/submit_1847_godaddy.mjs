import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import db from './db.mjs';

puppeteer.use(StealthPlugin());

const CHROME_BIN = fs.existsSync('/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing')
  ? '/Users/macbookair/.cache/puppeteer/chrome/mac_arm-148.0.7778.97/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
  : undefined;

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_BIN,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  try {
    await page.goto('https://psinternationalsupply.net/', { waitUntil: 'networkidle2', timeout: 30000 });

    const nameEl = await page.$('input[data-aid="CONTACT_FORM_NAME"]');
    const emailEl = await page.$('input[data-aid="CONTACT_FORM_EMAIL"]');
    const msgEl = await page.$('textarea[data-aid="CONTACT_FORM_MESSAGE"]');
    const submitEl = await page.$('button[data-aid="CONTACT_SUBMIT_BUTTON_REND"]');

    console.log('Elements found:', { name: !!nameEl, email: !!emailEl, msg: !!msgEl, submit: !!submitEl });

    await nameEl.click();
    await page.keyboard.type('Pamela Jameson', { delay: 30 });

    await emailEl.click();
    await page.keyboard.type('pamela.jameson@nortiheastprecision.com', { delay: 30 });

    await msgEl.click();
    await page.keyboard.type('Hello, I am reaching out to express our interest in your sheet metal services and would appreciate the opportunity to explore a potential business relationship. Kindly arrange for a representative to contact us at your earliest convenience.', { delay: 15 });

    console.log('Typed all fields. Clicking Send button...');
    await submitEl.click();

    console.log('Waiting 7 seconds for response...');
    await new Promise(r => setTimeout(r, 7000));

    const result = await page.evaluate(() => {
      const successEl = document.querySelector('[data-aid="CONTACT_FORM_SUBMIT_SUCCESS"], [data-aid*="SUCCESS"], [data-aid*="MESSAGE_SUCCESS"]');
      const container = document.querySelector('[data-aid="CONTACT_FORM_CONTAINER_REND"]');
      return {
        successText: successEl ? successEl.innerText : null,
        containerText: container ? container.innerText : null
      };
    });

    console.log('Result for #1847:', result);

    if (result.successText || (result.containerText && /thank you|thanks|sent/i.test(result.containerText))) {
      const confirmation = result.successText || 'Thank you for reaching out!';
      const note = `Contact form: https://psinternationalsupply.net/ (Autofilled & verified: ${confirmation})`;
      db.prepare('UPDATE leads SET notes = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(note, 'contacted', 1847);
      db.prepare('INSERT INTO contact_logs (lead_id, action, notes, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
        .run(1847, 'sent', note);
      console.log('DB updated for #1847: contacted');
    }
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await browser.close();
  }
}

run();
